
/**
 * ==================================================================================================
 * MASTER FUNCTIONS INDEX - ARQUITETURA DE MICROSERVIÇOS (V19.4)
 *
 * DESCRIÇÃO DA ATUALIZAÇÃO (V19.4):
 * - MUDANÇA ESTRATÉGICA (Stripe): Abandonada a criação de sessão dinâmica via onCall.
 *   Adotado o uso de "Stripe Payment Links" para simplificar o fluxo de checkout.
 * - MELHORIA (Webhook): A função `stripeWebhook` foi refatorada. Agora, no evento
 *   `checkout.session.completed`, ela identifica o usuário buscando o `stripeId` no Firestore,
 *   em vez de depender de metadados. Isso garante a compatibilidade com os Payment Links.
 *
 * @version 19.4.0
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
// A LÓGICA DE CHECKOUT AGORA É GERENCIADA POR STRIPE PAYMENT LINKS
export const createCheckoutSession = onCall(() => { 
    throw new HttpsError("aborted", "Esta função foi descontinuada. Use os Stripe Payment Links.");
});
export const createStripePortalSession = onCall(() => { 
    throw new HttpsError("aborted", "Esta função foi descontinuada.");
});

/*
 * As funções abaixo (onWorkflowUpdate, onPatientAppointmentUpdate, etc.) não foram alteradas
 * e são omitidas aqui para manter a clareza da alteração relacionada à Stripe.
 * Elas continuam existindo no arquivo original.
 */
