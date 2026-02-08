import * as admin from 'firebase-admin';

const FIREBASE_ADMIN_APP_NAME = 'vitalLinkAdmin';

interface FirebaseAdminCredentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

// Armazena a app inicializada (Singleton)
let adminApp: admin.app.App;

function getServiceAccountCredentials(): FirebaseAdminCredentials {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!key) {
    throw new Error('❌ ERRO CRÍTICO: Variável FIREBASE_SERVICE_ACCOUNT_KEY não encontrada nas variáveis de ambiente.');
  }

  // TENTATIVA 1: Tenta ler como JSON puro (caso você tenha colado o { ... })
  try {
    return JSON.parse(key) as FirebaseAdminCredentials;
  } catch (e) {
    // Falhou? Ignora e tenta a próxima estratégia.
  }

  // TENTATIVA 2: Tenta ler como Base64 (caso comece com 'ewog...')
  try {
    const decodedKey = Buffer.from(key, 'base64').toString('utf-8');
    return JSON.parse(decodedKey) as FirebaseAdminCredentials;
  } catch (e) {
    console.error("❌ ERRO DE PARSE: Não foi possível ler a chave do Firebase.");
    throw new Error("A FIREBASE_SERVICE_ACCOUNT_KEY não é um JSON válido e nem uma string Base64 válida.");
  }
}

function initializeAdminApp() {
  // Verifica se já existe para não iniciar duas vezes
  const alreadyCreatedApp = admin.apps.find(
    (app) => app?.name === FIREBASE_ADMIN_APP_NAME
  );

  if (alreadyCreatedApp) {
    return alreadyCreatedApp;
  }

  const credentials = getServiceAccountCredentials();

  return admin.initializeApp(
    {
      credential: admin.credential.cert(credentials),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, // Importante para o Storage funcionar
    },
    FIREBASE_ADMIN_APP_NAME
  );
}

function getAdminApp() {
    if (!adminApp) {
        adminApp = initializeAdminApp();
    }
    return adminApp;
}

// ============================================================================================
// 🔥 EXPORTAÇÕES (Mantendo compatibilidade com seu código atual)
// ============================================================================================

export const db = () => getAdminApp().firestore();
export const auth = () => getAdminApp().auth();
export const storage = () => getAdminApp().storage(); // Adicionei caso precise no futuro