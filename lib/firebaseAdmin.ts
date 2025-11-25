
import * as admin from 'firebase-admin';

// Esta verificação impede que o app seja inicializado múltiplas vezes,
// o que causaria um erro em um ambiente serverless.
if (!admin.apps.length) {
  admin.initializeApp({
    // As credenciais são descobertas automaticamente no ambiente do Firebase.
    // O mesmo para o databaseURL, que é inferido do projeto.
  });
}

// Exporta a instância do Firestore para ser usada em outras partes do nosso código.
export const db = admin.firestore();
