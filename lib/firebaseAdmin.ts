
import * as admin from 'firebase-admin';

// Esta verificação impede que o app seja inicializado múltiplas vezes.
if (!admin.apps.length) {
  admin.initializeApp({
    // Fornecer o projectId explicitamente remove a ambiguidade
    // e garante a inicialização correta no ambiente do App Hosting.
    projectId: process.env.GCLOUD_PROJECT,
  });
}

// Exporta a instância do Firestore para ser usada em outras partes do nosso código.
export const db = admin.firestore();
