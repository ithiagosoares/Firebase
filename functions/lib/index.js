"use strict";
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
exports.stripeWebhook = exports.createStripePortalSession = exports.createStripeCustomer = exports.createCheckoutSession = exports.sendScheduledMessages = exports.onPatientAppointmentUpdate = exports.onWorkflowUpdate = void 0;
const admin = __importStar(require("firebase-admin"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const firestore_2 = require("firebase-admin/firestore");
const firebase_functions_1 = require("firebase-functions");
const axios_1 = __importDefault(require("axios"));
const stripe_1 = __importDefault(require("stripe"));
// INICIALIZAÇÃO SIMPLIFICADA E CORRETA
admin.initializeApp();
const db = admin.firestore();
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
        await scheduleMessagesForPatients(userId, workflowId, after.steps, addedPatients);
    }
    if (removedPatients.length > 0) {
        await clearScheduledMessagesForPatients(userId, workflowId, removedPatients);
    }
});
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
        const workflow = Object.assign({ id: doc.id }, doc.data());
        await scheduleMessagesForPatients(userId, workflow.id, workflow.steps, [
            patientId,
        ]);
    }
});
exports.sendScheduledMessages = (0, scheduler_1.onSchedule)({
    schedule: "every 1 minute",
    region: "southamerica-east1",
    timeZone: "America/Sao_Paulo",
}, async () => {
    const now = firestore_2.Timestamp.now();
    const messagesToSend = await db
        .collectionGroup("scheduledMessages")
        .where("status", "==", "Agendado")
        .where("scheduledTime", "<=", now)
        .orderBy("scheduledTime", "asc")
        .get();
    if (messagesToSend.empty) {
        firebase_functions_1.logger.info("✅ Nenhuma mensagem para enviar neste ciclo.");
        return;
    }
    firebase_functions_1.logger.info(`Enviando ${messagesToSend.docs.length} mensagens...`);
    const promises = messagesToSend.docs.map(processScheduledMessage);
    await Promise.all(promises);
    firebase_functions_1.logger.info("✅ Ciclo de envio concluído.");
});
async function scheduleMessagesForPatients(userId, workflowId, steps, patientIds) {
    firebase_functions_1.logger.info("Executando scheduleMessagesForPatients - V16.0");
    const batch = db.batch();
    for (const patientId of patientIds) {
        const patientDocRef = db.doc(`users/${userId}/patients/${patientId}`);
        const patientDoc = await patientDocRef.get();
        if (!patientDoc.exists) {
            firebase_functions_1.logger.warn(`Agendamento ignorado: Paciente ${patientId} não foi encontrado no banco de dados.`);
            continue;
        }
        const patientData = patientDoc.data();
        firebase_functions_1.logger.info(`Dados lidos para o Paciente ${patientId}:`, patientData);
        if (!(patientData === null || patientData === void 0 ? void 0 : patientData.phone)) {
            firebase_functions_1.logger.error(`AGENDAMENTO FALHOU: O campo 'phone' não foi encontrado nos dados do paciente ${patientId}.`, { patientData });
            continue;
        }
        if (!(patientData === null || patientData === void 0 ? void 0 : patientData.nextAppointment)) {
            firebase_functions_1.logger.warn(`Agendamento ignorado para ${patientId}: O campo 'nextAppointment' não está definido.`);
            continue;
        }
        const patient = Object.assign({ id: patientDoc.id }, patientData);
        for (const step of steps) {
            // ===== INÍCIO DA CORREÇÃO (V16.0) =====
            const templateId = step.templateId || step.template;
            if (!templateId) {
                firebase_functions_1.logger.warn("'templateId' ou 'template' não encontrado na etapa do workflow. Pulando etapa.", { step });
                continue;
            }
            // ===== FIM DA CORREÇÃO (V16.0) =====
            const templateDoc = await db
                .doc(`users/${userId}/messageTemplates/${templateId}`)
                .get();
            if (!templateDoc.exists) {
                firebase_functions_1.logger.warn(`Template ${templateId} não encontrado. Pulando etapa do workflow.`);
                continue;
            }
            const template = Object.assign({ id: templateDoc.id }, templateDoc.data());
            const sendAt = calculateSendDate(patient.nextAppointment.toDate(), step.schedule);
            const messageContent = replaceVariables(template.content, patient);
            const newMessageRef = db
                .collection(`users/${userId}/scheduledMessages`)
                .doc();
            const scheduledMessage = {
                scheduledTime: firestore_2.Timestamp.fromDate(sendAt),
                status: "Agendado",
                userId,
                patientId,
                workflowId,
                templateId: templateId, // Usando a variável corrigida
                patientPhone: patient.phone,
                messageContent,
            };
            firebase_functions_1.logger.info(`[V16.0] Objeto de agendamento pronto para ser salvo para o paciente ${patientId}:`, scheduledMessage);
            batch.set(newMessageRef, scheduledMessage);
        }
    }
    await batch.commit();
}
async function clearScheduledMessagesForPatients(userId, workflowId, patientIds) {
    let query = db
        .collectionGroup("scheduledMessages")
        .where("userId", "==", userId)
        .where("patientId", "in", patientIds)
        .where("status", "==", "Agendado");
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
    const messagesQuery = await db
        .collectionGroup("scheduledMessages")
        .where("userId", "==", userId)
        .where("workflowId", "==", workflowId)
        .where("status", "==", "Agendado")
        .get();
    if (messagesQuery.empty)
        return;
    const batch = db.batch();
    messagesQuery.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
}
async function processScheduledMessage(doc) {
    var _a;
    const message = doc.data();
    const logCollectionRef = db.collection(`users/${message.userId}/messageLog`);
    let logDocRef;
    try {
        await doc.ref.update({ status: "processing" });
        logDocRef = await logCollectionRef.add(Object.assign(Object.assign({}, message), { createdAt: firestore_2.Timestamp.now(), status: "processing" }));
        await axios_1.default.post(`${process.env.WHATSAPP_API_URL}/send-message`, {
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
    }
    catch (error) {
        const errorMessage = ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message;
        firebase_functions_1.logger.error(`Falha no envio para ${message.patientPhone}:`, errorMessage);
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
// ==================================================================================================
// FUNÇÕES DE PAGAMENTO (STRIPE) - USANDO PROCESS.ENV
// ==================================================================================================
exports.createCheckoutSession = (0, https_1.onCall)({ region: "southamerica-east1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "A função deve ser chamada por um usuário autenticado.");
    }
    firebase_functions_1.logger.info("Placeholder para createCheckoutSession chamado.");
    if (!process.env.STRIPE_API_KEY) {
        throw new https_1.HttpsError("internal", "A chave da API do Stripe não foi configurada.");
    }
    return { placeholder: true };
});
exports.createStripeCustomer = (0, https_1.onCall)({ region: "southamerica-east1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "A função deve ser chamada por um usuário autenticado.");
    }
    firebase_functions_1.logger.info("Placeholder para createStripeCustomer chamado.");
    if (!process.env.STRIPE_API_KEY) {
        throw new https_1.HttpsError("internal", "A chave da API do Stripe não foi configurada.");
    }
    return { placeholder: true };
});
exports.createStripePortalSession = (0, https_1.onCall)({ region: "southamerica-east1" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "A função deve ser chamada por um usuário autenticado.");
    }
    firebase_functions_1.logger.info("Placeholder para createStripePortalSession chamado.");
    if (!process.env.STRIPE_API_KEY) {
        throw new https_1.HttpsError("internal", "A chave da API do Stripe não foi configurada.");
    }
    return { placeholder: true };
});
exports.stripeWebhook = (0, https_1.onRequest)({ region: "southamerica-east1" }, (req, res) => {
    firebase_functions_1.logger.info("Placeholder para stripeWebhook chamado.");
    if (!process.env.STRIPE_API_KEY) {
        res.status(500).send("A chave da API do Stripe não foi configurada.");
        return;
    }
    const stripe = new stripe_1.default(process.env.STRIPE_API_KEY, {
        apiVersion: "2024-04-10",
    });
    if (!stripe) {
        res.status(500).send("Não foi possível inicializar o Stripe.");
        return;
    }
    firebase_functions_1.logger.info("Instância do Stripe criada com sucesso.");
    res.json({ received: true });
});
//# sourceMappingURL=index.js.map