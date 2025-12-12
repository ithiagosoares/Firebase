
import * as admin from 'firebase-admin';

const FIREBASE_ADMIN_APP_NAME = 'vitalLinkAdmin';

interface FirebaseAdminCredentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

// Armazena a app inicializada para evitar múltiplas inicializações
let adminApp: admin.app.App;

function initializeAdminApp() {
  const alreadyCreatedApp = admin.apps.find(
    (app) => app?.name === FIREBASE_ADMIN_APP_NAME
  );

  if (alreadyCreatedApp) {
    return alreadyCreatedApp;
  }

  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountBase64) {
    throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY não está definida ou está vazia.');
  }

  try {
    const serviceAccountString = Buffer.from(serviceAccountBase64, 'base64').toString('utf8');
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
    if (error.message.includes("Unexpected token")) {
        console.error("Falha ao decodificar ou analisar a FIREBASE_SERVICE_ACCOUNT_KEY. Verifique se o segredo no Secret Manager contém um JSON VÁLIDO CODIFICADO EM BASE64.");
    } else {
        console.error("Falha ao analisar o JSON da FIREBASE_SERVICE_ACCOUNT_KEY. Verifique se o segredo no Secret Manager contém um JSON válido.");
    }
    console.error("Erro original:", error.message);
    throw new Error("Falha na inicialização do Firebase Admin. O servidor não pode operar.");
  }
}

function getAdminApp() {
    if (!adminApp) {
        adminApp = initializeAdminApp();
    }
    return adminApp;
}

// ============================================================================================
// 🔥 EXPORTAÇÕES CONVENIENTES (LAZY INITIALIZATION)
// ============================================================================================

// Agora exportamos getters que inicializam a app apenas quando necessário.
export const db = () => getAdminApp().firestore();
export const auth = () => getAdminApp().auth();
