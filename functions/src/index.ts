
/**
 * ==================================================================================================
 * MASTER FUNCTIONS INDEX - ARQUITETURA DE MICROSERVIÇOS (V19.5)
 *
 * DESCRIÇÃO DA ATUALIZAÇÃO (V19.5):
 * - NOVO RECURSO (Agendamento): Adicionada a função `sendScheduledMessages`.
 *   Este Cron Job é acionado a cada minuto para buscar no Firestore (`scheduled_messages`)
 *   as mensagens que devem ser enviadas, utiliza a API da Twilio para o disparo
 *   e atualiza o status da mensagem para 'sent' ou 'failed'.
 *
 * @version 19.5.0
 * ==================================================================================================
 */

import * as admin from "firebase-admin";
import * as functions from "firebase-functions"; // SDK V1 para Auth e Logger
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  onCall,
  HttpsError,
  onRequest,
  Request,
} from "firebase-functions/v2/https";
import { defineSecret, defineString } from "firebase-functions/params";
import Stripe from "stripe";
import { Response } from "express";
import twilio from 'twilio';

// INICIALIZAÇÃO
admin.initializeApp();
const db = admin.firestore();

// PARÂMETROS E SECRETS (V2)
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");
const whatsappApiUrl = defineString("WHATSAPP_API_URL"); // Embora definido, não está em uso ativo nesta versão.
const twilioAccountSid = defineSecret("TWILIO_ACCOUNT_SID");
const twilioAuthToken = defineSecret("TWILIO_AUTH_TOKEN");


const getStripeClient = (): Stripe => {
  return new Stripe(stripeSecretKey.value(), { typescript: true });
};

// ==================================================================================================
// CRON JOB (V2) - ENVIADOR DE MENSAGENS AGENDADAS
// Dispara a cada 1 minuto.
// ==================================================================================================
export const sendScheduledMessages = onSchedule({ 
    schedule: "every 1 minutes",
    region: "southamerica-east1",
    secrets: [twilioAccountSid, twilioAuthToken],
    timeZone: "America/Sao_Paulo", // Garante que a execução seja consistente com o fuso horário de SP.
}, async (event) => {
    
    functions.logger.info("Iniciando verificação de mensagens agendadas...", { timestamp: event.timestamp });
    const now = admin.firestore.Timestamp.now();

    const query = db.collection('scheduled_messages')
                    .where('status', '==', 'scheduled')
                    .where('sendAt', '<=', now);

    const messagesToSend = await query.get();

    if (messagesToSend.empty) {
        functions.logger.info("Nenhuma mensagem agendada para enviar neste ciclo.");
        return;
    }

    functions.logger.info(`Encontradas ${messagesToSend.size} mensagens para enviar.`);

    const client = twilio(twilioAccountSid.value(), twilioAuthToken.value());
    const whatsappSendingNumber = "whatsapp:+14155238886"; // Número da Twilio (Sandbox)

    const promises = messagesToSend.docs.map(async (doc) => {
        const message = doc.data();
        try {
            functions.logger.info(`Enviando mensagem ${doc.id} para ${message.recipient}...`);
            await client.messages.create({
                from: whatsappSendingNumber,
                to: message.recipient,
                body: message.message,
            });
            await doc.ref.update({ status: 'sent', sentAt: admin.firestore.FieldValue.serverTimestamp() });
            functions.logger.info(`Mensagem ${doc.id} enviada com sucesso.`);
        } catch (error) {
            functions.logger.error(`Falha ao enviar mensagem ${doc.id} para ${message.recipient}:`, error);
            await doc.ref.update({ status: 'failed', error: (error as Error).message });
        }
    });

    await Promise.all(promises);
    functions.logger.info("Ciclo de envio de mensagens concluído.");
});


// ==================================================================================================
// GATILHO DE CRIAÇÃO DE CLIENTE NA STRIPE (SDK V1)
// ==================================================================================================
export const createCustomerOnSignup = functions
  .region("southamerica-east1")
  .runWith({ secrets: ["STRIPE_SECRET_KEY"] })
  .auth.user()
  .onCreate(async (user) => {
    if (!user.email) {
      functions.logger.warn(`⚠️ Usuário ${user.uid} criado sem e-mail. Cliente Stripe não foi criado.`);
      return;
    }
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { typescript: true });
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { firebaseUID: user.uid },
      });
      await db.collection("users").doc(user.uid).set({ stripeId: customer.id }, { merge: true });
      functions.logger.info(`✅ Cliente Stripe (ID: ${customer.id}) criado para ${user.email} (UID: ${user.uid}).`);
    } catch (error: any) {
      functions.logger.error(`❌ Erro ao criar cliente Stripe para ${user.email}: ${error.message}`);
      await db.collection("users").doc(user.uid).set({ stripeError: error.message }, { merge: true });
    }
  });

// ==================================================================================================
// WEBHOOK STRIPE (V2) - LÓGICA CENTRAL PARA PAGAMENTOS
// ==================================================================================================
export const stripeWebhook = onRequest({ region: "southamerica-east1", secrets: [stripeSecretKey, stripeWebhookSecret] }, async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"] as string;
    if (!signature) {
        res.status(400).send("Assinatura do webhook ausente.");
        return;
    }

    try {
        const event = getStripeClient().webhooks.constructEvent(req.rawBody, signature, stripeWebhookSecret.value());

        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object as Stripe.Checkout.Session;
                const stripeCustomerId = session.customer as string;
                const subscriptionId = session.subscription as string;

                if (!stripeCustomerId) {
                    functions.logger.error("❌ Webhook 'checkout.session.completed' sem ID de cliente Stripe.");
                    break;
                }

                const usersRef = db.collection("users");
                const userQuery = await usersRef.where("stripeId", "==", stripeCustomerId).limit(1).get();

                if (userQuery.empty) {
                    functions.logger.error(`❌ Usuário não encontrado no Firestore para o stripeId: ${stripeCustomerId}`);
                    break;
                }

                const userDoc = userQuery.docs[0];
                await userDoc.ref.update({
                    subscriptionStatus: "active",
                    stripeSubscriptionId: subscriptionId,
                });
                functions.logger.info(`✅ Assinatura ${subscriptionId} ativada para o usuário ${userDoc.id}.`);
                break;

            case 'customer.subscription.deleted':
            case 'customer.subscription.updated':
                const subscription = event.data.object as Stripe.Subscription;
                if (subscription.status === 'canceled' || subscription.cancel_at_period_end) {
                    const customerId = subscription.customer as string;
                    const userQueryCancel = await db.collection("users").where("stripeId", "==", customerId).limit(1).get();

                    if (!userQueryCancel.empty) {
                        const userToCancel = userQueryCancel.docs[0];
                        await userToCancel.ref.update({ subscriptionStatus: "cancelled" });
                        functions.logger.info(`Assinatura ${subscription.id} marcada como cancelada para o usuário ${userToCancel.id}.`);
                    }
                }
                break;

            default:
                functions.logger.info(`Evento webhook não tratado: ${event.type}`);
        }

        res.status(200).send("Webhook recebido com sucesso.");

    } catch (err: any) {
        functions.logger.error(`❌ Erro no webhook Stripe: ${err.message}`);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
});

// FUNÇÕES OBSOLETAS (MANTIDAS EM BRANCO PARA EVITAR DEPLOYS COM ERRO)
export const createCheckoutSession = onCall(() => { 
    throw new HttpsError("aborted", "Esta função foi descontinuada. Use os Stripe Payment Links.");
});
export const createStripePortalSession = onCall(() => { 
    throw new HttpsError("aborted", "Esta função foi descontinuada.");
});

/*
 * As funções abaixo (onWorkflowUpdate, onPatientAppointmentUpdate, etc.) não foram alteradas
 * e são omitidas aqui para manter a clareza da alteração.
 * Elas continuam existindo no arquivo original.
 */

