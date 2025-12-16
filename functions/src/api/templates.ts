
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Garante a inicialização do app
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// ==================================================================================================
// FUNÇÃO PARA CRIAR UM NOVO TEMPLATE DE MENSAGEM
// ==================================================================================================

export const createTemplate = onCall(async (request) => {
  // 1. Autenticação: Garante que o usuário está logado.
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "A função deve ser chamada por um usuário autenticado.");
  }

  // 2. Validação: Verifica se os dados necessários (nome e conteúdo) foram enviados.
  const { name, content } = request.data;
  if (!name || !content) {
    throw new HttpsError("invalid-argument", "Os campos 'name' e 'content' são obrigatórios.");
  }

  // 3. Lógica: Adiciona o novo template ao banco de dados.
  const userId = request.auth.uid;
  const newTemplate = {
    name,
    content,
    createdAt: admin.firestore.FieldValue.serverTimestamp(), // Adiciona um timestamp de criação
  };

  try {
    const templateRef = await db.collection(`users/${userId}/messageTemplates`).add(newTemplate);
    console.log(`Novo template criado com ID: ${templateRef.id} para o usuário ${userId}`);
    
    // 4. Resposta: Retorna o ID do template recém-criado.
    return { templateId: templateRef.id };

  } catch (error) {
    console.error("Erro ao criar template:", error);
    throw new HttpsError("internal", "Ocorreu um erro ao tentar criar o template.");
  }
});

// Poderíamos adicionar outras funções aqui no futuro, como getTemplates, updateTemplate, etc.
