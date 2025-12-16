
import * as admin from "firebase-admin";

// Inicializa o Admin SDK globalmente
admin.initializeApp();

// Importa os módulos com as funções refatoradas
import * as webhooks from "./api/webhooks";
import * as workflows from "./api/workflows";
import * as authTriggers from "./auth";

// Opcional: Importa os placeholders para manter a estrutura completa, se desejar.
// Se não houver funções neles ainda, pode-se comentar para evitar exports vazios.
import * as patients from "./api/patients";
import * as templates from "./api/templates";

/**
 * Agrupa e exporta todas as funções HTTP e Gatilhos para o Firebase.
 * Esta estrutura modular organiza o código por responsabilidade.
 */

// Exporta todos os endpoints da API (funções callable, onRequest)
export const api = {
  ...webhooks,    // Funções e webhooks do Stripe
  ...workflows,   // Gatilhos de Firestore e cron job para mensagens
  ...patients,    // Placeholder para futuras funções de pacientes
  ...templates,   // Placeholder para futuras funções de templates
};

// Exporta todos os gatilhos (Auth, Firestore, etc.) que não são chamados diretamente pela API
export const triggers = {
  ...authTriggers, // Gatilho de criação de usuário
};
