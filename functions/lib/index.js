"use strict";
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhook = exports.createStripePortalSession = exports.createCheckoutSession = exports.createStripeCustomer = exports.sendScheduledMessages = exports.onPatientAppointmentUpdate = exports.onWorkflowUpdate = void 0;
const admin = __importStar(require("firebase-admin"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const params_1 = require("firebase-functions/params");
const firestore_2 = require("firebase-admin/firestore");
const firebase_functions_1 = require("firebase-functions");
const axios_1 = __importDefault(require("axios"));
const stripe_1 = __importDefault(require("stripe"));
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
const getDb = () => {
    initializeFirebase();
    return admin.firestore();
};
const getStripeClient = () => {
    initializeFirebase();
    return new stripe_1.default((0, params_1.defineSecret)("STRIPE_SECRET_KEY").value(), {
        typescript: true,
    });
};
const stripeWebhookSecret = (0, params_1.defineSecret)("STRIPE_WEBHOOK_SECRET");
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL;
// ----------------------------------------------------------------------------------------------------
// 🚀 ARQUITETURA DE MENSAGENS DESNORMALIZADA E ESCALÁVEL
// ----------------------------------------------------------------------------------------------------
/**
 * GATILHO DE ATUALIZAÇÃO DE WORKFLOW
 * Observa a adição/remoção de pacientes em workflows.
 */
exports.onWorkflowUpdate = (0, firestore_1.onDocumentUpdated)({
    document: "users/{userId}/workflows/{workflowId}",
    region: "southamerica-east1",
}, async (event) => {
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
        firebase_functions_1.logger.info(`Workflow ${workflowId} desativado. Removendo todas as mensagens agendadas.`);
        await clearScheduledMessagesForWorkflow(userId, workflowId);
        return;
    }
    if (addedPatients.length > 0) {
        firebase_functions_1.logger.info(`Pacientes adicionados ao workflow ${workflowId}:`, addedPatients);
        await scheduleMessagesForPatients(userId, workflowId, after.steps, addedPatients);
    }
    if (removedPatients.length > 0) {
        firebase_functions_1.logger.info(`Pacientes removidos do workflow ${workflowId}:`, removedPatients);
        await clearScheduledMessagesForPatients(userId, workflowId, removedPatients);
    }
});
/**
 * NOVO GATILHO - ATUALIZAÇÃO DE CONSULTA DO PACIENTE
 * Observa remarcações de consulta e reagenda todas as mensagens associadas.
 */
exports.onPatientAppointmentUpdate = (0, firestore_1.onDocumentUpdated)({
    document: "users/{userId}/patients/{patientId}",
    region: "southamerica-east1",
}, async (event) => {
    var _a, _b, _c, _d;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    const userId = event.params.userId;
    const patientId = event.params.patientId;
    const beforeTime = (_c = before.nextAppointment) === null || _c === void 0 ? void 0 : _c.toMillis();
    const afterTime = (_d = after.nextAppointment) === null || _d === void 0 ? void 0 : _d.toMillis();
    // Se a data da consulta não mudou, não faz nada.
    if (beforeTime === afterTime) {
        return;
    }
    firebase_functions_1.logger.info(`Detectada remarcação para o paciente ${patientId}. Reagendando mensagens...`);
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
        firebase_functions_1.logger.info(`Paciente ${patientId} não está em nenhum workflow ativo. Nenhuma mensagem para reagendar.`);
        return;
    }
    // 3. Reagenda as mensagens para cada workflow com a nova data
    for (const doc of workflowsSnapshot.docs) {
        const workflow = Object.assign({ id: doc.id }, doc.data());
        firebase_functions_1.logger.info(`Reagendando mensagens para o paciente ${patientId} no workflow ${workflow.id}`);
        await scheduleMessagesForPatients(userId, workflow.id, workflow.steps, [
            patientId,
        ]);
    }
});
/**
 * FUNÇÃO AGENDADA (SCHEDULED FUNCTION) - VERSÃO OTIMIZADA
 * Executa a cada 5 minutos e envia TODAS as mensagens que já passaram do horário de envio.
 */
exports.sendScheduledMessages = (0, scheduler_1.onSchedule)({
    schedule: "every 5 minutes",
    region: "southamerica-east1",
    timeZone: "America/Sao_Paulo",
}, async () => {
    const now = firestore_2.Timestamp.now();
    firebase_functions_1.logger.info(`🟡 Iniciando envio de mensagens agendadas — ${now
        .toDate()
        .toISOString()}`);
    const firestore = getDb();
    const messagesToSend = await firestore
        .collection("scheduledMessages")
        .where("status", "==", "scheduled")
        .where("sendAt", "<=", now)
        .get();
    if (messagesToSend.empty) {
        firebase_functions_1.logger.info("✅ Nenhuma mensagem para enviar neste ciclo.");
        return;
    }
    firebase_functions_1.logger.info(`Enviando ${messagesToSend.docs.length} mensagens...`);
    const processingPromises = messagesToSend.docs.map((doc) => processScheduledMessage(doc));
    await Promise.all(processingPromises);
    firebase_functions_1.logger.info("✅ Ciclo de envio de mensagens finalizado.");
});
// ----------------------------------------------------------------------------------------------------
// ✅ LÓGICA AUXILIAR PARA GERENCIAMENTO DE MENSAGENS
// ----------------------------------------------------------------------------------------------------
async function scheduleMessagesForPatients(userId, workflowId, steps, patientIds) {
    var _a;
    const firestore = getDb();
    const batch = firestore.batch();
    for (const patientId of patientIds) {
        const patientDoc = await firestore
            .doc(`users/${userId}/patients/${patientId}`)
            .get();
        if (!patientDoc.exists || !((_a = patientDoc.data()) === null || _a === void 0 ? void 0 : _a.nextAppointment))
            continue;
        const patient = Object.assign({ id: patientDoc.id }, patientDoc.data());
        for (const step of steps) {
            const templateDoc = await firestore
                .doc(`users/${userId}/messageTemplates/${step.templateId}`)
                .get();
            if (!templateDoc.exists)
                continue;
            const template = Object.assign({ id: templateDoc.id }, templateDoc.data());
            const sendAt = calculateSendDate(patient.nextAppointment.toDate(), step.schedule);
            const messageContent = replaceVariables(template.content, patient);
            const newMessageRef = firestore.collection("scheduledMessages").doc();
            const scheduledMessage = {
                sendAt: firestore_2.Timestamp.fromDate(sendAt),
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
    firebase_functions_1.logger.info(`Agendamento concluído para ${patientIds.length} pacientes no workflow ${workflowId}.`);
}
async function clearScheduledMessagesForPatients(userId, workflowId, patientIds) {
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
    if (messagesQuery.empty)
        return;
    const batch = firestore.batch();
    messagesQuery.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    firebase_functions_1.logger.info(`Mensagens agendadas removidas para ${patientIds.length} pacientes.`);
}
async function clearScheduledMessagesForWorkflow(userId, workflowId) {
    const firestore = getDb();
    const messagesQuery = await firestore
        .collection("scheduledMessages")
        .where("userId", "==", userId)
        .where("workflowId", "==", workflowId)
        .where("status", "==", "scheduled")
        .get();
    if (messagesQuery.empty)
        return;
    const batch = firestore.batch();
    messagesQuery.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    firebase_functions_1.logger.info(`Todas as mensagens agendadas para o workflow ${workflowId} foram removidas.`);
}
async function processScheduledMessage(doc) {
    var _a;
    const _b = doc.data(), { status } = _b, message = __rest(_b, ["status"]);
    const logCollectionRef = getDb().collection(`users/${message.userId}/messageLog`);
    let logDocRef;
    try {
        await doc.ref.update({ status: "processing" });
        logDocRef = await logCollectionRef.add(Object.assign(Object.assign({}, message), { createdAt: firestore_2.Timestamp.now(), status: "processing" }));
        await axios_1.default.post(`${WHATSAPP_API_URL}`, {
            userId: message.userId,
            number: message.patientPhone,
            message: message.messageContent,
        });
        await logDocRef.update({ status: "sent", sentAt: firestore_2.Timestamp.now() });
        await doc.ref.update({
            status: "sent",
            sentAt: firestore_2.Timestamp.now(),
            logId: logDocRef.id,
        });
        firebase_functions_1.logger.info(`✅ Sucesso no envio para paciente ${message.patientId} (Log: ${logDocRef.id})`);
    }
    catch (error) {
        firebase_functions_1.logger.error(`❌ Falha no envio para paciente ${message.patientId}:`, error);
        const errorMessage = ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message;
        if (logDocRef) {
            await logDocRef.update({
                status: "failed",
                failedAt: firestore_2.Timestamp.now(),
                errorMessage,
            });
        }
        await doc.ref.update({
            status: "failed",
            failedAt: firestore_2.Timestamp.now(),
            errorMessage,
        });
    }
}
// ----------------------------------------------------------------------------------------------------
// ✅ FUNÇÕES AUXILIARES REATORADAS (HELPER FUNCTIONS)
// ----------------------------------------------------------------------------------------------------
const calculateSendDate = (appointmentDate, schedule) => {
    const target = new Date(appointmentDate.getTime());
    const amount = schedule.event === "before"
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
            firebase_functions_1.logger.error(`Unidade de tempo inválida: '${schedule.unit}'.`);
    }
    return target;
};
const replaceVariables = (content, patient) => {
    var _a;
    const appointmentDate = (_a = patient.nextAppointment) === null || _a === void 0 ? void 0 : _a.toDate();
    const formattedDate = appointmentDate && !isNaN(appointmentDate.getTime())
        ? `${appointmentDate.toLocaleDateString("pt-BR")} às ${appointmentDate.toLocaleTimeString("pt-BR", {
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
exports.createStripeCustomer = (0, https_1.onCall)({ region: "southamerica-east1", secrets: ["STRIPE_SECRET_KEY"] }, async (req) => {
    var _a, _b;
    if (!((_a = req.auth) === null || _a === void 0 ? void 0 : _a.uid))
        throw new https_1.HttpsError("unauthenticated", "Usuário não autenticado.");
    const firestore = getDb();
    const userRef = firestore.doc(`users/${req.auth.uid}`);
    const stripeId = (_b = (await userRef.get()).data()) === null || _b === void 0 ? void 0 : _b.stripeId;
    if (stripeId)
        return { stripeId };
    const customer = await getStripeClient().customers.create({
        email: req.auth.token.email,
        metadata: { firebaseUID: req.auth.uid },
    });
    await userRef.set({ stripeId: customer.id }, { merge: true });
    return { stripeId: customer.id };
});
exports.createCheckoutSession = (0, https_1.onCall)({ region: "southamerica-east1", secrets: ["STRIPE_SECRET_KEY"] }, async (req) => {
    var _a, _b;
    if (!((_a = req.auth) === null || _a === void 0 ? void 0 : _a.uid))
        throw new https_1.HttpsError("unauthenticated", "Usuário não autenticado.");
    const { priceId, successUrl, cancelUrl } = req.data;
    if (!priceId || !successUrl || !cancelUrl)
        throw new https_1.HttpsError("invalid-argument", "Campos obrigatórios ausentes.");
    const stripeId = (_b = (await getDb().doc(`users/${req.auth.uid}`).get()).data()) === null || _b === void 0 ? void 0 : _b.stripeId;
    if (!stripeId)
        throw new https_1.HttpsError("failed-precondition", "Cliente Stripe não encontrado.");
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
});
exports.createStripePortalSession = (0, https_1.onCall)({ region: "southamerica-east1", secrets: ["STRIPE_SECRET_KEY"] }, async (req) => {
    var _a, _b;
    if (!((_a = req.auth) === null || _a === void 0 ? void 0 : _a.uid))
        throw new https_1.HttpsError("unauthenticated", "Usuário não autenticado.");
    const { returnUrl } = req.data;
    if (!returnUrl)
        throw new https_1.HttpsError("invalid-argument", "URL de retorno obrigatória.");
    const stripeId = (_b = (await getDb().doc(`users/${req.auth.uid}`).get()).data()) === null || _b === void 0 ? void 0 : _b.stripeId;
    if (!stripeId)
        throw new https_1.HttpsError("failed-precondition", "Cliente Stripe não encontrado.");
    const portalSession = await getStripeClient().billingPortal.sessions.create({ customer: stripeId, return_url: returnUrl });
    return { url: portalSession.url };
});
exports.stripeWebhook = (0, https_1.onRequest)({
    region: "southamerica-east1",
    secrets: ["STRIPE_WEBHOOK_SECRET", "STRIPE_SECRET_KEY"],
}, async (req, res) => {
    var _a;
    const signature = req.headers["stripe-signature"];
    if (!signature) {
        res.status(400).send("Assinatura do webhook ausente.");
        return;
    }
    try {
        const event = getStripeClient().webhooks.constructEvent(req.rawBody, signature, stripeWebhookSecret.value());
        const firestore = getDb();
        let firebaseUID;
        switch (event.type) {
            case "checkout.session.completed":
                const session = event.data.object;
                firebaseUID = (_a = session.metadata) === null || _a === void 0 ? void 0 : _a.firebaseUID;
                if (firebaseUID) {
                    await firestore
                        .doc(`users/${firebaseUID}`)
                        .update({ subscriptionStatus: "active" });
                    firebase_functions_1.logger.info(`Assinatura ativada para o usuário ${firebaseUID}.`);
                }
                break;
            case "customer.subscription.deleted":
            case "customer.subscription.updated":
                const subscription = event.data.object;
                if (subscription.status === "canceled" ||
                    subscription.cancel_at_period_end) {
                    const customer = (await getStripeClient().customers.retrieve(subscription.customer));
                    firebaseUID = customer.metadata.firebaseUID;
                    if (firebaseUID) {
                        await firestore
                            .doc(`users/${firebaseUID}`)
                            .update({ subscriptionStatus: "cancelled" });
                        firebase_functions_1.logger.info(`Assinatura cancelada para o usuário ${firebaseUID}.`);
                    }
                }
                break;
            default:
                firebase_functions_1.logger.info(`Evento webhook não tratado: ${event.type}`);
        }
        res.status(200).send("Webhook recebido com sucesso.");
    }
    catch (err) {
        firebase_functions_1.logger.error(`❌ Erro no webhook Stripe: ${err.message}`);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
});
//# sourceMappingURL=index.js.map