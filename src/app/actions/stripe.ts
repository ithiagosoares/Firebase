'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { adminDb } from '@/firebase/admin' 

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error("CRÍTICO: STRIPE_SECRET_KEY não encontrada!");
    throw new Error("Configuração de pagamento ausente no servidor.");
  }
  return new Stripe(secretKey, { typescript: true });
}

export async function createCustomerPortalSession(userId: string) {
  let url: string | undefined;

  try {
    const stripe = getStripe();
    if (!adminDb) throw new Error("Firebase Admin não inicializou.");

    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData?.stripeCustomerId) {
      console.error("Usuário não tem stripeCustomerId.");
      return; 
    }

    const headersList = await headers()
    const host = headersList.get('host')
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const returnUrl = `${protocol}://${host}/settings#payment`

    // Tenta criar o portal. Se falhar por cliente inexistente, não há muito o que fazer no portal além de avisar.
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: userData.stripeCustomerId,
      return_url: returnUrl,
      // configuration: 'bpc_...', // Adicione se tiver
    })

    url = portalSession.url;
    
  } catch (error) {
    console.error("Erro no Portal:", error);
    // Aqui não damos throw para não quebrar a UI inteira
  }

  if (url) redirect(url);
}

export async function createCheckoutSession(userId: string, priceId: string) {
  let url: string | undefined;

  try {
    const stripe = getStripe();
    if (!adminDb) throw new Error("Erro interno: Banco de dados não conectado.");

    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (!userData) throw new Error("Usuário não encontrado.");

    const headersList = await headers()
    const host = headersList.get('host')
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const origin = `${protocol}://${host}`;

    const successUrl = `${origin}/settings?plan_upgraded=true`;
    const cancelUrl = `${origin}/settings`;

    let customerId = userData.stripeCustomerId;

    // Função auxiliar para criar cliente novo
    const createNewCustomer = async () => {
        console.log("Criando novo cliente na Stripe...");
        const customer = await stripe.customers.create({
            email: userData.email,
            name: userData.name,
            metadata: { firebaseId: userId },
        });
        await userRef.update({ stripeCustomerId: customer.id });
        return customer.id;
    };

    // 1. Se não tem ID nenhum, cria agora
    if (!customerId) {
        customerId = await createNewCustomer();
    }

    // 2. Tenta criar a sessão
    let session;
    try {
        session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            mode: 'subscription',
            allow_promotion_codes: true,
            success_url: successUrl,
            cancel_url: cancelUrl,
            client_reference_id: userId,
            metadata: { userId: userId },
        });
    } catch (stripeError: any) {
        // --- AQUI ESTÁ A CORREÇÃO MÁGICA ---
        // Se o erro for "resource_missing", significa que o ID é antigo/teste e não existe na Produção
        if (stripeError.code === 'resource_missing' && stripeError.param === 'customer') {
            console.log("⚠️ Cliente antigo/teste detectado. Recriando cliente em Produção...");
            
            // Recria o cliente e atualiza o banco
            customerId = await createNewCustomer();
            
            // Tenta criar a sessão novamente com o ID novo e válido
            session = await stripe.checkout.sessions.create({
                customer: customerId,
                payment_method_types: ['card'],
                line_items: [{ price: priceId, quantity: 1 }],
                mode: 'subscription',
                allow_promotion_codes: true,
                success_url: successUrl,
                cancel_url: cancelUrl,
                client_reference_id: userId,
                metadata: { userId: userId },
            });
        } else {
            // Se for outro erro (ex: cartão recusado, erro de API), repassa o erro
            throw stripeError;
        }
    }

    if (!session?.url) throw new Error("Stripe não retornou link.");
    
    url = session.url;

  } catch (error: any) {
    console.error("ERRO FATAL NO CHECKOUT:", error.message);
    throw new Error(`Erro no pagamento: ${error.message}`);
  }

  if (url) redirect(url);
}