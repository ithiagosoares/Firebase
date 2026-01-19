import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

let app;

if (!getApps().length) {
  if (serviceAccountStr) {
    try {
        const serviceAccount = JSON.parse(serviceAccountStr);
        app = initializeApp({
            credential: cert(serviceAccount),
        });
    } catch (e) {
        console.error("Erro no parse das credenciais do Firebase Admin", e);
    }
  } else {
    // Inicialização sem credenciais explícitas (para evitar crash em build/dev se a variável não existir)
    app = initializeApp(); 
  }
} else {
  app = getApp();
}

const adminDb = getFirestore(app!);

export { adminDb };