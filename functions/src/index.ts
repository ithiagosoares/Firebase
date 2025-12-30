
import * as admin from "firebase-admin";
admin.initializeApp();

// Importa explicitamente CADA função de seu arquivo de origem com os nomes corretos.

// De ./test.ts
import { ping } from "./test";

// De ./auth.ts
import { createCustomerOnSignup } from "./auth";

// De ./api/webhooks.ts
import { metaWebhook } from "./api/webhooks"; // CORRIGIDO: O nome era metaWebhook, não stripeWebhook.

// De ./api/workflows.ts
import { onWorkflowUpdate, onPatientAppointmentUpdate, sendScheduledMessages } from "./api/workflows"; // CORRIGIDO: Importando os gatilhos e a função agendada real.

// NOTA: As funções de 'patients' e 'templates' não são importadas aqui porque elas são funções 'onCall',
// que são um caso especial e não precisam ser exportadas da mesma forma que funções HTTP ou gatilhos de background.
// O SDK do cliente as invoca diretamente pelo nome.

// Exporta explicitamente cada função importada que é um gatilho HTTP, Pub/Sub, agendado ou de background.
// Isso garante que o buildpack do App Hosting descubra cada uma delas sem ambiguidade.
export {
  // Funções HTTP (rotas públicas)
  ping,
  metaWebhook,

  // Gatilhos de Background (Auth, Firestore, etc.)
  createCustomerOnSignup,
  onWorkflowUpdate,
  onPatientAppointmentUpdate,

  // Funções Agendadas
  sendScheduledMessages,
};
