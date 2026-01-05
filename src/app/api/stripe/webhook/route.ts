
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/firebase-admin";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Mapeamento de Price ID para o nome do plano
const PLAN_MAP = {
  "price_1Sl73SEEZjNwuQwB7GmKavAu": "Essencial",
  "price_1Sl73CEEZjNwuQwB1vSGMOED": "Profissional",
  "price_1Sl73fEEZjNwuQwBaAdKiJp4": "Premium",
};

// Mapeamento de Price ID para a quantidade de créditos
const CREDITS_MAP = {
  "price_1Sl73SEEZjNwuQwB7GmKavAu": 150,
  "price_1Sl73CEEZjNwuQwB1vSGMOED": 300,
  "price_1Sl73fEEZjNwuQwBaAdKiJp4": 750,
};

if (!stripeSecretKey || !webhookSecret) {
  console.warn("⚠️ Chaves da Stripe ou do Webhook não configuradas. A rota do webhook será ignorada.");
}

export async function POST(req: NextRequest) {
  if (!stripeSecretKey || !webhookSecret) {
    return new Response("Stripe não está configurado neste ambiente.", { status: 503 });
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-02-24.acacia" });
  const signature = (await headers()).get("stripe-signature");

  let event: Stripe.Event;
  try {
    const body = await req.text();
    if (!signature) throw new Error("Assinatura do Stripe ausente.");
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Erro na verificação da assinatura do webhook: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const { client_reference_id: userId, customer: customerId } = session;

      if (!userId || !customerId) {
        console.error("Webhook 'checkout.session.completed' sem userId ou customerId.");
        return new Response("Dados essenciais ausentes na sessão.", { status: 200 });
      }

      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
      const priceId = lineItems.data[0]?.price?.id;
      const planName = priceId ? PLAN_MAP[priceId as keyof typeof PLAN_MAP] : null;
      const credits = priceId ? CREDITS_MAP[priceId as keyof typeof CREDITS_MAP] : 0;

      if (!planName) {
        console.warn(`Webhook recebeu priceId não mapeado: ${priceId}`);
        return new Response("Plano não reconhecido.", { status: 200 });
      }

      try {
        console.log(`Iniciando atualização do Firestore para o usuário: ${userId}`);
        const userRef = db().collection("users").doc(userId);

        await userRef.set(
          {
            plan: planName,
            stripeCustomerId: customerId,
            stripePriceId: priceId,
            credits: {
              remaining: credits,
            },
            monthlyUsage: 0,
            updatedAt: new Date(),
          },
          { merge: true }
        );

        console.log(`✅ Firestore atualizado com sucesso: usuário=${userId}, plano=${planName}, créditos=${credits}`);

      } catch (error: any) {
        console.error(`🔥 Erro CRÍTICO ao atualizar Firestore para userId=${userId}`, error);
        return new Response("Erro ao persistir dados no banco de dados.", { status: 500 });
      }

      break;
    }

    case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        
        try {
            const usersQuery = db().collection('users').where('stripeCustomerId', '==', customerId).limit(1);
            const userSnapshot = await usersQuery.get();

            if (userSnapshot.empty) {
                console.error(`❌ invoice.payment_succeeded: Nenhum usuário encontrado para o stripeCustomerId: ${customerId}`);
                return new Response('Usuário não encontrado.', { status: 200 });
            }

            const userDoc = userSnapshot.docs[0];
            const userData = userDoc.data();
            const priceId = userData.stripePriceId as keyof typeof CREDITS_MAP | undefined;
            const credits = priceId ? CREDITS_MAP[priceId] : 0;

            await userDoc.ref.update({
                monthlyUsage: 0, // Zera o contador na renovação
                credits: {
                  remaining: credits, // Reseta os créditos na renovação
                },
                updatedAt: new Date(),
            });

            console.log(`✅ Renovação processada para ${userDoc.id}. Créditos resetados para ${credits}.`);

        } catch (error: any) {
            console.error(`🔥 Erro ao processar renovação no Firestore para o cliente ${customerId}:`, error);
            return new Response("Erro interno ao processar a renovação.", { status: 500 });
        }

        break;
    }

    default:
      console.log(`🔔 Evento de webhook não tratado recebido: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
