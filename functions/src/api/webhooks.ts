
import * as functions from "firebase-functions";
import { onCall, HttpsError, onRequest, CallableRequest, Request } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { defineSecret } from "firebase-functions/params";
import Stripe from "stripe";
import { Response } from "express";

// Garante a inicialização do app, caso ainda não tenha sido feita
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// Secrets para o Stripe
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

// Função auxiliar para obter o cliente Stripe inicializado
const getStripeClient = (): Stripe => {
  return new Stripe(stripeSecretKey.value(), { typescript: true });
};

// ==================================================================================================
// FUNÇÕES HTTP CALLABLE PARA O STRIPE
// ==================================================================================================

/**
 * Cria um cliente no Stripe com base no usuário autenticado no Firebase.
 * Evita duplicatas verificando se um `stripeId` já existe no documento do usuário.
 */
export const createStripeCustomer = onCall({ region: "southamerica-east1", secrets: [stripeSecretKey] }, async (req: CallableRequest) => {
    if (!req.auth?.uid) {
        throw new HttpsError("unauthenticated", "Usuário não autenticado.");
    }
    const userRef = db.doc(`users/${req.auth.uid}`);
    const userDoc = await userRef.get();
    const stripeId = userDoc.data()?.stripeId;

    if (stripeId) {
        return { stripeId };
    }

    const customer = await getStripeClient().customers.create({
        email: req.auth.token.email,
        metadata: { firebaseUID: req.auth.uid }
    });

    await userRef.set({ stripeId: customer.id }, { merge: true });
    return { stripeId: customer.id };
});

/**
 * Cria uma sessão de checkout do Stripe para uma nova assinatura.
 */
export const createCheckoutSession = onCall({ region: "southamerica-east1", secrets: [stripeSecretKey] }, async (req: CallableRequest) => {
    if (!req.auth?.uid) {
        throw new HttpsError("unauthenticated", "Usuário não autenticado.");
    }

    const { priceId, successUrl, cancelUrl } = req.data;
    if (!priceId || !successUrl || !cancelUrl) {
        throw new HttpsError("invalid-argument", "Campos obrigatórios ausentes (priceId, successUrl, cancelUrl).");
    }

    const stripeId = (await db.doc(`users/${req.auth.uid}`).get()).data()?.stripeId;
    if (!stripeId) {
        throw new HttpsError("failed-precondition", "Cliente Stripe não encontrado. Crie um cliente antes de iniciar o checkout.");
    }

    const session = await getStripeClient().checkout.sessions.create({
        customer: stripeId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { firebaseUID: req.auth.uid }
    });

    return { sessionId: session.id };
});

/**
 * Cria uma sessão do Portal do Cliente Stripe para o usuário gerenciar sua assinatura.
 */
export const createStripePortalSession = onCall({ region: "southamerica-east1", secrets: [stripeSecretKey] }, async (req: CallableRequest) => {
    if (!req.auth?.uid) {
        throw new HttpsError("unauthenticated", "Usuário não autenticado.");
    }
    const { returnUrl } = req.data;
    if (!returnUrl) {
        throw new HttpsError("invalid-argument", "A URL de retorno (returnUrl) é obrigatória.");
    }

    const stripeId = (await db.doc(`users/${req.auth.uid}`).get()).data()?.stripeId;
    if (!stripeId) {
        throw new HttpsError("failed-precondition", "Cliente Stripe não encontrado.");
    }

    const portalSession = await getStripeClient().billingPortal.sessions.create({
        customer: stripeId,
        return_url: returnUrl
    });

    return { url: portalSession.url };
});

// ==================================================================================================
// WEBHOOK PARA RECEBER EVENTOS DO STRIPE
// ==================================================================================================

/**
 * Recebe e processa eventos do Stripe para sincronizar o status da assinatura com o Firestore.
 */
export const stripeWebhook = onRequest({ region: "southamerica-east1", secrets: [stripeSecretKey, stripeWebhookSecret] }, async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"] as string;
    if (!signature) {
        functions.logger.warn("⚠️ Assinatura do webhook Stripe ausente.");
        res.status(400).send("Assinatura do webhook ausente.");
        return;
    }

    try {
        const event = getStripeClient().webhooks.constructEvent(req.rawBody, signature, stripeWebhookSecret.value());
        let firebaseUID: string | undefined;

        switch (event.type) {
            case "checkout.session.completed":
                const session = event.data.object as Stripe.Checkout.Session;
                firebaseUID = session.metadata?.firebaseUID;
                if (firebaseUID) {
                    await db.doc(`users/${firebaseUID}`).update({ subscriptionStatus: "active" });
                    functions.logger.info(`✅ Assinatura ativada para o usuário ${firebaseUID}.`);
                }
                break;

            case "customer.subscription.deleted":
            case "customer.subscription.updated":
                const subscription = event.data.object as Stripe.Subscription;
                // Apenas age se o status for final (cancelado) ou prestes a ser (cancel_at_period_end)
                if (subscription.status === "canceled" || subscription.cancel_at_period_end) {
                    const customer = await getStripeClient().customers.retrieve(subscription.customer as string) as Stripe.Customer;
                    firebaseUID = customer.metadata.firebaseUID;
                    if (firebaseUID) {
                        await db.doc(`users/${firebaseUID}`).update({ subscriptionStatus: "cancelled" });
                        functions.logger.info(`🔔 Assinatura marcada como cancelada para o usuário ${firebaseUID}.`);
                    }
                }
                break;

            default:
                // Não é um erro, apenas um evento que não estamos tratando.
                // functions.logger.info(`Webhook não tratado: ${event.type}`);
                break;
        }

        res.status(200).send("Webhook recebido com sucesso.");

    } catch (err: any) {
        functions.logger.error(`❌ Erro no webhook Stripe: ${err.message}`);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
});
