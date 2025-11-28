
import * as admin from 'firebase-admin';

// Este é o nome do seu aplicativo Firebase Admin. Use um nome único.
const FIREBASE_ADMIN_APP_NAME = 'vitalLinkAdmin';

// Interface para as credenciais, para garantir o formato correto.
interface FirebaseAdminCredentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

/**
 * Retorna uma instância do aplicativo Firebase Admin, inicializando-o se ainda não existir.
 * Isso evita a inicialização múltipla, que causa erros em ambientes Next.js.
 */
export function getFirebaseAdminApp() {
  // Verifica se o aplicativo já foi inicializado para evitar erros.
  const alreadyCreatedApp = admin.apps.find(
    (app) => app?.name === FIREBASE_ADMIN_APP_NAME
  );

  if (alreadyCreatedApp) {
    return alreadyCreatedApp;
  }

  // Analisa as credenciais do Firebase a partir da variável de ambiente.
  // As credenciais devem ser armazenadas como uma string JSON base64 no seu .env.local.
  const serviceAccountString = Buffer.from(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "",
    'base64'
  ).toString('utf-8');
  
  if (!serviceAccountString) {
    throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY não está definida.');
  }

  const credentials = JSON.parse(serviceAccountString) as FirebaseAdminCredentials;

  // Inicializa o aplicativo Firebase Admin.
  const app = admin.initializeApp(
    {
      credential: admin.credential.cert(credentials),
    },
    FIREBASE_ADMIN_APP_NAME
  );

  return app;
}
