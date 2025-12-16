
import * as admin from "firebase-admin";
import * as functions from "firebase-functions"; // Usado para o logger V1
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { defineString } from "firebase-functions/params";
import { Timestamp } from "firebase-admin/firestore";
import axios from "axios";

// Garante a inicialização do app
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// Parâmetros
const whatsappApiUrl = defineString("WHATSAPP_API_URL");

// ==================================================================================================
// INTERFACES
// ==================================================================================================
interface Patient { id: string; name: string; phone: string; nextAppointment?: Timestamp; }
interface WorkflowStep { templateId: string; schedule: { quantity: number; unit: string; event: "before" | "after" }; }
interface Workflow { id: string; active: boolean; patients: string[]; steps: WorkflowStep[]; }
interface ScheduledMessage { id: string; scheduledTime: Timestamp; status: "Agendado" | "processing" | "sent" | "failed"; userId: string; patientId: string; workflowId: string; templateId: string; patientPhone: string; messageContent: string; }

// ==================================================================================================
// GATILHOS DE FIRESTORE PARA WORKFLOWS E PACIENTES
// ==================================================================================================

export const onWorkflowUpdate = onDocumentUpdated(
  { document: "users/{userId}/workflows/{workflowId}", region: "southamerica-east1" },
  async (event) => {
    const before = event.data?.before.data() as Workflow;
    const after = event.data?.after.data() as Workflow;
    const userId = event.params.userId;
    const workflowId = event.params.workflowId;

    // Se o workflow foi desativado, limpa todas as mensagens agendadas para ele.
    if (before.active && !after.active) {
      await clearScheduledMessagesForWorkflow(userId, workflowId);
      return; // Encerra a execução
    }

    // Se o workflow foi ativado ou se os passos mudaram, reagende tudo.
    // A forma mais simples é limpar e reagendar para todos os pacientes.
    if (JSON.stringify(before.steps) !== JSON.stringify(after.steps) || (!before.active && after.active)) {
        await clearScheduledMessagesForWorkflow(userId, workflowId);
        if(after.active && after.patients.length > 0) {
            await scheduleMessagesForPatients(userId, workflowId, after.steps, after.patients);
        }
        return;
    }

    // Lógica para adicionar/remover pacientes específicos
    const patientsBefore = new Set(before.patients || []);
    const patientsAfter = new Set(after.patients || []);
    const addedPatients = [...patientsAfter].filter((p) => !patientsBefore.has(p));
    const removedPatients = [...before.patients].filter((p) => !patientsAfter.has(p));

    if (addedPatients.length > 0) {
        await scheduleMessagesForPatients(userId, workflowId, after.steps, addedPatients);
    }
    if (removedPatients.length > 0) {
        await clearScheduledMessagesForPatients(userId, workflowId, removedPatients);
    }
  }
);

export const onPatientAppointmentUpdate = onDocumentUpdated(
  { document: "users/{userId}/patients/{patientId}", region: "southamerica-east1" },
  async (event) => {
    const before = event.data?.before.data() as Patient;
    const after = event.data?.after.data() as Patient;

    // Se a data da consulta não mudou, não faz nada.
    if (before.nextAppointment?.toMillis() === after.nextAppointment?.toMillis()) return;

    const userId = event.params.userId;
    const patientId = event.params.patientId;

    // Limpa TODAS as mensagens agendadas para este paciente, de todos os workflows.
    await clearScheduledMessagesForPatients(userId, null, [patientId]);

    // Encontra todos os workflows ativos que este paciente faz parte.
    const workflowsSnapshot = await db.collection(`users/${userId}/workflows`)
        .where("active", "==", true)
        .where("patients", "array-contains", patientId)
        .get();

    // Reagenda as mensagens para cada um desses workflows com a nova data.
    for (const doc of workflowsSnapshot.docs) {
      const workflow = { id: doc.id, ...doc.data() } as Workflow;
      await scheduleMessagesForPatients(userId, workflow.id, workflow.steps, [patientId]);
    }
  }
);

// ==================================================================================================
// EXECUTOR DE MENSAGENS AGENDADAS (CRON JOB)
// ==================================================================================================

export const sendScheduledMessages = onSchedule(
  { 
    schedule: "* * * * *", // Roda a cada minuto
    region: "southamerica-east1", 
    timeZone: "America/Sao_Paulo",
    secrets: [whatsappApiUrl] 
  },
  async () => {
    const now = Timestamp.now();
    functions.logger.info("CRON: Iniciando ciclo de envio de workflows...");

    const messagesQuery = db.collectionGroup("scheduledMessages")
                           .where("status", "==", "Agendado")
                           .where("scheduledTime", "<=", now);
    
    const messagesSnapshot = await messagesQuery.get();
    
    if (messagesSnapshot.empty) {
        functions.logger.info("CRON: Nenhuma mensagem para enviar neste ciclo.");
    } else {
      functions.logger.info(`CRON: Encontradas ${messagesSnapshot.size} mensagens para processar.`);
      await Promise.all(messagesSnapshot.docs.map(processScheduledMessage));
    }
    
    functions.logger.info("CRON: Ciclo de envio concluído.");
  }
);

// ==================================================================================================
// FUNÇÕES AUXILIARES
// ==================================================================================================

async function processScheduledMessage(doc: admin.firestore.QueryDocumentSnapshot) {
  const message = { id: doc.id, ...doc.data() } as ScheduledMessage;
  await doc.ref.update({ status: "processing" });

  try {
    const url = whatsappApiUrl.value();
    if (!url) throw new Error("WHATSAPP_API_URL não está configurada nos parâmetros de ambiente.");
    
    // Envio para a API externa (n8n/Meta)
    await axios.post(`${url}/send-message`, { number: message.patientPhone, message: message.messageContent });
    
    await doc.ref.update({ status: "sent", processedAt: Timestamp.now() });
    functions.logger.info(`✅ Mensagem para ${message.patientPhone} delegada com sucesso.`);

  } catch (error: any) {
    const errorMessage = error.response?.data?.error || error.message;
    functions.logger.error(`❌ Falha no envio para ${message.patientPhone}: ${errorMessage}`);
    await doc.ref.update({ status: "failed", error: errorMessage });
  }
}

async function scheduleMessagesForPatients(userId: string, workflowId: string, steps: WorkflowStep[], patientIds: string[]) {
  const batch = db.batch();
  for (const patientId of patientIds) {
    const patientDoc = await db.doc(`users/${userId}/patients/${patientId}`).get();
    if (!patientDoc.exists || !patientDoc.data()?.nextAppointment) continue;
    
    const patient = { id: patientDoc.id, ...patientDoc.data() } as Patient;
    if (!patient.phone) continue; // Não agenda se o paciente não tiver telefone

    for (const step of steps) {
      const templateDoc = await db.doc(`users/${userId}/messageTemplates/${step.templateId}`).get();
      if (!templateDoc.exists) continue;

      const templateContent = templateDoc.data()?.content;
      if (!templateContent) continue;

      const sendAt = calculateSendDate(patient.nextAppointment!.toDate(), step.schedule);
      const messageContent = replaceVariables(templateContent, patient);
      
      const newMessageRef = db.collection(`users/${userId}/scheduledMessages`).doc();
      const scheduledMessage: Omit<ScheduledMessage, "id"> = {
        scheduledTime: Timestamp.fromDate(sendAt), 
        status: "Agendado", 
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
  functions.logger.info(`Agendamento concluído para ${patientIds.length} pacientes no workflow ${workflowId}.`);
}

async function clearScheduledMessagesForPatients(userId: string, workflowId: string | null, patientIds: string[]) {
  let query: admin.firestore.Query = db.collectionGroup("scheduledMessages")
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
  functions.logger.info(`Mensagens limpas para ${patientIds.length} pacientes.`);
}

async function clearScheduledMessagesForWorkflow(userId: string, workflowId: string) {
  const messagesQuery = await db.collectionGroup("scheduledMessages")
    .where("userId", "==", userId)
    .where("workflowId", "==", workflowId)
    .where("status", "==", "Agendado")
    .get();

  if (messagesQuery.empty) return;

  const batch = db.batch();
  messagesQuery.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  functions.logger.info(`Todas as mensagens agendadas para o workflow ${workflowId} foram limpas.`);
}

const calculateSendDate = (appointmentDate: Date, schedule: WorkflowStep["schedule"]): Date => {
  const target = new Date(appointmentDate.getTime());
  const amount = schedule.event === "before" ? -Math.abs(schedule.quantity) : Math.abs(schedule.quantity);

  switch (schedule.unit.toLowerCase()) {
    case "hours": case "hour": target.setHours(target.getHours() + amount); break;
    case "days": case "day": target.setDate(target.getDate() + amount); break;
    case "weeks": case "week": target.setDate(target.getDate() + amount * 7); break;
    case "months": case "month": target.setMonth(target.getMonth() + amount); break;
    default: functions.logger.error(`Unidade de tempo inválida: '${schedule.unit}'.`);
  }
  return target;
};

const replaceVariables = (content: string, patient: Patient): string => {
  const appointmentDate = patient.nextAppointment?.toDate();
  const formattedDate = appointmentDate 
    ? `${appointmentDate.toLocaleDateString("pt-BR")} às ${appointmentDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` 
    : "[Data não definida]";

  return content
    .replace(/{{NOME_CLIENTE}}/g, patient.name || "[Nome não definido]")
    .replace(/{{DATA_CONSULTA}}/g, formattedDate);
};
