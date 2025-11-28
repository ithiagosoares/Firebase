import * as admin from "firebase-admin";

// Este é o nome do seu aplicativo Firebase Admin. Use um nome único.
const FIREBASE_ADMIN_APP_NAME = "vitalLinkAdmin";

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

  // CORREÇÃO: Removemos a decodificação de Base64.
  // A variável de ambiente do App Hosting já contém o JSON puro.
  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountString) {
    throw new Error(
      "A variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY não está definida ou está vazia."
    );
  }

  try {
    const credentials = JSON.parse(
      serviceAccountString
    ) as FirebaseAdminCredentials;

    // Inicializa o aplicativo Firebase Admin.
    const app = admin.initializeApp(
      {
        credential: admin.credential.cert(credentials),
      },
      FIREBASE_ADMIN_APP_NAME
    );

    return app;
  } catch (error: any) {
    console.error("### ERRO CRÍTICO AO INICIALIZAR FIREBASE ADMIN ###");
    console.error(
      "Falha ao analisar o JSON da FIREBASE_SERVICE_ACCOUNT_KEY. Verifique se o segredo no Secret Manager contém um JSON válido."
    );
    console.error("Erro original:", error.message);
    // Lança o erro para impedir que a aplicação continue em um estado inválido.
    throw new Error(
      "Falha na inicialização do Firebase Admin. O servidor não pode operar."
    );
  }
}
