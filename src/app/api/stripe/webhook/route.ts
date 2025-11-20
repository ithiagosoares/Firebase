import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import Stripe from "stripe";
import { getFunctions, httpsCallable } from "firebase/functions";
import { initializeApp, getApps } from "firebase/app";
import { firebaseConfig } from "@/firebase/config"; // Assuming this is your client-side config

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn("⚠️ STRIPE_SECRET_KEY não configurada, rota ignorada.");
}

export async function POST(req: NextRequest) {
  if (!stripeSecretKey) {
    return new Response("Stripe desativado no ambiente de build", { status: 200 });
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2024-04-10", // Corrigido
  });
  
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
  const headersList = await headers(); // Corrigido
  const sig = headersList.get("stripe-signature");
  const reqBuffer = await req.arrayBuffer();

  let event: Stripe.Event;

  try {
    if (!sig) throw new Error("Stripe signature is missing");
    if (!webhookSecret) throw new Error("Stripe webhook secret is not configured.");
    event = stripe.webhooks.constructEvent(
      Buffer.from(reqBuffer),
      sig,
      webhookSecret
    );
  } catch (err: any) {
    console.error(`❌ Webhook signature verification failed: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // --- Handle the event ---
  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object as Stripe.Checkout.Session;

      // Extract necessary data from the session
      const userId = session.client_reference_id;
      const priceId = session.line_items?.data[0].price?.id;
      const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

      if (!userId || !priceId || !stripeCustomerId) {
        const missing = [!userId && "userId", !priceId && "priceId", !stripeCustomerId && "stripeCustomerId"]
          .filter(Boolean).join(", ");
        console.error(`❌ Missing essential metadata in checkout session: ${missing}`);
        return new Response("Webhook Error: Missing essential metadata", { status: 400 });
      }

      try {
        // --- Call the Cloud Function ---
        // This initializes a CLIENT-SIDE Firebase app instance to call the function.
        // It's safe and doesn't require admin privileges.
        if (!getApps().length) {
            initializeApp(firebaseConfig);
        }
        const functions = getFunctions(undefined, 'southamerica-east1');
        const updateUserPlan = httpsCallable(functions, 'updateUserPlanOnPayment');
        
        await updateUserPlan({
            userId,
            priceId,
            stripeCustomerId,
        });

        console.log(`✅ Successfully triggered Cloud Function to update plan for UserID: ${userId}`);
      } catch (error) {
        console.error("❌ Error triggering updateUserPlan Cloud Function:", error);
        // The error is logged, but we still return 200 to Stripe because the event was received.
        // The actual business logic failure should be monitored in the Cloud Function logs.
        return new Response("Webhook Error: Failed to trigger backend processing.", { status: 500 });
      }
      break;

    default:
      console.log(`🔔 Received unhandled event type: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
