'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { adminDb } from '@/firebase/admin' 

// Removemos a apiVersion para usar a versão instalada no seu projeto automaticamente
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
})

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
    
    // Redireciona de volta para a aba de pagamentos após sair do portal
    const returnUrl = `${protocol}://${host}/settings#payment`

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: userData.stripeCustomerId,
      return_url: returnUrl,
      // 👇 COLE O CÓDIGO BPC INTEIRO AQUI ENTRE AS ASPAS
      configuration: 'bpc_1SrIAiEEZjNwuQwBLx4n1b3C', 
    })

    redirect(portalSession.url)
    
  } catch (error) {
    console.error("Erro ao criar portal:", error);
    throw error;
  }
}