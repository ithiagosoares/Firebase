
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Garanta que a chave secreta da Stripe esteja configurada nas suas variáveis de ambiente
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10', // Use uma versão da API consistente com seu webhook
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { priceId, userId } = body;

    // Validação da entrada
    if (!priceId || !userId) {
      console.error('Missing priceId or userId in request body');
      return new NextResponse('Price ID and User ID are required', { status: 400 });
    }

    const origin = req.headers.get('origin') || 'https://vitallink.clinic'; // Fallback para produção
    const successUrl = `${origin}/settings?plan_upgraded=true`;
    const cancelUrl = `${origin}/settings`;

    // Crie a sessão de checkout na Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      // Esta é a parte mais importante: passar o ID do usuário para o webhook
      client_reference_id: userId,
    });

    if (session.url) {
      // Retorna a URL da sessão para o frontend
      return NextResponse.json({ url: session.url });
    } else {
      // Lidar com o caso improvável de a URL não ser retornada
      console.error('Stripe session was created but no URL was returned');
      return new NextResponse('Could not create Stripe checkout session.', { status: 500 });
    }

  } catch (error: any) {
    console.error('[STRIPE_CREATE_SESSION_ERROR]', error);
    return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
  }
}
