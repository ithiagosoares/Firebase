'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { adminDb } from '@/firebase/admin' 

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
})

export async function createCustomerPortalSession(userId: string) {
  let url: string | undefined;

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
      // Se tiver a configuração do portal, descomente abaixo:
      // configuration: 'bpc_...', 
    })

    url = portalSession.url;
    
  } catch (error) {
    console.error("Erro ao criar portal:", error);
    throw error;
  }

  // O redirect DEVE ficar fora do try/catch
  if (url) {
    redirect(url);
  }
}

export async function createCheckoutSession(userId: string, priceId: string) {
  let url: string | undefined;

  try {
    // Verifica se adminDb foi inicializado corretamente
    if (!adminDb) {
      throw new Error("Erro de conexão com o banco de dados (Firebase Admin não inicializado).");
    }

    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (!userData) throw new Error("Usuário não encontrado no banco de dados.");

    const headersList = await headers()
    const host = headersList.get('host')
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const origin = `${protocol}://${host}`;

    const successUrl = `${origin}/settings?plan_upgraded=true`;
    const cancelUrl = `${origin}/settings`;

    let customerId = userData.stripeCustomerId;

    if (!customerId) {
        console.log("Criando novo cliente na Stripe...");
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

    if (!session.url) throw new Error("Erro ao gerar link de pagamento na Stripe.");
    
    url = session.url;

  } catch (error) {
    console.error("Erro detalhado no checkout:", error);
    throw error; // Isso vai aparecer no terminal do VS Code
  }

  // O redirect DEVE ficar fora do try/catch
  if (url) {
    redirect(url);
  }
}