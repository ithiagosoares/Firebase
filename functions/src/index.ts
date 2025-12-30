
import * as admin from "firebase-admin";
admin.initializeApp();

// Importa explicitamente cada função de seu arquivo de origem.
import { ping } from "./test";
import { createCustomerOnSignup } from "./auth";
import { stripeWebhook } from "./api/webhooks";
import { processWeeklyMessages } from "./api/workflows";
// Adicione outras importações explícitas aqui, se necessário.

// Exporta explicitamente cada função importada.
// Isso garante que o buildpack do App Hosting descubra cada uma delas sem ambiguidade.
export {
  ping,
  createCustomerOnSignup,
  stripeWebhook,
  processWeeklyMessages,
};
