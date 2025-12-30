
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Stripe from "stripe";

// Garante a inicialização do app
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// ==================================================================================================
// GATILHO DE CRIAÇÃO DE USUÁRIO
// ==================================================================================================

/**
 * Gatilho executado na criação de um novo usuário no Firebase Auth.
 * Cria um cliente correspondente no Stripe para futuras cobranças.
 */
export const createCustomerOnSignup = functions
  .runWith({ secrets: ["STRIPE_SECRET_KEY"] })
  .auth.user()
  .onCreate(async (user) => {
    const email = user.email;
    const uid = user.uid;

    if (!email) {
      functions.logger.warn(`⚠️ Usuário ${uid} criado sem e-mail. Cliente Stripe não foi criado.`);
      return;
    }

    try {
      // Acessar a secret key de forma segura
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { typescript: true });
      
      const customer = await stripe.customers.create({
        email: email,
        metadata: {
          firebaseUID: uid,
        },
      });

      // Salva o ID do cliente Stripe no documento do usuário no Firestore
      await db.collection("users").doc(uid).set({
        stripeId: customer.id,
      }, { merge: true });

      functions.logger.info(`✅ Cliente Stripe (ID: ${customer.id}) criado para ${email} (UID: ${uid}).`);

    } catch (error: any) {
      functions.logger.error(`❌ Erro ao criar cliente Stripe para ${email}: ${error.message}`);
       await db.collection("users").doc(uid).set({
        stripeError: error.message,
      }, { merge: true });
    }
  });
