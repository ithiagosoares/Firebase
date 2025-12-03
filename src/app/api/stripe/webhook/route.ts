import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import Stripe from "stripe";
import { getFirebaseAdminApp } from "@/lib/firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Mapeia os IDs de PREÇO (price ID) da Stripe para os nomes dos planos internos.
const PLAN_MAP = {
  "price_1SaEtIEEZjNwuQwBmR30ax57": "Essencial", 
  "price_1SZaPNEEZjNwuQwBIP1smLIm": "Profissional",
  "price_1SaEyPEEZjNwuQwBGrutOkgy": "Premium",
};

if (!stripeSecretKey || !webhookSecret) {
  console.warn("⚠️ Chaves da Stripe ou do Webhook não configuradas. A rota do webhook será ignorada.");
}

export async function POST(req: NextRequest) {
  if (!stripeSecretKey || !webhookSecret) {
    return new Response("Stripe não está configurado neste ambiente.", { status: 503 });
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-04-10" });
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

  // --- Manipulação do Evento ---
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const { client_reference_id: userId, customer: customerId } = session;

      if (!userId || !customerId) {
        console.error("❌ Faltando userId (client_reference_id) ou customerId na sessão de checkout.");
        // Retorna 200 para a Stripe para não reenviar, mas registra o erro.
        return new Response("Dados essenciais ausentes na sessão.", { status: 200 });
      }

      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
      const priceId = lineItems.data[0]?.price?.id;

      if (!priceId) {
        console.error(`❌ Não foi possível encontrar o priceId para a sessão de checkout ${session.id}`);
        return new Response("ID do preço não encontrado.", { status: 200 });
      }

      const planName = PLAN_MAP[priceId as keyof typeof PLAN_MAP];

      if (!planName) {
        console.warn(`🔔 Webhook recebeu um priceId não mapeado: ${priceId}`);
        return new Response("Plano não reconhecido.", { status: 200 });
      }

      try {
        const adminApp = getFirebaseAdminApp();
        const db = getFirestore(adminApp);

        const clinicRef = db.collection("clinics").doc(userId);
        
        await db.runTransaction(async (transaction) => {
            transaction.set(clinicRef, {
                plan: planName,
                monthlyUsage: 0, // Zera o contador de uso no novo ciclo
                stripeCustomerId: customerId,
                stripePriceId: priceId, // Salva o priceId para referência futura
            }, { merge: true });
        });

        console.log(`✅ Plano atualizado com sucesso para [${planName}] para o usuário ${userId}.`);

      } catch (error: any) {
        console.error(`🔥 Erro ao atualizar o plano no Firestore para o usuário ${userId}:`, error.message);
        return new Response("Erro interno ao processar a assinatura.", { status: 500 });
      }

      break;
    }

    case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const priceId = invoice.lines.data[0]?.price?.id;

        if (!customerId || !priceId) {
            console.error('❌ invoice.payment_succeeded: Faltando customerId ou priceId.');
            return new Response('Dados essenciais da fatura ausentes.', { status: 200 });
        }

        const planName = PLAN_MAP[priceId as keyof typeof PLAN_MAP];
        if (!planName) {
            console.warn(`🔔 invoice.payment_succeeded: PriceId não mapeado: ${priceId}`);
            return new Response("Plano não reconhecido.", { status: 200 });
        }

        try {
            const adminApp = getFirebaseAdminApp();
            const db = getFirestore(adminApp);

            // Encontra a clínica pelo ID do cliente Stripe
            const clinicsQuery = db.collection('clinics').where('stripeCustomerId', '==', customerId).limit(1);
            const clinicSnapshot = await clinicsQuery.get();

            if (clinicSnapshot.empty) {
                console.error(`❌ invoice.payment_succeeded: Nenhuma clínica encontrada para o stripeCustomerId: ${customerId}`);
                return new Response('Usuário não encontrado.', { status: 200 });
            }

            const clinicDoc = clinicSnapshot.docs[0];
            await clinicDoc.ref.update({
                plan: planName, // Garante que o plano está correto
                monthlyUsage: 0, // Zera o contador na renovação!
            });

            console.log(`✅ Renovação de assinatura processada para ${clinicDoc.id}. Plano [${planName}] revalidado e uso zerado.`);

        } catch (error: any) {
            console.error(`🔥 Erro ao processar renovação no Firestore para o cliente ${customerId}:`, error.message);
            return new Response("Erro interno ao processar a renovação.", { status: 500 });
        }

        break;
    }

    default:
      console.log(`🔔 Evento de webhook não tratado recebido: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
