"use strict";
/**
 * ==================================================================================================
 * MASTER FUNCTIONS INDEX - ARQUITETURA DE MICROSERVIÇOS (V19.1)
 *
 * DESCRIÇÃO DA ATUALIZAÇÃO (V19.1):
 * - CORREÇÃO: Altera a string de agendamento da função `sendScheduledMessages` para o padrão cron.
 * - A string "every 1 minute" não é universalmente aceita; `* * * * *` é o padrão.
 *
 * @version 19.1.0
 * ==================================================================================================
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhook = exports.createStripePortalSession = exports.createCheckoutSession = exports.createStripeCustomer = exports.sendScheduledMessages = exports.onPatientAppointmentUpdate = exports.onWorkflowUpdate = exports.createCustomerOnSignup = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions")); // SDK V1 para Auth e Logger
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const params_1 = require("firebase-functions/params");
const firestore_2 = require("firebase-admin/firestore");
const axios_1 = __importDefault(require("axios"));
const stripe_1 = __importDefault(require("stripe"));
// INICIALIZAÇÃO
admin.initializeApp();
const db = admin.firestore();
// PARÂMETROS E SECRETS (V2)
const stripeSecretKey = (0, params_1.defineSecret)("STRIPE_SECRET_KEY");
const stripeWebhookSecret = (0, params_1.defineSecret)("STRIPE_WEBHOOK_SECRET");
const whatsappApiUrl = (0, params_1.defineString)("WHATSAPP_API_URL");
// Esta função auxiliar continua usando o secret da V2, pois é chamada por funções V2.
const getStripeClient = () => {
    return new stripe_1.default(stripeSecretKey.value(), { typescript: true });
};
// ==================================================================================================
// GATILHO DE CRIAÇÃO DE CLIENTE NA STRIPE (SDK V1)
// ==================================================================================================
exports.createCustomerOnSignup = functions
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
        // Em funções V1, os secrets são acessados via process.env
        const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, { typescript: true });
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
    }
    catch (error) {
        functions.logger.error(`❌ Erro ao criar cliente Stripe para ${email}: ${error.message}`);
        await db.collection("users").doc(uid).set({
            stripeError: error.message,
        }, { merge: true });
    }
});
// GATILHO DE ATUALIZAÇÃO DE WORKFLOW (V2)
exports.onWorkflowUpdate = (0, firestore_1.onDocumentUpdated)({ document: "users/{userId}/workflows/{workflowId}", region: "southamerica-east1" }, async (event) => {
    var _a, _b;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    const userId = event.params.userId;
    const workflowId = event.params.workflowId;
    const patientsBefore = new Set(before.patients || []);
    const patientsAfter = new Set(after.patients || []);
    const addedPatients = [...patientsAfter].filter((p) => !patientsBefore.has(p));
    const removedPatients = [...before.patients].filter((p) => !patientsAfter.has(p));
    if (before.active && !after.active) {
        await clearScheduledMessagesForWorkflow(userId, workflowId);
    }
    else {
        if (addedPatients.length > 0)
            await scheduleMessagesForPatients(userId, workflowId, after.steps, addedPatients);
        if (removedPatients.length > 0)
            await clearScheduledMessagesForPatients(userId, workflowId, removedPatients);
    }
});
// GATILHO DE ATUALIZAÇÃO DE CONSULTA (V2)
exports.onPatientAppointmentUpdate = (0, firestore_1.onDocumentUpdated)({ document: "users/{userId}/patients/{patientId}", region: "southamerica-east1" }, async (event) => {
    var _a, _b, _c, _d;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (((_c = before.nextAppointment) === null || _c === void 0 ? void 0 : _c.toMillis()) === ((_d = after.nextAppointment) === null || _d === void 0 ? void 0 : _d.toMillis()))
        return;
    const userId = event.params.userId;
    const patientId = event.params.patientId;
    await clearScheduledMessagesForPatients(userId, null, [patientId]);
    const workflowsSnapshot = await db.collection(`users/${userId}/workflows`).where("active", "==", true).where("patients", "array-contains", patientId).get();
    for (const doc of workflowsSnapshot.docs) {
        const workflow = Object.assign({ id: doc.id }, doc.data());
        await scheduleMessagesForPatients(userId, workflow.id, workflow.steps, [patientId]);
    }
});
// EXECUTOR DE MENSAGENS AGENDADAS (V2)
exports.sendScheduledMessages = (0, scheduler_1.onSchedule)({ schedule: "* * * * *", region: "southamerica-east1", timeZone: "America/Sao_Paulo" }, async () => {
    const now = firestore_2.Timestamp.now();
    const messagesToSend = await db.collectionGroup("scheduledMessages").where("status", "==", "Agendado").where("scheduledTime", "<=", now).get();
    if (messagesToSend.empty) {
        functions.logger.info("✅ Nenhuma mensagem para enviar.");
        return;
    }
    functions.logger.info(`Disparando ${messagesToSend.docs.length} mensagens via Cloud Run...`);
    await Promise.all(messagesToSend.docs.map(processScheduledMessage));
    functions.logger.info("✅ Ciclo de envio concluído.");
});
// FUNÇÃO DE PROCESSAMENTO (V2)
async function processScheduledMessage(doc) {
    var _a, _b;
    const message = Object.assign({ id: doc.id }, doc.data());
    await doc.ref.update({ status: "processing" });
    try {
        const url = whatsappApiUrl.value();
        if (!url)
            throw new Error("WHATSAPP_API_URL não está configurada nos parâmetros de ambiente.");
        await axios_1.default.post(`${url}/send-message`, { number: message.patientPhone, message: message.messageContent });
        await doc.ref.update({ status: "sent", processedAt: firestore_2.Timestamp.now() });
        functions.logger.info(`✅ Mensagem para ${message.patientPhone} delegada.`);
    }
    catch (error) {
        const errorMessage = ((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) || error.message;
        functions.logger.error(`❌ Falha no envio para ${message.patientPhone}: ${errorMessage}`);
        await doc.ref.update({ status: "failed", error: errorMessage });
    }
}
// FUNÇÕES AUXILIARES
async function scheduleMessagesForPatients(userId, workflowId, steps, patientIds) {
    var _a, _b;
    const batch = db.batch();
    for (const patientId of patientIds) {
        const patientDoc = await db.doc(`users/${userId}/patients/${patientId}`).get();
        if (!patientDoc.exists || !((_a = patientDoc.data()) === null || _a === void 0 ? void 0 : _a.nextAppointment))
            continue;
        const patient = Object.assign({ id: patientDoc.id }, patientDoc.data());
        for (const step of steps) {
            const templateDoc = await db.doc(`users/${userId}/messageTemplates/${step.templateId}`).get();
            if (!templateDoc.exists)
                continue;
            const templateContent = (_b = templateDoc.data()) === null || _b === void 0 ? void 0 : _b.content;
            if (!templateContent)
                continue;
            const sendAt = calculateSendDate(patient.nextAppointment.toDate(), step.schedule);
            const messageContent = replaceVariables(templateContent, patient);
            const newMessageRef = db.collection(`users/${userId}/scheduledMessages`).doc();
            const scheduledMessage = {
                scheduledTime: firestore_2.Timestamp.fromDate(sendAt), status: "Agendado", userId, patientId, workflowId,
                templateId: step.templateId, patientPhone: patient.phone, messageContent,
            };
            batch.set(newMessageRef, scheduledMessage);
        }
    }
    await batch.commit();
}
async function clearScheduledMessagesForPatients(userId, workflowId, patientIds) {
    let query = db.collectionGroup("scheduledMessages").where("userId", "==", userId).where("patientId", "in", patientIds).where("status", "==", "Agendado");
    if (workflowId) {
        query = query.where("workflowId", "==", workflowId);
    }
    const messagesQuery = await query.get();
    if (messagesQuery.empty)
        return;
    const batch = db.batch();
    messagesQuery.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
}
async function clearScheduledMessagesForWorkflow(userId, workflowId) {
    const messagesQuery = await db.collectionGroup("scheduledMessages").where("userId", "==", userId).where("workflowId", "==", workflowId).where("status", "==", "Agendado").get();
    if (messagesQuery.empty)
        return;
    const batch = db.batch();
    messagesQuery.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
}
const calculateSendDate = (appointmentDate, schedule) => {
    const target = new Date(appointmentDate.getTime());
    const amount = schedule.event === "before" ? -Math.abs(schedule.quantity) : Math.abs(schedule.quantity);
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
        default: functions.logger.error(`Unidade de tempo inválida: '${schedule.unit}'.`);
    }
    return target;
};
const replaceVariables = (content, patient) => {
    var _a;
    const appointmentDate = (_a = patient.nextAppointment) === null || _a === void 0 ? void 0 : _a.toDate();
    const formattedDate = appointmentDate ? `${appointmentDate.toLocaleDateString("pt-BR")} às ${appointmentDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "[Data não definida]";
    return content.replace(/{{NOME_CLIENTE}}/g, patient.name || "[Nome não definido]").replace(/{{DATA_CONSULTA}}/g, formattedDate);
};
// FUNÇÕES STRIPE (V2)
exports.createStripeCustomer = (0, https_1.onCall)({ region: "southamerica-east1", secrets: [stripeSecretKey] }, async (req) => { var _a, _b; if (!((_a = req.auth) === null || _a === void 0 ? void 0 : _a.uid))
    throw new https_1.HttpsError("unauthenticated", "Usuário não autenticado."); const userRef = db.doc(`users/${req.auth.uid}`); const stripeId = (_b = (await userRef.get()).data()) === null || _b === void 0 ? void 0 : _b.stripeId; if (stripeId)
    return { stripeId }; const customer = await getStripeClient().customers.create({ email: req.auth.token.email, metadata: { firebaseUID: req.auth.uid } }); await userRef.set({ stripeId: customer.id }, { merge: true }); return { stripeId: customer.id }; });
exports.createCheckoutSession = (0, https_1.onCall)({ region: "southamerica-east1", secrets: [stripeSecretKey] }, async (req) => { var _a, _b; if (!((_a = req.auth) === null || _a === void 0 ? void 0 : _a.uid))
    throw new https_1.HttpsError("unauthenticated", "Usuário não autenticado."); const { priceId, successUrl, cancelUrl } = req.data; if (!priceId || !successUrl || !cancelUrl)
    throw new https_1.HttpsError("invalid-argument", "Campos obrigatórios ausentes."); const stripeId = (_b = (await db.doc(`users/${req.auth.uid}`).get()).data()) === null || _b === void 0 ? void 0 : _b.stripeId; if (!stripeId)
    throw new https_1.HttpsError("failed-precondition", "Cliente Stripe não encontrado."); const session = await getStripeClient().checkout.sessions.create({ customer: stripeId, payment_method_types: ["card"], line_items: [{ price: priceId, quantity: 1 }], mode: "subscription", success_url: successUrl, cancel_url: cancelUrl, metadata: { firebaseUID: req.auth.uid } }); return { sessionId: session.id }; });
exports.createStripePortalSession = (0, https_1.onCall)({ region: "southamerica-east1", secrets: [stripeSecretKey] }, async (req) => { var _a, _b; if (!((_a = req.auth) === null || _a === void 0 ? void 0 : _a.uid))
    throw new https_1.HttpsError("unauthenticated", "URL de retorno obrigatória."); const { returnUrl } = req.data; if (!returnUrl)
    throw new https_1.HttpsError("invalid-argument", "URL de retorno obrigatória."); const stripeId = (_b = (await db.doc(`users/${req.auth.uid}`).get()).data()) === null || _b === void 0 ? void 0 : _b.stripeId; if (!stripeId)
    throw new https_1.HttpsError("failed-precondition", "Cliente Stripe não encontrado."); const portalSession = await getStripeClient().billingPortal.sessions.create({ customer: stripeId, return_url: returnUrl }); return { url: portalSession.url }; });
exports.stripeWebhook = (0, https_1.onRequest)({ region: "southamerica-east1", secrets: [stripeSecretKey, stripeWebhookSecret] }, async (req, res) => { var _a; const signature = req.headers["stripe-signature"]; if (!signature) {
    res.status(400).send("Assinatura do webhook ausente.");
    return;
} try {
    const event = getStripeClient().webhooks.constructEvent(req.rawBody, signature, stripeWebhookSecret.value());
    let firebaseUID;
    switch (event.type) {
        case "checkout.session.completed":
            const session = event.data.object;
            firebaseUID = (_a = session.metadata) === null || _a === void 0 ? void 0 : _a.firebaseUID;
            if (firebaseUID) {
                await db.doc(`users/${firebaseUID}`).update({ subscriptionStatus: "active" });
                functions.logger.info(`Assinatura ativada para o usuário ${firebaseUID}.`);
            }
            break;
        case "customer.subscription.deleted":
        case "customer.subscription.updated":
            const subscription = event.data.object;
            if (subscription.status === "canceled" || subscription.cancel_at_period_end) {
                const customer = (await getStripeClient().customers.retrieve(subscription.customer));
                firebaseUID = customer.metadata.firebaseUID;
                if (firebaseUID) {
                    await db.doc(`users/${firebaseUID}`).update({ subscriptionStatus: "cancelled" });
                    functions.logger.info(`Assinatura cancelada para o usuário ${firebaseUID}.`);
                }
            }
            break;
        default: functions.logger.info(`Evento webhook não tratado: ${event.type}`);
    }
    res.status(200).send("Webhook recebido com sucesso.");
}
catch (err) {
    functions.logger.error(`❌ Erro no webhook Stripe: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
} });
//# sourceMappingURL=index.js.map