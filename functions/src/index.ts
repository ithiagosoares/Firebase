
/**
 * ==================================================================================================
 * MASTER FUNCTIONS INDEX - ARQUITETURA DE MICROSERVIÇOS (V21.0)
 *
 * DESCRIÇÃO DA ATUALIZAÇÃO (V21.0):
 * - REMOÇÃO DA TWILIO: Toda a lógica de envio de mensagens via Twilio SDK foi removida.
 * - FOCO ÚNICO: A função `sendScheduledMessages` agora processa APENAS mensagens de Workflows 
 *   de Pacientes, enviadas via Axios para a API customizada (n8n/Meta).
 * - Isso resolve o erro de build `Cannot find module 'twilio'`.
 *
 * @version 21.0.0
 * ==================================================================================================
 */

import * as admin from "firebase-admin";
import * as functions from "firebase-functions"; // SDK V1 para Auth e Logger
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  onCall,
  HttpsError,
  onRequest,
  CallableRequest,
  Request,
} from "firebase-functions/v2/https";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { defineSecret, defineString } from "firebase-functions/params";
import { Timestamp } from "firebase-admin/firestore";
import axios from "axios";
import Stripe from "stripe";
import { Response } from "express";

// INICIALIZAÇÃO
admin.initializeApp();
const db = admin.firestore();

// PARÂMETROS E SECRETS (V2)
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");
const whatsappApiUrl = defineString("WHATSAPP_API_URL");

const getStripeClient = (): Stripe => {
  return new Stripe(stripeSecretKey.value(), { typescript: true });
};

// INTERFACES
interface Patient { id: string; name: string; phone: string; nextAppointment?: Timestamp; }
interface WorkflowStep { templateId: string; schedule: { quantity: number; unit: string; event: "before" | "after" }; }
interface Workflow { id: string; active: boolean; patients: string[]; steps: WorkflowStep[]; }
interface ScheduledMessage { id: string; scheduledTime: Timestamp; status: "Agendado" | "processing" | "sent" | "failed"; userId: string; patientId: string; workflowId: string; templateId: string; patientPhone: string; messageContent: string; }

// ==================================================================================================
// GATILHO DE CRIAÇÃO DE CLIENTE NA STRIPE
// ==================================================================================================
export const createCustomerOnSignup = functions
  .region("southamerica-east1")
  .runWith({ secrets: ["STRIPE_SECRET_KEY"] })
  .auth.user()
  .onCreate(async (user) => {
    const email = user.email;
    const uid = user.uid;

    if (!email) {
      functions.logger.warn(`⚠️ Usuário ${uid} criado sem e-mail. Cliente Stripe não foi criado.`);
      return;
    }

    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { typescript: true });
      const customer = await stripe.customers.create({
        email: email,
        metadata: {
          firebaseUID: uid,
        },
      });

      await db.collection("users").doc(uid).set({
        stripeId: customer.id,
      }, { merge: true });

      functions.logger.info(`✅ Cliente Stripe (ID: ${customer.id}) criado para ${email} (UID: ${uid}).`);

    } catch (error: any) {
      functions.logger.error(`❌ Erro ao criar cliente Stripe para ${email}: ${error.message}`);
       await db.collection("users").doc(uid).set({
        stripeError: error.message,
      }, { merge: true });
    }
  });


// GATILHOS DE WORKFLOW E PACIENTES
export const onWorkflowUpdate = onDocumentUpdated(
  { document: "users/{userId}/workflows/{workflowId}", region: "southamerica-east1" },
  async (event) => {
    const before = event.data?.before.data() as Workflow;
    const after = event.data?.after.data() as Workflow;
    const userId = event.params.userId;
    const workflowId = event.params.workflowId;
    const patientsBefore = new Set(before.patients || []);
    const patientsAfter = new Set(after.patients || []);
    const addedPatients = [...patientsAfter].filter((p) => !patientsBefore.has(p));
    const removedPatients = [...before.patients].filter((p) => !patientsAfter.has(p));
    if (before.active && !after.active) {
      await clearScheduledMessagesForWorkflow(userId, workflowId);
    } else {
      if (addedPatients.length > 0) await scheduleMessagesForPatients(userId, workflowId, after.steps, addedPatients);
      if (removedPatients.length > 0) await clearScheduledMessagesForPatients(userId, workflowId, removedPatients);
    }
  }
);

export const onPatientAppointmentUpdate = onDocumentUpdated(
  { document: "users/{userId}/patients/{patientId}", region: "southamerica-east1" },
  async (event) => {
    const before = event.data?.before.data() as Patient;
    const after = event.data?.after.data() as Patient;
    if (before.nextAppointment?.toMillis() === after.nextAppointment?.toMillis()) return;
    const userId = event.params.userId;
    const patientId = event.params.patientId;
    await clearScheduledMessagesForPatients(userId, null, [patientId]);
    const workflowsSnapshot = await db.collection(`users/${userId}/workflows`).where("active", "==", true).where("patients", "array-contains", patientId).get();
    for (const doc of workflowsSnapshot.docs) {
      const workflow = { id: doc.id, ...doc.data() } as Workflow;
      await scheduleMessagesForPatients(userId, workflow.id, workflow.steps, [patientId]);
    }
  }
);

// ==================================================================================================
// EXECUTOR DE MENSAGENS AGENDADAS - VERSÃO SIMPLIFICADA (APENAS WORKFLOWS)
// ==================================================================================================
export const sendScheduledMessages = onSchedule(
  { 
    schedule: "* * * * *", 
    region: "southamerica-east1", 
    timeZone: "America/Sao_Paulo",
    secrets: [whatsappApiUrl] 
  },
  async () => {
    const now = Timestamp.now();
    functions.logger.info("CRON: Iniciando ciclo de envio de workflows...");

    const workflowMessagesQuery = db.collectionGroup("scheduledMessages")
                                   .where("status", "==", "Agendado")
                                   .where("scheduledTime", "<=", now);
    const workflowMessages = await workflowMessagesQuery.get();
    
    if (workflowMessages.empty) {
        functions.logger.info("CRON: Nenhuma mensagem de workflow para enviar neste ciclo.");
    } else {
      functions.logger.info(`CRON: Encontradas ${workflowMessages.size} mensagens de WORKFLOWS para processar.`);
      await Promise.all(workflowMessages.docs.map(processScheduledMessage));
    }
    
    functions.logger.info("CRON: Ciclo de envio concluído.");
  }
);


// FUNÇÃO DE PROCESSAMENTO PARA WORKFLOWS (VIA AXIOS)
async function processScheduledMessage(doc: admin.firestore.QueryDocumentSnapshot) {
  const message = { id: doc.id, ...doc.data() } as ScheduledMessage;
  await doc.ref.update({ status: "processing" });
  try {
    const url = whatsappApiUrl.value();
    if (!url) throw new Error("WHATSAPP_API_URL não está configurada nos parâmetros de ambiente.");
    
    await axios.post(`${url}/send-message`, { number: message.patientPhone, message: message.messageContent });
    
    await doc.ref.update({ status: "sent", processedAt: Timestamp.now() });
    functions.logger.info(`✅ Mensagem de workflow para ${message.patientPhone} delegada.`);
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || error.message;
    functions.logger.error(`❌ Falha no envio da msg de workflow para ${message.patientPhone}: ${errorMessage}`);
    await doc.ref.update({ status: "failed", error: errorMessage });
  }
}

// FUNÇÕES AUXILIARES
async function scheduleMessagesForPatients(userId: string, workflowId: string, steps: WorkflowStep[], patientIds: string[]) {
  const batch = db.batch();
  for (const patientId of patientIds) {
    const patientDoc = await db.doc(`users/${userId}/patients/${patientId}`).get();
    if (!patientDoc.exists || !patientDoc.data()?.nextAppointment) continue;
    const patient = { id: patientDoc.id, ...patientDoc.data() } as Patient;
    for (const step of steps) {
      const templateDoc = await db.doc(`users/${userId}/messageTemplates/${step.templateId}`).get();
      if (!templateDoc.exists) continue;
      const templateContent = templateDoc.data()?.content;
      if (!templateContent) continue;
      const sendAt = calculateSendDate(patient.nextAppointment!.toDate(), step.schedule);
      const messageContent = replaceVariables(templateContent, patient);
      const newMessageRef = db.collection(`users/${userId}/scheduledMessages`).doc();
      const scheduledMessage: Omit<ScheduledMessage, "id"> = {
        scheduledTime: Timestamp.fromDate(sendAt), status: "Agendado", userId, patientId, workflowId, 
        templateId: step.templateId, patientPhone: patient.phone, messageContent,
      };
      batch.set(newMessageRef, scheduledMessage);
    }
  }
  await batch.commit();
}

async function clearScheduledMessagesForPatients(userId: string, workflowId: string | null, patientIds: string[]) {
  let query: admin.firestore.Query = db.collectionGroup("scheduledMessages").where("userId", "==", userId).where("patientId", "in", patientIds).where("status", "==", "Agendado");
  if (workflowId) { query = query.where("workflowId", "==", workflowId); }
  const messagesQuery = await query.get();
  if (messagesQuery.empty) return;
  const batch = db.batch();
  messagesQuery.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

async function clearScheduledMessagesForWorkflow(userId: string, workflowId: string) {
  const messagesQuery = await db.collectionGroup("scheduledMessages").where("userId", "==", userId).where("workflowId", "==", workflowId).where("status", "==", "Agendado").get();
  if (messagesQuery.empty) return;
  const batch = db.batch();
  messagesQuery.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
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
  const formattedDate = appointmentDate ? `${appointmentDate.toLocaleDateString("pt-BR")} às ${appointmentDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "[Data não definida]";
  return content.replace(/{{NOME_CLIENTE}}/g, patient.name || "[Nome não definido]").replace(/{{DATA_CONSULTA}}/g, formattedDate);
};

// FUNÇÕES STRIPE
export const createStripeCustomer = onCall({ region: "southamerica-east1", secrets: [stripeSecretKey] }, async (req: CallableRequest) => { if (!req.auth?.uid) throw new HttpsError("unauthenticated", "Usuário não autenticado."); const userRef = db.doc(`users/${req.auth.uid}`); const stripeId = (await userRef.get()).data()?.stripeId; if (stripeId) return { stripeId }; const customer = await getStripeClient().customers.create({ email: req.auth.token.email, metadata: { firebaseUID: req.auth.uid } }); await userRef.set({ stripeId: customer.id }, { merge: true }); return { stripeId: customer.id }; });
export const createCheckoutSession = onCall({ region: "southamerica-east1", secrets: [stripeSecretKey] }, async (req: CallableRequest) => { if (!req.auth?.uid) throw new HttpsError("unauthenticated", "Usuário não autenticado."); const { priceId, successUrl, cancelUrl } = req.data; if (!priceId || !successUrl || !cancelUrl) throw new HttpsError("invalid-argument", "Campos obrigatórios ausentes."); const stripeId = (await db.doc(`users/${req.auth.uid}`).get()).data()?.stripeId; if (!stripeId) throw new HttpsError("failed-precondition", "Cliente Stripe não encontrado."); const session = await getStripeClient().checkout.sessions.create({ customer: stripeId, payment_method_types: ["card"], line_items: [{ price: priceId, quantity: 1 }], mode: "subscription", success_url: successUrl, cancel_url: cancelUrl, metadata: { firebaseUID: req.auth.uid } }); return { sessionId: session.id }; });
export const createStripePortalSession = onCall({ region: "southamerica-east1", secrets: [stripeSecretKey] }, async (req: CallableRequest) => { if (!req.auth?.uid) throw new HttpsError("unauthenticated", "URL de retorno obrigatória."); const { returnUrl } = req.data; if (!returnUrl) throw new HttpsError("invalid-argument", "URL de retorno obrigatória."); const stripeId = (await db.doc(`users/${req.auth.uid}`).get()).data()?.stripeId; if (!stripeId) throw new HttpsError("failed-precondition", "Cliente Stripe não encontrado."); const portalSession = await getStripeClient().billingPortal.sessions.create({ customer: stripeId, return_url: returnUrl }); return { url: portalSession.url }; });
export const stripeWebhook = onRequest({ region: "southamerica-east1", secrets: [stripeSecretKey, stripeWebhookSecret] }, async (req: Request, res: Response) => { const signature = req.headers["stripe-signature"] as string; if (!signature) { res.status(400).send("Assinatura do webhook ausente."); return; } try { const event = getStripeClient().webhooks.constructEvent(req.rawBody, signature, stripeWebhookSecret.value()); let firebaseUID: string | undefined; switch (event.type) { case "checkout.session.completed": const session = event.data.object as Stripe.Checkout.Session; firebaseUID = session.metadata?.firebaseUID; if (firebaseUID) { await db.doc(`users/${firebaseUID}`).update({ subscriptionStatus: "active" }); functions.logger.info(`Assinatura ativada para o usuário ${firebaseUID}.`); } break; case "customer.subscription.deleted": case "customer.subscription.updated": const subscription = event.data.object as Stripe.Subscription; if (subscription.status === "canceled" || subscription.cancel_at_period_end) { const customer = (await getStripeClient().customers.retrieve(subscription.customer as string)) as Stripe.Customer; firebaseUID = customer.metadata.firebaseUID; if (firebaseUID) { await db.doc(`users/${firebaseUID}`).update({ subscriptionStatus: "cancelled" }); functions.logger.info(`Assinatura cancelada para o usuário ${firebaseUID}.`); } } break; default: functions.logger.info(`Evento webhook não tratado: ${event.type}`); } res.status(200).send("Webhook recebido com sucesso."); } catch (err: any) { functions.logger.error(`❌ Erro no webhook Stripe: ${err.message}`); res.status(400).send(`Webhook Error: ${err.message}`); } });
