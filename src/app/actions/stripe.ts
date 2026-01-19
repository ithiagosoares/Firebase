'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { adminDb } from '@/firebase/admin' 

// Função auxiliar para inicializar o Stripe com segurança
function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!secretKey) {
    console.error("CRÍTICO: STRIPE_SECRET_KEY não foi encontrada nas variáveis de ambiente!");
    throw new Error("Configuração de pagamento ausente no servidor.");
  }

  return new Stripe(secretKey, {
    typescript: true,
  });
}

export async function createCustomerPortalSession(userId: string) {
  let url: string | undefined;

  try {
    const stripe = getStripe(); // Inicializa aqui dentro para pegar erro
    
    // Verifica Admin
    if (!adminDb) throw new Error("Firebase Admin não inicializou (adminDb is null)");

    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData?.stripeCustomerId) {
      console.error("Usuário não tem stripeCustomerId no banco.");
      return; 
    }

    const headersList = await headers()
    const host = headersList.get('host')
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const returnUrl = `${protocol}://${host}/settings#payment`

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: userData.stripeCustomerId,
      return_url: returnUrl,
      // configuration: 'bpc_...', // Descomente se tiver ID de configuração
    })

    url = portalSession.url;
    
  } catch (error) {
    console.error("Erro no Portal:", error);
    // Não lançamos throw aqui para não quebrar a página inteira, mas o ideal é tratar
  }

  if (url) redirect(url);
}

export async function createCheckoutSession(userId: string, priceId: string) {
  let url: string | undefined;

  try {
    console.log("Iniciando Checkout para usuário:", userId); // Log para debug

    const stripe = getStripe();
    
    if (!adminDb) {
      console.error("CRÍTICO: adminDb falhou ao carregar.");
      throw new Error("Erro interno de conexão com banco de dados.");
    }

    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (!userData) throw new Error("Usuário não encontrado no Firestore.");

    const headersList = await headers()
    const host = headersList.get('host')
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const origin = `${protocol}://${host}`;

    const successUrl = `${origin}/settings?plan_upgraded=true`;
    const cancelUrl = `${origin}/settings`;

    let customerId = userData.stripeCustomerId;

    if (!customerId) {
        console.log("Cliente Stripe não existe, criando novo...");
        const customer = await stripe.customers.create({
            email: userData.email,
            name: userData.name,
            metadata: {
                firebaseId: userId,
            },
        });
        customerId = customer.id;
        await userRef.update({ stripeCustomerId: customerId });
        console.log("Cliente criado:", customerId);
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

    if (!session.url) throw new Error("Stripe não retornou URL de sessão.");
    
    url = session.url;

  } catch (error: any) {
    console.error("ERRO FATAL NO CHECKOUT:", error.message);
    // Isso vai aparecer nos logs do Google Cloud Console
    throw new Error(`Erro ao processar pagamento: ${error.message}`);
  }

  // Redirect FORA do try/catch é obrigatório
  if (url) {
    redirect(url);
  }
}