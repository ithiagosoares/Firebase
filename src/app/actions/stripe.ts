'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { adminDb } from '@/firebase/admin' 

// Inicializa Stripe sem travar a versão (usa a instalada)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
})

// --- 1. Função para acessar o Portal (Gerenciar/Cancelar) ---
export async function createCustomerPortalSession(userId: string) {
  try {
    const userDoc = await adminDb!.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData?.stripeCustomerId) {
      console.error("Usuário não tem stripeCustomerId");
      return; 
    }

    const headersList = await headers()
    const host = headersList.get('host')
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const returnUrl = `${protocol}://${host}/settings#payment`

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: userData.stripeCustomerId,
      return_url: returnUrl,
      // Se tiver o ID de configuração do portal (bpc_...), coloque aqui:
      // configuration: 'bpc_1SrIAiEEZj...', 
    })

    redirect(portalSession.url)
  } catch (error) {
    console.error("Erro ao criar portal:", error);
    throw error;
  }
}

// --- 2. Função de Checkout (Comprar Plano) ---
export async function createCheckoutSession(userId: string, priceId: string) {
  try {
    const userRef = adminDb!.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (!userData) throw new Error("Usuário não encontrado");

    const headersList = await headers()
    const host = headersList.get('host')
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const origin = `${protocol}://${host}`;

    // URLs atualizadas conforme seu código anterior
    const successUrl = `${origin}/settings?plan_upgraded=true`;
    const cancelUrl = `${origin}/settings`;

    let customerId = userData.stripeCustomerId;

    // Se o usuário ainda não tem ID na Stripe, criamos agora e salvamos no Firebase
    // Isso evita criar clientes duplicados na Stripe
    if (!customerId) {
        const customer = await stripe.customers.create({
            email: userData.email,
            name: userData.name,
            metadata: {
                firebaseId: userId,
            },
        });
        customerId = customer.id;
        await userRef.update({ stripeCustomerId: customerId });
    }

    // Cria a sessão de checkout
    const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
            {
                price: priceId,
                quantity: 1,
            },
        ],
        mode: 'subscription',
        allow_promotion_codes: true,
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: userId,
        metadata: {
            userId: userId,
        },
    });

    if (!session.url) throw new Error("Erro ao gerar link de pagamento");

    redirect(session.url);

  } catch (error) {
    console.error("Erro ao criar checkout:", error);
    throw error;
  }
}