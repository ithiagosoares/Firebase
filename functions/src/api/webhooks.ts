
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { defineSecret } from "firebase-functions/params";
import Stripe from "stripe";

// Garante a inicialização do app, caso ainda não tenha sido feita
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// ==================================================================================================
// DEFINIÇÃO DE SECRETS
// ==================================================================================================

// --- Secrets para o Stripe ---
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

// --- Secret para a verificação do Webhook da Meta ---
// Presumo que você criou um secret com este nome no Google Cloud.
// O valor dele deve ser uma string segura que você também informará no painel da Meta.
const metaVerifyToken = defineSecret("META_VERIFY_TOKEN");


// ==================================================================================================
// FUNÇÕES AUXILIARES E WEBHOOKS
// ==================================================================================================

// --- Cliente Stripe ---
const getStripeClient = (): Stripe => {
  return new Stripe(stripeSecretKey.value(), { typescript: true });
};

// Aqui iriam suas funções `onCall` do Stripe...


/**
 * Webhook para receber eventos da Meta (WhatsApp).
 *
 * GET: Usado para a verificação inicial do endpoint pela Meta.
 * POST: Usado para receber notificações de status de mensagens, respostas de usuários, etc.
 */
export const metaWebhook = onRequest({ secrets: [metaVerifyToken] }, (req, res) => {
  console.log(`[Meta Webhook] Recebido request: ${req.method}`);

  if (req.method === "GET") {
    // Bloco de verificação do Webhook (executado ao configurar no painel da Meta).
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    console.log(`[Meta Webhook] Modo de verificação: '${mode}', Token recebido: '${token}'`);
    
    // Compara o token recebido da Meta com o nosso secret
    if (mode === "subscribe" && token === metaVerifyToken.value()) {
      console.log("[Meta Webhook] VERIFICAÇÃO BEM-SUCEDIDA. Respondendo ao desafio.");
      res.status(200).send(challenge);
    } else {
      console.error("[Meta Webhook] Falha na verificação. Tokens não batem ou modo inválido.");
      res.sendStatus(403); // Forbidden
    }

  } else if (req.method === "POST") {
    // Bloco para receber as notificações da Meta (status de mensagem, etc.)
    const body = req.body;
    console.log("[Meta Webhook] Notificação POST recebida:", JSON.stringify(body, null, 2));

    // A Meta exige uma resposta rápida de 200 OK para confirmar o recebimento.
    res.sendStatus(200);

    // ETAPA FUTURA: Aqui você adicionaria lógica para processar o corpo da notificação.
    // Ex: encontrar a mensagem correspondente no Firestore e atualizar seu status para "entregue" ou "lida".

  } else {
    // Se o método não for GET ou POST, não é permitido.
    console.warn(`[Meta Webhook] Método não permitido recebido: ${req.method}`);
    res.sendStatus(405); // Method Not Allowed
  }
});

// A função de webhook do Stripe viria aqui se você também a tiver no formato onRequest.
// Exemplo:
// export const stripeWebhook = onRequest({ secrets: [stripeWebhookSecret] }, (req, res) => { ... });
