import { initializeApp, getApps, cert, getApp, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

let app: App;

try {
  if (!getApps().length) {
    if (serviceAccountStr) {
      // Caso 1: Chave JSON explícita (Local ou variável configurada)
      try {
          const serviceAccount = JSON.parse(serviceAccountStr);
          app = initializeApp({
              credential: cert(serviceAccount),
          });
      } catch (e) {
          console.error("JSON de credenciais inválido. Tentando fallback...", e);
          app = initializeApp();
      }
    } else {
      // Caso 2: App Hosting / Google Cloud (ADC)
      // Tenta inicializar sem argumentos, confiando na infraestrutura do Google
      console.log("Inicializando Firebase Admin via ADC...");
      app = initializeApp(); 
    }
  } else {
    app = getApp();
  }
} catch (error) {
  console.error("Falha crítica na inicialização do Firebase Admin:", error);
  // Não podemos fazer muito se falhar aqui, mas o log ajudará
}

// Exporta o banco. Se app for undefined, vai lançar erro apenas quando tentar usar.
export const adminDb = app! ? getFirestore(app) : null;