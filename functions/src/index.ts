/**
 * ==================================================================================================
 * MASTER FUNCTIONS INDEX - ARQUITETURA ESCALÁVEL (V9.0)
 *
 * DESCRIÇÃO DA ATUALIZAÇÃO (V9.0):
 * Esta versão introduz um novo gatilho para lidar com a remarcação de consultas.
 *
 * PRINCIPAIS MUDANÇAS:
 * 1.  NOVO GATILHO (TRIGGER): `onPatientAppointmentUpdate` observa o campo `nextAppointment`
 *     dos pacientes. Se uma consulta for remarcada, ele automaticamente remove os agendamentos
 *     antigos e cria novos com base na nova data, garantindo que o fluxo de mensagens
 *     se adapte dinamicamente a mudanças no mundo real.
 *
 * @version 9.0.0
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
import { defineSecret } from "firebase-functions/params";
import { Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import axios from "axios";
import Stripe from "stripe";
import { Response } from "express";

// ----------------------------------------------------------------------------------------------------
// ✅ INICIALIZAÇÃO E CONFIGURAÇÃO (LAZY INITIALIZATION)
// ----------------------------------------------------------------------------------------------------
let isFirebaseInitialized = false;
const initializeFirebase = () => {
  if (!isFirebaseInitialized) {
    admin.initializeApp();
    isFirebaseInitialized = true;
  }
};

const getDb = (): admin.firestore.Firestore => {
  initializeFirebase();
  return admin.firestore();
};

const getStripeClient = (): Stripe => {
  initializeFirebase();
  return new Stripe(defineSecret("STRIPE_SECRET_KEY").value(), {
    typescript: true,
  });
};

const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL;

// ----------------------------------------------------------------------------------------------------
// ✅ INTERFACES E TIPOS
// ----------------------------------------------------------------------------------------------------
interface Patient {
  id: string;
  name: string;
  phone: string;
  nextAppointment?: Timestamp;
}
interface WorkflowStep {
  templateId: string;
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
  sendAt: Timestamp;
  status: "scheduled" | "processing" | "sent" | "failed";
  userId: string;
  patientId: string;
  workflowId: string;
  templateId: string;
  patientPhone: string;
  messageContent: string;
}

// ----------------------------------------------------------------------------------------------------
// 🚀 ARQUITETURA DE MENSAGENS DESNORMALIZADA E ESCALÁVEL
// ----------------------------------------------------------------------------------------------------

/**
 * GATILHO DE ATUALIZAÇÃO DE WORKFLOW
 * Observa a adição/remoção de pacientes em workflows.
 */
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
      logger.info(
        `Pacientes adicionados ao workflow ${workflowId}:`,
        addedPatients
      );
      await scheduleMessagesForPatients(
        userId,
        workflowId,
        after.steps,
        addedPatients
      );
    }

    if (removedPatients.length > 0) {
      logger.info(
        `Pacientes removidos do workflow ${workflowId}:`,
        removedPatients
      );
      await clearScheduledMessagesForPatients(
        userId,
        workflowId,
        removedPatients
      );
    }
  }
);

/**
 * NOVO GATILHO - ATUALIZAÇÃO DE CONSULTA DO PACIENTE
 * Observa remarcações de consulta e reagenda todas as mensagens associadas.
 */
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

    // Se a data da consulta não mudou, não faz nada.
    if (beforeTime === afterTime) {
      return;
    }

    logger.info(
      `Detectada remarcação para o paciente ${patientId}. Reagendando mensagens...`
    );

    // 1. Apaga todas as mensagens futuras agendadas para este paciente
    await clearScheduledMessagesForPatients(userId, null, [patientId]);

    // 2. Encontra todos os workflows aos quais este paciente pertence
    const firestore = getDb();
    const workflowsSnapshot = await firestore
      .collection(`users/${userId}/workflows`)
      .where("active", "==", true)
      .where("patients", "array-contains", patientId)
      .get();

    if (workflowsSnapshot.empty) {
      logger.info(
        `Paciente ${patientId} não está em nenhum workflow ativo. Nenhuma mensagem para reagendar.`
      );
      return;
    }

    // 3. Reagenda as mensagens para cada workflow com a nova data
    for (const doc of workflowsSnapshot.docs) {
      const workflow = { id: doc.id, ...doc.data() } as Workflow;
      logger.info(
        `Reagendando mensagens para o paciente ${patientId} no workflow ${workflow.id}`
      );
      await scheduleMessagesForPatients(userId, workflow.id, workflow.steps, [
        patientId,
      ]);
    }
  }
);

/**
 * FUNÇÃO AGENDADA (SCHEDULED FUNCTION) - VERSÃO OTIMIZADA
 * Executa a cada 5 minutos e envia TODAS as mensagens que já passaram do horário de envio.
 */
export const sendScheduledMessages = onSchedule(
  {
    schedule: "every 1 minutes",
    region: "southamerica-east1",
    timeZone: "America/Sao_Paulo",
  },
  async () => {
    const now = Timestamp.now();
    logger.info(
      `🟡 Iniciando envio de mensagens agendadas — ${now
        .toDate()
        .toISOString()}`
    );
    const firestore = getDb();

    const messagesToSend = await firestore
      .collection("scheduledMessages")
      .where("status", "==", "scheduled")
      .where("sendAt", "<=", now)
      .get();

    if (messagesToSend.empty) {
      logger.info("✅ Nenhuma mensagem para enviar neste ciclo.");
      return;
    }

    logger.info(`Enviando ${messagesToSend.docs.length} mensagens...`);
    const processingPromises = messagesToSend.docs.map((doc) =>
      processScheduledMessage(doc)
    );
    await Promise.all(processingPromises);

    logger.info("✅ Ciclo de envio de mensagens finalizado.");
  }
);

// ----------------------------------------------------------------------------------------------------
// ✅ LÓGICA AUXILIAR PARA GERENCIAMENTO DE MENSAGENS
// ----------------------------------------------------------------------------------------------------

async function scheduleMessagesForPatients(
  userId: string,
  workflowId: string,
  steps: WorkflowStep[],
  patientIds: string[]
) {
  const firestore = getDb();
  const batch = firestore.batch();

  for (const patientId of patientIds) {
    const patientDoc = await firestore
      .doc(`users/${userId}/patients/${patientId}`)
      .get();
    if (!patientDoc.exists || !patientDoc.data()?.nextAppointment) continue;
    const patient = { id: patientDoc.id, ...patientDoc.data() } as Patient;

    for (const step of steps) {
      const templateDoc = await firestore
        .doc(`users/${userId}/messageTemplates/${step.templateId}`)
        .get();
      if (!templateDoc.exists) continue;
      const template = {
        id: templateDoc.id,
        ...templateDoc.data(),
      } as Template;

      const sendAt = calculateSendDate(
        patient.nextAppointment!.toDate(),
        step.schedule
      );
      const messageContent = replaceVariables(template.content, patient);

      const newMessageRef = firestore.collection("scheduledMessages").doc();
      const scheduledMessage: ScheduledMessage = {
        sendAt: Timestamp.fromDate(sendAt),
        status: "scheduled",
        userId,
        patientId,
        workflowId,
        templateId: step.templateId,
        patientPhone: patient.phone,
        messageContent,
      };
      batch.set(newMessageRef, scheduledMessage);
    }
  }
  await batch.commit();
  logger.info(
    `Agendamento concluído para ${patientIds.length} pacientes no workflow ${workflowId}.`
  );
}

async function clearScheduledMessagesForPatients(
  userId: string,
  workflowId: string | null,
  patientIds: string[]
) {
  const firestore = getDb();
  let query = firestore
    .collection("scheduledMessages")
    .where("userId", "==", userId)
    .where("patientId", "in", patientIds)
    .where("status", "==", "scheduled");

  // Se o workflowId for fornecido, adiciona à consulta.
  // Se for nulo (no caso de remarcação), remove mensagens de TODOS os workflows para aquele paciente.
  if (workflowId) {
    query = query.where("workflowId", "==", workflowId);
  }

  const messagesQuery = await query.get();
  if (messagesQuery.empty) return;

  const batch = firestore.batch();
  messagesQuery.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  logger.info(
    `Mensagens agendadas removidas para ${patientIds.length} pacientes.`
  );
}

async function clearScheduledMessagesForWorkflow(
  userId: string,
  workflowId: string
) {
  const firestore = getDb();
  const messagesQuery = await firestore
    .collection("scheduledMessages")
    .where("userId", "==", userId)
    .where("workflowId", "==", workflowId)
    .where("status", "==", "scheduled")
    .get();

  if (messagesQuery.empty) return;

  const batch = firestore.batch();
  messagesQuery.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  logger.info(
    `Todas as mensagens agendadas para o workflow ${workflowId} foram removidas.`
  );
}

async function processScheduledMessage(
  doc: admin.firestore.QueryDocumentSnapshot
) {
  const { status, ...message } = doc.data() as ScheduledMessage;
  const logCollectionRef = getDb().collection(
    `users/${message.userId}/messageLog`
  );
  let logDocRef;

  try {
    await doc.ref.update({ status: "processing" });

    logDocRef = await logCollectionRef.add({
      ...message,
      createdAt: Timestamp.now(),
      status: "processing", // Pendente
    });

    await axios.post(`${WHATSAPP_API_URL}`, {
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

    logger.info(
      `✅ Sucesso no envio para paciente ${message.patientId} (Log: ${logDocRef.id})`
    );
  } catch (error: any) {
    logger.error(
      `❌ Falha no envio para paciente ${message.patientId}:`,
      error
    );
    const errorMessage = error.response?.data || error.message;
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

// ----------------------------------------------------------------------------------------------------
// ✅ FUNÇÕES AUXILIARES REATORADAS (HELPER FUNCTIONS)
// ----------------------------------------------------------------------------------------------------

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
    case "weeks":
    case "week":
      target.setDate(target.getDate() + amount * 7);
      break;
    case "months":
    case "month":
      target.setMonth(target.getMonth() + amount);
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

// ----------------------------------------------------------------------------------------------------
// ✅ FUNÇÕES STRIPE (PURO V2) - Sem alterações, já seguiam boas práticas
// ----------------------------------------------------------------------------------------------------
export const createStripeCustomer = onCall(
  { region: "southamerica-east1", secrets: ["STRIPE_SECRET_KEY"] },
  async (req: CallableRequest) => {
    if (!req.auth?.uid)
      throw new HttpsError("unauthenticated", "Usuário não autenticado.");
    const firestore = getDb();
    const userRef = firestore.doc(`users/${req.auth.uid}`);
    const stripeId = (await userRef.get()).data()?.stripeId;
    if (stripeId) return { stripeId };

    const customer = await getStripeClient().customers.create({
      email: req.auth.token.email,
      metadata: { firebaseUID: req.auth.uid },
    });
    await userRef.set({ stripeId: customer.id }, { merge: true });
    return { stripeId: customer.id };
  }
);

export const createCheckoutSession = onCall(
  { region: "southamerica-east1", secrets: ["STRIPE_SECRET_KEY"] },
  async (req: CallableRequest) => {
    if (!req.auth?.uid)
      throw new HttpsError("unauthenticated", "Usuário não autenticado.");
    const { priceId, successUrl, cancelUrl } = req.data;
    if (!priceId || !successUrl || !cancelUrl)
      throw new HttpsError("invalid-argument", "Campos obrigatórios ausentes.");

    const stripeId = (await getDb().doc(`users/${req.auth.uid}`).get()).data()
      ?.stripeId;
    if (!stripeId)
      throw new HttpsError(
        "failed-precondition",
        "Cliente Stripe não encontrado."
      );

    const session = await getStripeClient().checkout.sessions.create({
      customer: stripeId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { firebaseUID: req.auth.uid },
    });
    return { sessionId: session.id };
  }
);

export const createStripePortalSession = onCall(
  { region: "southamerica-east1", secrets: ["STRIPE_SECRET_KEY"] },
  async (req: CallableRequest) => {
    if (!req.auth?.uid)
      throw new HttpsError("unauthenticated", "Usuário não autenticado.");
    const { returnUrl } = req.data;
    if (!returnUrl)
      throw new HttpsError("invalid-argument", "URL de retorno obrigatória.");

    const stripeId = (await getDb().doc(`users/${req.auth.uid}`).get()).data()
      ?.stripeId;
    if (!stripeId)
      throw new HttpsError(
        "failed-precondition",
        "Cliente Stripe não encontrado."
      );

    const portalSession = await getStripeClient().billingPortal.sessions.create(
      { customer: stripeId, return_url: returnUrl }
    );
    return { url: portalSession.url };
  }
);

export const stripeWebhook = onRequest(
  {
    region: "southamerica-east1",
    secrets: ["STRIPE_WEBHOOK_SECRET", "STRIPE_SECRET_KEY"],
  },
  async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"] as string;
    if (!signature) {
      res.status(400).send("Assinatura do webhook ausente.");
      return;
    }

    try {
      const event = getStripeClient().webhooks.constructEvent(
        req.rawBody,
        signature,
        stripeWebhookSecret.value()
      );
      const firestore = getDb();
      let firebaseUID: string | undefined;

      switch (event.type) {
        case "checkout.session.completed":
          const session = event.data.object as Stripe.Checkout.Session;
          firebaseUID = session.metadata?.firebaseUID;
          if (firebaseUID) {
            await firestore
              .doc(`users/${firebaseUID}`)
              .update({ subscriptionStatus: "active" });
            logger.info(`Assinatura ativada para o usuário ${firebaseUID}.`);
          }
          break;

        case "customer.subscription.deleted":
        case "customer.subscription.updated":
          const subscription = event.data.object as Stripe.Subscription;
          if (
            subscription.status === "canceled" ||
            subscription.cancel_at_period_end
          ) {
            const customer = (await getStripeClient().customers.retrieve(
              subscription.customer as string
            )) as Stripe.Customer;
            firebaseUID = customer.metadata.firebaseUID;
            if (firebaseUID) {
              await firestore
                .doc(`users/${firebaseUID}`)
                .update({ subscriptionStatus: "cancelled" });
              logger.info(
                `Assinatura cancelada para o usuário ${firebaseUID}.`
              );
            }
          }
          break;

        default:
          logger.info(`Evento webhook não tratado: ${event.type}`);
      }
      res.status(200).send("Webhook recebido com sucesso.");
    } catch (err: any) {
      logger.error(`❌ Erro no webhook Stripe: ${err.message}`);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
);
