
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Garanta que a chave secreta da Stripe esteja configurada
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
});

// Mapeamento de Price ID para o nome do plano para exibição
const PLAN_DISPLAY_MAP: { [key: string]: string } = {
  "price_1Sl73SEEZjNwuQwB7GmKavAu": "Essencial",
  "price_1Sl73CEEZjNwuQwB1vSGMOED": "Profissional",
  "price_1Sl73fEEZjNwuQwBaAdKiJp4": "Premium",
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { stripeCustomerId } = body;

    if (!stripeCustomerId) {
      return new NextResponse('Stripe Customer ID is required', { status: 400 });
    }

    // 1. Buscar o histórico de faturas (invoices)
    const invoicesResponse = await stripe.invoices.list({
      customer: stripeCustomerId,
      limit: 24, // Limite para os últimos 2 anos de faturas
    });

    const billingHistory = invoicesResponse.data.map(invoice => {
        const priceId = invoice.lines.data[0]?.price?.id;
        return {
            id: invoice.id,
            date: invoice.created,
            amount: invoice.amount_paid,
            plan: priceId ? (PLAN_DISPLAY_MAP[priceId] || 'Plano Desconhecido') : 'N/A',
            status: invoice.status,
            invoiceUrl: invoice.hosted_invoice_url,
        }
    });

    // 2. Buscar a assinatura ativa para saber a próxima data de cobrança
    const subscriptionsResponse = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'active',
      limit: 1,
    });

    let nextBillingDate = null;
    if (subscriptionsResponse.data.length > 0) {
        nextBillingDate = subscriptionsResponse.data[0].current_period_end;
    }

    return NextResponse.json({ billingHistory, nextBillingDate });

  } catch (error: any) {
    console.error('[STRIPE_BILLING_HISTORY_ERROR]', error);
    return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
  }
}
