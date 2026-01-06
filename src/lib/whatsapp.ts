import { db } from "@/lib/firebase-admin";

// Modifiquei para receber o userId
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
  
  // NOTA: Para iniciar conversas (primeira msg em 24h), você DEVE usar templates.
  // Este payload 'text' só funciona se o usuário mandou msg pra você nas últimas 24h (janela de suporte).
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

// Adicione isto ao final do arquivo src/lib/whatsapp.ts

export async function sendTemplateMessage(userId: string, to: string, templateName: string, languageCode: string = "pt_BR") {
  // 1. Buscar credenciais do usuário
  const userDoc = await db().collection("users").doc(userId).get();
  const userData = userDoc.data();
  const session = userData?.whatsappSession;

  if (!session || !session.accessToken || !session.phoneNumberId) {
    console.error(`ERRO: Usuário ${userId} não tem WhatsApp conectado.`);
    throw new Error("WhatsApp não conectado.");
  }

  const url = `https://graph.facebook.com/v20.0/${session.phoneNumberId}/messages`;

  // Payload específico para Templates
  const payload = {
    messaging_product: "whatsapp",
    to: to,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode
      }
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