import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/firebase-admin";
import { getStripe } from "@/lib/stripe";

export const dynamic = 'force-dynamic';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const PLAN_MAP = {
  "price_1Sl73SEEZjNwuQwB7GmKavAu": "Essencial",
  "price_1Sl73CEEZjNwuQwB1vSGMOED": "Profissional",
  "price_1Sl73fEEZjNwuQwBaAdKiJp4": "Premium",
};

const CREDITS_MAP = {
  "price_1Sl73SEEZjNwuQwB7GmKavAu": 150,
  "price_1Sl73CEEZjNwuQwB1vSGMOED": 300,
  "price_1Sl73fEEZjNwuQwBaAdKiJp4": 750,
};

export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    console.warn("⚠️ STRIPE_WEBHOOK_SECRET is not set. Webhook processing will be skipped.");
    return new Response("Stripe webhook secret is not configured for this environment.", { status: 503 });
  }

  const stripe = getStripe();
  const headersList = await headers(); // Explicitly await and store the headers object
  const signature = headersList.get("stripe-signature"); // Then call .get() on the object

  let event: Stripe.Event;
  try {
    const body = await req.text();
    if (!signature) throw new Error("Stripe signature is missing.");
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Webhook signature verification failed: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const { client_reference_id: userId, customer: customerId } = session;

      if (!userId || !customerId) {
        console.error("Webhook 'checkout.session.completed' missing userId or customerId.");
        return new Response("Essential data missing from session.", { status: 200 });
      }

      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
      const priceId = lineItems.data[0]?.price?.id;
      const planName = priceId ? PLAN_MAP[priceId as keyof typeof PLAN_MAP] : null;
      const credits = priceId ? CREDITS_MAP[priceId as keyof typeof CREDITS_MAP] : 0;

      if (!planName) {
        console.warn(`Webhook received unmapped priceId: ${priceId}`);
        return new Response("Plan not recognized.", { status: 200 });
      }

      try {
        console.log(`Initiating Firestore update for user: ${userId}`);
        const userRef = db().collection("users").doc(userId);
        await userRef.set(
          {
            plan: planName,
            stripeCustomerId: customerId,
            stripePriceId: priceId,
            credits: { remaining: credits },
            monthlyUsage: 0,
            cancelAtPeriodEnd: false,
            updatedAt: new Date(),
          },
          { merge: true }
        );
        console.log(`✅ Firestore updated successfully: user=${userId}, plan=${planName}, credits=${credits}`);
      } catch (error: any) {
        console.error(`🔥 CRITICAL ERROR updating Firestore for userId=${userId}`, error);
        return new Response("Error persisting data to the database.", { status: 500 });
      }
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.billing_reason === 'subscription_create') {
        return new Response('Event ignored (subscription_create handled by checkout.session.completed).', { status: 200 });
      }

      const customerId = invoice.customer as string;
      try {
        const usersQuery = db().collection('users').where('stripeCustomerId', '==', customerId).limit(1);
        const userSnapshot = await usersQuery.get();

        if (userSnapshot.empty) {
          console.error(`❌ invoice.payment_succeeded: No user found for stripeCustomerId: ${customerId}`);
          return new Response('User not found.', { status: 200 });
        }

        const userDoc = userSnapshot.docs[0];
        const userData = userDoc.data();
        const priceId = userData.stripePriceId as keyof typeof CREDITS_MAP | undefined;
        const credits = priceId ? CREDITS_MAP[priceId] : 0;

        await userDoc.ref.update({
          monthlyUsage: 0,
          credits: { remaining: credits },
          cancelAtPeriodEnd: false,
          updatedAt: new Date(),
        });
        console.log(`✅ Renewal processed for ${userDoc.id}. Credits reset to ${credits}.`);
      } catch (error: any) {
        console.error(`🔥 Error processing renewal in Firestore for customer ${customerId}:`, error);
        return new Response("Internal error while processing renewal.", { status: 500 });
      }
      break;
    }

    case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        try {
            const usersQuery = db().collection('users').where('stripeCustomerId', '==', customerId).limit(1);
            const userSnapshot = await usersQuery.get();
            if (userSnapshot.empty) {
                return new Response('User not found for update.', { status: 200 });
            }
            const userDoc = userSnapshot.docs[0];
            await userDoc.ref.update({
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                updatedAt: new Date(),
            });
            console.log(`ℹ️ Subscription cancellation status updated for user ${userDoc.id}: ${subscription.cancel_at_period_end}`);
        } catch (error: any) {
            console.error(`🔥 Error updating subscription status for ${customerId}:`, error);
            return new Response("Internal error.", { status: 500 });
        }
        break;
    }

    case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        try {
            const usersQuery = db().collection('users').where('stripeCustomerId', '==', customerId).limit(1);
            const userSnapshot = await usersQuery.get();
            if (userSnapshot.empty) {
                console.error(`❌ customer.subscription.deleted: User not found for ${customerId}`);
                return new Response('User not found.', { status: 200 });
            }
            const userDoc = userSnapshot.docs[0];
            await userDoc.ref.update({
                plan: "Free",
                stripePriceId: null,
                cancelAtPeriodEnd: false,
                credits: { remaining: 5 },
                updatedAt: new Date(),
            });
            console.log(`🚫 Subscription ended. User ${userDoc.id} moved to Free plan.`);
        } catch (error: any) {
            console.error(`🔥 Error finalizing subscription for ${customerId}:`, error);
            return new Response("Internal error.", { status: 500 });
        }
        break;
    }

    default:
      console.log(`🔔 Unhandled webhook event received: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
