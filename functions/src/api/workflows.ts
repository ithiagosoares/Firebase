
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { defineString } from "firebase-functions/params";
import { Timestamp } from "firebase-admin/firestore";
import axios from "axios";

if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

const whatsappApiUrl = defineString("WHATSAPP_API_URL");

// ==================================================================================================
// INTERFACES ALINHADAS COM O FRONTEND
// ==================================================================================================
interface Patient { id: string; name: string; phone: string; nextAppointment?: Timestamp; }

interface RelativeSchedule {
  triggerType: 'relative';
  quantity: number;
  unit: 'hours' | 'days' | 'weeks' | 'months';
  event: 'before' | 'after';
}

interface SpecificSchedule {
  triggerType: 'specific';
  dateTime: Timestamp;
}

type Schedule = RelativeSchedule | SpecificSchedule;

interface WorkflowStep { template: string; schedule: Schedule; }
interface Workflow { id: string; active: boolean; patients: string[]; steps: WorkflowStep[]; }
interface ScheduledMessage { id: string; scheduledTime: Timestamp; status: "Agendado" | "processing" | "sent" | "failed"; userId: string; patientId: string; workflowId: string; templateId: string; patientPhone: string; messageContent: string; }

// ==================================================================================================
// GATILHOS (SEM ALTERAÇÃO)
// ==================================================================================================

export const onWorkflowUpdate = onDocumentUpdated(
  { document: "users/{userId}/workflows/{workflowId}" },
  async (event) => {
    const before = event.data?.before.data() as Workflow;
    const after = event.data?.after.data() as Workflow;
    const userId = event.params.userId;
    const workflowId = event.params.workflowId;

    if (before.active && !after.active) {
      await clearScheduledMessagesForWorkflow(userId, workflowId);
      return;
    }

    if (JSON.stringify(before.steps) !== JSON.stringify(after.steps) || (!before.active && after.active)) {
        await clearScheduledMessagesForWorkflow(userId, workflowId);
        if(after.active && after.patients.length > 0) {
            await scheduleMessagesForPatients(userId, workflowId, after, after.patients);
        }
        return;
    }

    const patientsBefore = new Set(before.patients || []);
    const patientsAfter = new Set(after.patients || []);
    const addedPatients = [...patientsAfter].filter((p) => !patientsBefore.has(p));
    const removedPatients = [...before.patients].filter((p) => !patientsAfter.has(p));

    if (addedPatients.length > 0) {
        await scheduleMessagesForPatients(userId, workflowId, after, addedPatients);
    }
    if (removedPatients.length > 0) {
        await clearScheduledMessagesForPatients(userId, workflowId, removedPatients);
    }
  }
);

export const onPatientAppointmentUpdate = onDocumentUpdated(
  { document: "users/{userId}/patients/{patientId}" },
  async (event) => {
    const before = event.data?.before.data() as Patient;
    const after = event.data?.after.data() as Patient;

    if (before.nextAppointment?.toMillis() === after.nextAppointment?.toMillis()) return;

    const userId = event.params.userId;
    const patientId = event.params.patientId;

    await clearScheduledMessagesForPatients(userId, null, [patientId]);

    const workflowsSnapshot = await db.collection(`users/${userId}/workflows`)
        .where("active", "==", true)
        .where("patients", "array-contains", patientId)
        .get();

    for (const doc of workflowsSnapshot.docs) {
      const workflow = { id: doc.id, ...doc.data() } as Workflow;
      await scheduleMessagesForPatients(userId, workflow.id, workflow, [patientId]);
    }
  }
);

// ==================================================================================================
// EXECUTOR DE MENSAGENS (SEM ALTERAÇÃO)
// ==================================================================================================

export const sendScheduledMessages = onSchedule(
  { 
    schedule: "* * * * *",
    timeZone: "America/Sao_Paulo",
    secrets: [whatsappApiUrl] 
  },
  async () => {
    const now = Timestamp.now();
    const messagesQuery = db.collectionGroup("scheduledMessages").where("status", "==", "Agendado").where("scheduledTime", "<=", now);
    const messagesSnapshot = await messagesQuery.get();
    
    if (!messagesSnapshot.empty) {
      await Promise.all(messagesSnapshot.docs.map(processScheduledMessage));
    }
  }
);

// ==================================================================================================
// FUNÇÕES AUXILIARES (COM LÓGICA ATUALIZADA)
// ==================================================================================================

async function processScheduledMessage(doc: admin.firestore.QueryDocumentSnapshot) {
    const message = { id: doc.id, ...doc.data() } as ScheduledMessage;
    await doc.ref.update({ status: "processing" });
  
    try {
      const url = whatsappApiUrl.value();
      if (!url) throw new Error("WHATSAPP_API_URL não configurada.");
      
      await axios.post(`${url}/send-message`, { number: message.patientPhone, message: message.messageContent });
      
      await doc.ref.update({ status: "sent", processedAt: Timestamp.now() });
      functions.logger.info(`✅ Mensagem para ${message.patientPhone} delegada.`);
  
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message;
      functions.logger.error(`❌ Falha no envio para ${message.patientPhone}: ${errorMessage}`);
      await doc.ref.update({ status: "failed", error: errorMessage });
    }
  }

async function scheduleMessagesForPatients(userId: string, workflowId: string, workflow: Workflow, patientIds: string[]) {
  const batch = db.batch();
  const steps = workflow.steps;

  for (const patientId of patientIds) {
    const patientDoc = await db.doc(`users/${userId}/patients/${patientId}`).get();
    if (!patientDoc.exists) continue;

    const patient = { id: patientDoc.id, ...patientDoc.data() } as Patient;
    if (!patient.phone) continue;

    for (const step of steps) {
      const templateDoc = await db.doc(`users/${userId}/messageTemplates/${step.template}`).get();
      if (!templateDoc.exists) continue;

      const templateData = templateDoc.data();
      if (!templateData?.body) continue;

      let sendAt: Date | null = null;

      // NOVA LÓGICA DE GATILHO
      if (step.schedule.triggerType === 'specific') {
        sendAt = (step.schedule as SpecificSchedule).dateTime.toDate();
      } else if (step.schedule.triggerType === 'relative') {
        if (patient.nextAppointment) {
            sendAt = calculateSendDate(patient.nextAppointment.toDate(), step.schedule as RelativeSchedule);
        } else {
            // Se for relativo e não houver data, pula este passo para este paciente
            continue;
        }
      }

      if (sendAt === null) continue; // Pula se a data não pôde ser determinada

      const messageContent = replaceVariables(templateData.body, patient);
      
      const newMessageRef = db.collection(`users/${userId}/scheduledMessages`).doc();
      const scheduledMessage: Omit<ScheduledMessage, "id"> = {
        scheduledTime: Timestamp.fromDate(sendAt), 
        status: "Agendado", 
        userId, 
        patientId, 
        workflowId, 
        templateId: step.template, 
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
}

const calculateSendDate = (appointmentDate: Date, schedule: RelativeSchedule): Date => {
  const target = new Date(appointmentDate.getTime());
  const amount = schedule.event === "before" ? -Math.abs(schedule.quantity) : Math.abs(schedule.quantity);

  switch (schedule.unit.toLowerCase()) {
    case "hours": target.setHours(target.getHours() + amount); break;
    case "days": target.setDate(target.getDate() + amount); break;
    case "weeks": target.setDate(target.getDate() + amount * 7); break;
    case "months": target.setMonth(target.getMonth() + amount); break;
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
