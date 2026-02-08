/**
 * Singleton for the Stripe instance, ensuring it is initialized only once and lazily.
 */
import Stripe from 'stripe';

let stripe: Stripe | undefined;

export const getStripe = (): Stripe => {
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      // This error will only be thrown at runtime if the environment variable is not set.
      throw new Error('STRIPE_SECRET_KEY is not set in environment variables. Payment processing will fail.');
    }

    stripe = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia', // Corrected version to match the project
      typescript: true,
    });
  }

  return stripe;
};