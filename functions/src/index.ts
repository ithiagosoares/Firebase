
// V1 & V2 Imports
import { onRequest } from 'firebase-functions/v2/https';
import { onCall } from 'firebase-functions/v2/https';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';

// --- Importações de Funções Reais do Diretório /functions ---

// Gatilho de Autenticação
import { createCustomerOnSignup } from './auth';

// Gatilhos do Firestore e Agendados
import {
  onWorkflowUpdate,
  onPatientAppointmentUpdate,
  sendScheduledMessages
} from './api/workflows';

// Webhook para a Meta (WhatsApp)
import { metaWebhook } from './api/webhooks';

// Função de Teste
import { ping } from './test';

// Funções chamáveis (Callable) para Pacientes
import {
  getPatients,
  createPatient
} from './api/patients';

// Funções chamáveis (Callable) para Templates
import {
  createTemplate
} from './api/templates';


// --- EXPORTAÇÕES EXPLÍCITAS PARA DEPLOYMENT NO FIREBASE FUNCTIONS ---
// Apenas as funções que devem ser implantadas como Cloud Functions são listadas aqui.
// As API Routes do Next.js (como deletePatient, archivePatient, etc.) NÃO entram neste arquivo.

// Triggers HTTP
export { ping, metaWebhook };

// Triggers Chamáveis (Callable)
export { createCustomerOnSignup, getPatients, createPatient, createTemplate };

// Triggers do Firestore
export { onWorkflowUpdate, onPatientAppointmentUpdate };

// Triggers Agendados
export { sendScheduledMessages };
