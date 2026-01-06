import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin"; // Importando a função db do seu arquivo
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia", // Verifique se sua versão bate com o package.json
});

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // AQUI ESTÁ A MUDANÇA PRINCIPAL: db() com parênteses
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

    // Atualiza o status no Firebase imediatamente para refletir na UI
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