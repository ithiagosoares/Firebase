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

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-02-24.acacia" }); // Ajuste a versão se necessário conforme seu package.json
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
    // ------------------------------------------------------------------
    // 1. ASSINATURA CRIADA (Checkout Completo)
    // ------------------------------------------------------------------
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
            cancelAtPeriodEnd: false, // Garante que comece como false
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

    // ------------------------------------------------------------------
    // 2. RENOVAÇÃO DE PAGAMENTO (Zera contador e reseta créditos)
    // ------------------------------------------------------------------
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      
      // Ignora faturas de criação de assinatura (billing_reason: 'subscription_create'), 
      // pois o checkout.session.completed já lida com isso.
      if (invoice.billing_reason === 'subscription_create') {
        return new Response('Evento ignorado (subscription_create já tratado).', { status: 200 });
      }

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
          cancelAtPeriodEnd: false, // Se pagou, não está cancelado
          updatedAt: new Date(),
        });

        console.log(`✅ Renovação processada para ${userDoc.id}. Créditos resetados para ${credits}.`);

      } catch (error: any) {
        console.error(`🔥 Erro ao processar renovação no Firestore para o cliente ${customerId}:`, error);
        return new Response("Erro interno ao processar a renovação.", { status: 500 });
      }

      break;
    }

    // ------------------------------------------------------------------
    // 3. ASSINATURA ATUALIZADA (Quando clica em Cancelar ou reativa)
    // ------------------------------------------------------------------
    case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        try {
            const usersQuery = db().collection('users').where('stripeCustomerId', '==', customerId).limit(1);
            const userSnapshot = await usersQuery.get();

            if (userSnapshot.empty) {
                // Não é erro crítico, as vezes eventos chegam antes do user ser criado
                return new Response('Usuário não encontrado para atualização.', { status: 200 });
            }

            const userDoc = userSnapshot.docs[0];

            // Atualiza apenas o status de cancelamento agendado
            await userDoc.ref.update({
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                updatedAt: new Date(),
            });

            console.log(`ℹ️ Status de cancelamento atualizado para o usuário ${userDoc.id}: ${subscription.cancel_at_period_end}`);

        } catch (error: any) {
            console.error(`🔥 Erro ao atualizar status da assinatura para ${customerId}:`, error);
            return new Response("Erro interno.", { status: 500 });
        }
        break;
    }

    // ------------------------------------------------------------------
    // 4. ASSINATURA DELETADA (Cancelamento finalizado -> Volta p/ Free)
    // ------------------------------------------------------------------
    case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        try {
            const usersQuery = db().collection('users').where('stripeCustomerId', '==', customerId).limit(1);
            const userSnapshot = await usersQuery.get();

            if (userSnapshot.empty) {
                console.error(`❌ customer.subscription.deleted: Usuário não encontrado para ${customerId}`);
                return new Response('Usuário não encontrado.', { status: 200 });
            }

            const userDoc = userSnapshot.docs[0];

            // Rebaixa o usuário para o plano Free
            await userDoc.ref.update({
                plan: "Free",
                stripePriceId: null,
                cancelAtPeriodEnd: false,
                credits: {
                    remaining: 5, // Créditos do plano Free (conforme seu código anterior)
                },
                updatedAt: new Date(),
            });

            console.log(`🚫 Assinatura finalizada. Usuário ${userDoc.id} movido para o plano Free.`);

        } catch (error: any) {
            console.error(`🔥 Erro ao finalizar assinatura para ${customerId}:`, error);
            return new Response("Erro interno.", { status: 500 });
        }
        break;
    }

    default:
      console.log(`🔔 Evento de webhook não tratado recebido: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}