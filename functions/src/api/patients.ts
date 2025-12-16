
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Garante a inicialização do app
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// ==================================================================================================
// FUNÇÃO PARA BUSCAR PACIENTES (JÁ EXISTENTE)
// ==================================================================================================

export const getPatients = onCall(async (request) => {
  // Verifica se o usuário está autenticado.
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "A função deve ser chamada por um usuário autenticado.");
  }

  const userId = request.auth.uid;
  const patientsCollection = db.collection(`users/${userId}/patients`);

  try {
    const snapshot = await patientsCollection.get();
    const patients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { patients };
  } catch (error) {
    console.error("Erro ao buscar pacientes:", error);
    throw new HttpsError("internal", "Não foi possível buscar os pacientes.");
  }
});

// ==================================================================================================
// FUNÇÃO PARA CRIAR UM NOVO PACIENTE
// ==================================================================================================

export const createPatient = onCall(async (request) => {
  // 1. Autenticação: Garante que o usuário está logado.
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "A função deve ser chamada por um usuário autenticado.");
  }

  // 2. Validação: Verifica se os dados necessários foram enviados.
  const { name, phone } = request.data;
  if (!name || !phone) {
    throw new HttpsError("invalid-argument", "Os campos 'name' e 'phone' são obrigatórios.");
  }

  // 3. Lógica: Adiciona o novo paciente ao banco de dados.
  const userId = request.auth.uid;
  const newPatient = {
    name,
    phone,
    // O campo 'nextAppointment' é opcional e pode ser adicionado depois
  };

  try {
    const patientRef = await db.collection(`users/${userId}/patients`).add(newPatient);
    console.log(`Novo paciente criado com ID: ${patientRef.id} para o usuário ${userId}`);
    
    // 4. Resposta: Retorna o ID do paciente recém-criado.
    return { patientId: patientRef.id };

  } catch (error) {
    console.error("Erro ao criar paciente:", error);
    throw new HttpsError("internal", "Ocorreu um erro ao tentar criar o paciente.");
  }
});
