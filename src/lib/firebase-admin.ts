
import * as admin from 'firebase-admin';

const FIREBASE_ADMIN_APP_NAME = 'vitalLinkAdmin';

interface FirebaseAdminCredentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export function getFirebaseAdminApp() {
  const alreadyCreatedApp = admin.apps.find(
    (app) => app?.name === FIREBASE_ADMIN_APP_NAME
  );

  if (alreadyCreatedApp) {
    return alreadyCreatedApp;
  }

  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountString) {
    throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY não está definida ou está vazia.');
  }

  try {
    const credentials = JSON.parse(serviceAccountString) as FirebaseAdminCredentials;

    const app = admin.initializeApp(
      {
        credential: admin.credential.cert(credentials),
      },
      FIREBASE_ADMIN_APP_NAME
    );

    return app;
  } catch (error: any) {
    console.error("### ERRO CRÍTICO AO INICIALIZAR FIREBASE ADMIN ###");
    console.error("Falha ao analisar o JSON da FIREBASE_SERVICE_ACCOUNT_KEY. Verifique se o segredo no Secret Manager contém um JSON válido.");
    console.error("Erro original:", error.message);
    throw new Error("Falha na inicialização do Firebase Admin. O servidor não pode operar.");
  }
}

// ============================================================================================
// 🔥 EXPORTAÇÕES CONVENIENTES
// ============================================================================================

// Obtém a instância do app Admin
const adminApp = getFirebaseAdminApp();

// Exporta a instância do Firestore para uso global
export const db = adminApp.firestore();

// Exporta a instância do Auth para uso futuro, se necessário
export const auth = adminApp.auth();
