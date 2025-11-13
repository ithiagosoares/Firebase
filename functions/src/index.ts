/**
 * ==================================================================================================
 * MASTER FUNCTIONS INDEX - ARQUITETURA ESCALÁVEL (V16.0 - CORREÇÃO DE DADOS)
 *
 * DESCRIÇÃO DA ATUALIZAÇÃO (V16.0):
 * Torna o código resiliente a inconsistências no nome do campo de template no Firestore.
 *
 * PRINCIPAIS MUDANÇAS:
 * 1.  LÓGICA DE FALLBACK: A função `scheduleMessagesForPatients` agora verifica a existência
 *     tanto de `step.templateId` quanto de `step.template` ao buscar o ID do template,
 *     resolvendo o problema causado pela impossibilidade de renomear campos no Firestore.
 *
 * @version 16.0.0
 * ==================================================================================================
 */

import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  onCall,
  HttpsError,
  onRequest,
  CallableRequest,
  Request,
} from "firebase-functions/v2/https";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import axios from "axios";
import Stripe from "stripe";
import { Response } from "express";

// INICIALIZAÇÃO SIMPLIFICADA E CORRETA
admin.initializeApp();
const db = admin.firestore();

// Interfaces alinhadas com o banco de dados
interface Patient {
  id: string;
  name: string;
  phone: string;
  nextAppointment?: Timestamp;
}
interface WorkflowStep {
  templateId?: string; // Agora opcional
  template?: string; // Novo campo opcional para fallback
  schedule: { quantity: number; unit: string; event: "before" | "after" };
}
interface Workflow {
  id: string;
  active: boolean;
  patients: string[];
  steps: WorkflowStep[];
}
interface Template {
  id: string;
  content: string;
}
interface ScheduledMessage {
  scheduledTime: Timestamp;
  status: "Agendado" | "processing" | "sent" | "failed";
  userId: string;
  patientId: string;
  workflowId: string;
  templateId: string;
  patientPhone: string;
  messageContent: string;
}

export const onWorkflowUpdate = onDocumentUpdated(
  {
    document: "users/{userId}/workflows/{workflowId}",
    region: "southamerica-east1",
  },
  async (event) => {
    const before = event.data?.before.data() as Workflow;
    const after = event.data?.after.data() as Workflow;
    const userId = event.params.userId;
    const workflowId = event.params.workflowId;

    const patientsBefore = new Set(before.patients || []);
    const patientsAfter = new Set(after.patients || []);

    const addedPatients = [...patientsAfter].filter(
      (p) => !patientsBefore.has(p)
    );
    const removedPatients = [...before.patients].filter(
      (p) => !patientsAfter.has(p)
    );

    if (before.active && !after.active) {
      logger.info(
        `Workflow ${workflowId} desativado. Removendo todas as mensagens agendadas.`
      );
      await clearScheduledMessagesForWorkflow(userId, workflowId);
      return;
    }

    if (addedPatients.length > 0) {
      await scheduleMessagesForPatients(
        userId,
        workflowId,
        after.steps,
        addedPatients
      );
    }

    if (removedPatients.length > 0) {
      await clearScheduledMessagesForPatients(
        userId,
        workflowId,
        removedPatients
      );
    }
  }
);

export const onPatientAppointmentUpdate = onDocumentUpdated(
  {
    document: "users/{userId}/patients/{patientId}",
    region: "southamerica-east1",
  },
  async (event) => {
    const before = event.data?.before.data() as Patient;
    const after = event.data?.after.data() as Patient;
    const userId = event.params.userId;
    const patientId = event.params.patientId;

    const beforeTime = before.nextAppointment?.toMillis();
    const afterTime = after.nextAppointment?.toMillis();

    if (beforeTime === afterTime) {
      return;
    }

    await clearScheduledMessagesForPatients(userId, null, [patientId]);

    const workflowsSnapshot = await db
      .collection(`users/${userId}/workflows`)
      .where("active", "==", true)
      .where("patients", "array-contains", patientId)
      .get();

    if (workflowsSnapshot.empty) {
      return;
    }

    for (const doc of workflowsSnapshot.docs) {
      const workflow = { id: doc.id, ...doc.data() } as Workflow;
      await scheduleMessagesForPatients(userId, workflow.id, workflow.steps, [
        patientId,
      ]);
    }
  }
);

export const sendScheduledMessages = onSchedule(
  {
    schedule: "every 1 minute",
    region: "southamerica-east1",
    timeZone: "America/Sao_Paulo",
  },
  async () => {
    const now = Timestamp.now();

    const messagesToSend = await db
      .collectionGroup("scheduledMessages")
      .where("status", "==", "Agendado")
      .where("scheduledTime", "<=", now)
      .orderBy("scheduledTime", "asc")
      .get();

    if (messagesToSend.empty) {
      logger.info("✅ Nenhuma mensagem para enviar neste ciclo.");
      return;
    }

    logger.info(`Enviando ${messagesToSend.docs.length} mensagens...`);

    const promises = messagesToSend.docs.map(processScheduledMessage);
    await Promise.all(promises);

    logger.info("✅ Ciclo de envio concluído.");
  }
);

async function scheduleMessagesForPatients(
  userId: string,
  workflowId: string,
  steps: WorkflowStep[],
  patientIds: string[]
) {
  logger.info("Executando scheduleMessagesForPatients - V16.0");
  const batch = db.batch();

  for (const patientId of patientIds) {
    const patientDocRef = db.doc(`users/${userId}/patients/${patientId}`);
    const patientDoc = await patientDocRef.get();

    if (!patientDoc.exists) {
      logger.warn(
        `Agendamento ignorado: Paciente ${patientId} não foi encontrado no banco de dados.`
      );
      continue;
    }

    const patientData = patientDoc.data();
    logger.info(`Dados lidos para o Paciente ${patientId}:`, patientData);

    if (!patientData?.phone) {
      logger.error(
        `AGENDAMENTO FALHOU: O campo 'phone' não foi encontrado nos dados do paciente ${patientId}.`,
        { patientData }
      );
      continue;
    }

    if (!patientData?.nextAppointment) {
      logger.warn(
        `Agendamento ignorado para ${patientId}: O campo 'nextAppointment' não está definido.`
      );
      continue;
    }

    const patient = { id: patientDoc.id, ...patientData } as Patient;

    for (const step of steps) {
      // ===== INÍCIO DA CORREÇÃO (V16.0) =====
      const templateId = step.templateId || step.template;

      if (!templateId) {
        logger.warn(
          "'templateId' ou 'template' não encontrado na etapa do workflow. Pulando etapa.",
          { step }
        );
        continue;
      }
      // ===== FIM DA CORREÇÃO (V16.0) =====

      const templateDoc = await db
        .doc(`users/${userId}/messageTemplates/${templateId}`)
        .get();

      if (!templateDoc.exists) {
        logger.warn(
          `Template ${templateId} não encontrado. Pulando etapa do workflow.`
        );
        continue;
      }
      const template = {
        id: templateDoc.id,
        ...templateDoc.data(),
      } as Template;

      const sendAt = calculateSendDate(
        patient.nextAppointment!.toDate(),
        step.schedule
      );
      const messageContent = replaceVariables(template.content, patient);

      const newMessageRef = db
        .collection(`users/${userId}/scheduledMessages`)
        .doc();
      const scheduledMessage: ScheduledMessage = {
        scheduledTime: Timestamp.fromDate(sendAt),
        status: "Agendado",
        userId,
        patientId,
        workflowId,
        templateId: templateId, // Usando a variável corrigida
        patientPhone: patient.phone,
        messageContent,
      };

      logger.info(
        `[V16.0] Objeto de agendamento pronto para ser salvo para o paciente ${patientId}:`,
        scheduledMessage
      );

      batch.set(newMessageRef, scheduledMessage);
    }
  }
  await batch.commit();
}

async function clearScheduledMessagesForPatients(
  userId: string,
  workflowId: string | null,
  patientIds: string[]
) {
  let query = db
    .collectionGroup("scheduledMessages")
    .where("userId", "==", userId)
    .where("patientId", "in", patientIds)
    .where("status", "==", "Agendado");

  if (workflowId) {
    query = query.where("workflowId", "==", workflowId);
  }

  const messagesQuery = await query.get();
  if (messagesQuery.empty) return;

  const batch = db.batch();
  messagesQuery.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

async function clearScheduledMessagesForWorkflow(
  userId: string,
  workflowId: string
) {
  const messagesQuery = await db
    .collectionGroup("scheduledMessages")
    .where("userId", "==", userId)
    .where("workflowId", "==", workflowId)
    .where("status", "==", "Agendado")
    .get();

  if (messagesQuery.empty) return;

  const batch = db.batch();
  messagesQuery.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

async function processScheduledMessage(
  doc: admin.firestore.QueryDocumentSnapshot
) {
  const message = doc.data() as ScheduledMessage;
  const logCollectionRef = db.collection(`users/${message.userId}/messageLog`);
  let logDocRef;

  try {
    await doc.ref.update({ status: "processing" });

    logDocRef = await logCollectionRef.add({
      ...message,
      createdAt: Timestamp.now(),
      status: "processing",
    });

    await axios.post(`${process.env.WHATSAPP_API_URL}/send-message`, {
      userId: message.userId,
      number: message.patientPhone,
      message: message.messageContent,
    });

    await logDocRef.update({ status: "sent", sentAt: Timestamp.now() });
    await doc.ref.update({
      status: "sent",
      sentAt: Timestamp.now(),
      logId: logDocRef.id,
    });
  } catch (error: any) {
    const errorMessage = error.response?.data || error.message;
    logger.error(`Falha no envio para ${message.patientPhone}:`, errorMessage);
    if (logDocRef) {
      await logDocRef.update({
        status: "failed",
        failedAt: Timestamp.now(),
        errorMessage,
      });
    }
    await doc.ref.update({
      status: "failed",
      failedAt: Timestamp.now(),
      errorMessage,
    });
  }
}

const calculateSendDate = (
  appointmentDate: Date,
  schedule: WorkflowStep["schedule"]
): Date => {
  const target = new Date(appointmentDate.getTime());
  const amount =
    schedule.event === "before"
      ? -Math.abs(schedule.quantity)
      : Math.abs(schedule.quantity);

  switch (schedule.unit.toLowerCase()) {
    case "hours":
    case "hour":
      target.setHours(target.getHours() + amount);
      break;
    case "days":
    case "day":
      target.setDate(target.getDate() + amount);
      break;
    default:
      logger.error(`Unidade de tempo inválida: '${schedule.unit}'.`);
  }
  return target;
};

const replaceVariables = (content: string, patient: Patient): string => {
  const appointmentDate = patient.nextAppointment?.toDate();

  const formattedDate =
    appointmentDate && !isNaN(appointmentDate.getTime())
      ? `${appointmentDate.toLocaleDateString(
          "pt-BR"
        )} às ${appointmentDate.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : "[Data não definida]";

  return content
    .replace(/{{NOME_CLIENTE}}/g, patient.name || "[Nome não definido]")
    .replace(/{{DATA_CONSULTA}}/g, formattedDate);
};

// ==================================================================================================
// FUNÇÕES DE PAGAMENTO (STRIPE) - USANDO PROCESS.ENV
// ==================================================================================================

export const createCheckoutSession = onCall(
  { region: "southamerica-east1" },
  async (request: CallableRequest) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "A função deve ser chamada por um usuário autenticado."
      );
    }
    logger.info("Placeholder para createCheckoutSession chamado.");
    if (!process.env.STRIPE_API_KEY) {
      throw new HttpsError(
        "internal",
        "A chave da API do Stripe não foi configurada."
      );
    }
    return { placeholder: true };
  }
);

export const createStripeCustomer = onCall(
  { region: "southamerica-east1" },
  async (request: CallableRequest) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "A função deve ser chamada por um usuário autenticado."
      );
    }
    logger.info("Placeholder para createStripeCustomer chamado.");
    if (!process.env.STRIPE_API_KEY) {
      throw new HttpsError(
        "internal",
        "A chave da API do Stripe não foi configurada."
      );
    }
    return { placeholder: true };
  }
);

export const createStripePortalSession = onCall(
  { region: "southamerica-east1" },
  async (request: CallableRequest) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "A função deve ser chamada por um usuário autenticado."
      );
    }
    logger.info("Placeholder para createStripePortalSession chamado.");
    if (!process.env.STRIPE_API_KEY) {
      throw new HttpsError(
        "internal",
        "A chave da API do Stripe não foi configurada."
      );
    }
    return { placeholder: true };
  }
);

export const stripeWebhook = onRequest(
  { region: "southamerica-east1" },
  (req: Request, res: Response) => {
    logger.info("Placeholder para stripeWebhook chamado.");
    if (!process.env.STRIPE_API_KEY) {
      res.status(500).send("A chave da API do Stripe não foi configurada.");
      return;
    }
    const stripe = new Stripe(process.env.STRIPE_API_KEY, {
      apiVersion: "2024-04-10",
    });
    if (!stripe) {
      res.status(500).send("Não foi possível inicializar o Stripe.");
      return;
    }
    logger.info("Instância do Stripe criada com sucesso.");
    res.json({ received: true });
  }
);
