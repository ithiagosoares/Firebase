import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin"; 
import { getStripe } from "@/lib/stripe"; // ✅ Importa a função segura que criamos

// ✅ OBRIGATÓRIO: Impede que o Next.js tente rodar isso no Build
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // ✅ Inicializa o Stripe SÓ AGORA (Lazy Loading)
    // Assim ele pega a chave do Cloud Run em tempo de execução
    const stripe = getStripe();

    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const userDoc = await db().collection("users").doc(userId).get();
    const userData = userDoc.data();

    if (!userData?.stripeCustomerId) {
      return NextResponse.json({ error: "User does not have an active Stripe customer ID" }, { status: 404 });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: userData.stripeCustomerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
    }

    const subscriptionId = subscriptions.data[0].id;

    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    // Atualiza o status no Firebase imediatamente
    await db().collection("users").doc(userId).update({
        cancelAtPeriodEnd: true, 
    });

    return NextResponse.json({ 
        subscriptionId: updatedSubscription.id,
        status: updatedSubscription.status,
        cancel_at_period_end: updatedSubscription.cancel_at_period_end
    });

  } catch (error: any) {
    console.error("Error canceling subscription:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}