import { db } from "@/lib/firebase-admin";

// Função para envio de TEXTO (Mensagem livre)
// Útil apenas se a janela de 24h estiver aberta (cliente mandou msg antes)
export async function sendMessage(userId: string, to: string, text: string) {
  
  // 1. Buscar credenciais do usuário no banco
  const userDoc = await db().collection("users").doc(userId).get();
  const userData = userDoc.data();
  const session = userData?.whatsappSession;

  if (!session || !session.accessToken || !session.phoneNumberId) {
    console.error(`ERRO: Usuário ${userId} não tem WhatsApp conectado.`);
    throw new Error("WhatsApp não conectado. Vá em Configurações > WhatsApp para conectar.");
  }

  const accessToken = session.accessToken;
  const phoneNumberId = session.phoneNumberId;

  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
  
  const payload = {
    messaging_product: "whatsapp",
    to: to,
    type: "text",
    text: { body: text },
  };

  try {
    console.log(`ENVIANDO MENSAGEM (User: ${userId}) -> Para: ${to}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Erro Meta API:', JSON.stringify(result, null, 2));
      throw new Error(result.error?.message || 'Erro ao enviar mensagem');
    }

    return result;
  } catch (error) {
    console.error('Erro rede/fetch:', error);
    throw error;
  }
}

// Função para envio de TEMPLATES (Obrigatório para iniciar conversas)
// Adicionamos o parâmetro 'components' explicitamente tipado como any[] para evitar o erro TS
export async function sendTemplateMessage(
  userId: string, 
  to: string, 
  templateName: string, 
  components: any[] = [], // <--- AQUI ESTAVA O PROBLEMA DE TIPAGEM
  languageCode: string = "pt_BR"
) {
  // 1. Buscar credenciais do usuário
  const userDoc = await db().collection("users").doc(userId).get();
  const userData = userDoc.data();
  const session = userData?.whatsappSession;

  if (!session || !session.accessToken || !session.phoneNumberId) {
    console.error(`ERRO: Usuário ${userId} não tem WhatsApp conectado.`);
    throw new Error("WhatsApp não conectado.");
  }

  const url = `https://graph.facebook.com/v20.0/${session.phoneNumberId}/messages`;

  // Payload específico para Templates com Variáveis
  const payload = {
    messaging_product: "whatsapp",
    to: to,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode
      },
      components: components 
    }
  };

  try {
    console.log(`ENVIANDO TEMPLATE (User: ${userId}) -> Para: ${to}, Template: ${templateName}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Erro Meta API (Template):', JSON.stringify(result, null, 2));
      throw new Error(result.error?.message || 'Erro ao enviar template');
    }

    return result;
  } catch (error) {
    console.error('Erro ao enviar template:', error);
    throw error;
  }
}