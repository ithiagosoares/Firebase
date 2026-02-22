import { db } from "@/lib/firebase-admin";

/**
 * Normaliza número para padrão E.164 (remove tudo que não for número)
 * Exemplo: (11) 99999-9999 -> 5511999999999
 */
function formatToE164(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Busca sessão do WhatsApp do usuário
 */
async function getWhatsappSession(userId: string) {
  const userDoc = await db().collection("users").doc(userId).get();
  const userData = userDoc.data();
  const session = userData?.whatsappSession;

  if (!session?.accessToken || !session?.phoneNumberId) {
    throw new Error("WhatsApp não conectado. Vá em Configurações > WhatsApp.");
  }

  return session;
}

/**
 * Envio de mensagem TEXTO (janela 24h aberta)
 */
export async function sendMessage(
  userId: string,
  to: string,
  text: string
) {
  const session = await getWhatsappSession(userId);

  const url = `https://graph.facebook.com/v20.0/${session.phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: formatToE164(to),
    type: "text",
    text: { body: text },
  };

  return sendToMeta(url, session.accessToken, payload, userId);
}

/**
 * Envio de TEMPLATE (início de conversa)
 */
export async function sendTemplateMessage(
  userId: string,
  to: string,
  templateName: string,
  components: any[] = [],
  languageCode: string = "pt_BR"
) {
  const session = await getWhatsappSession(userId);

  const url = `https://graph.facebook.com/v20.0/${session.phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: formatToE164(to),
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode
      },
      components
    }
  };

  return sendToMeta(url, session.accessToken, payload, userId);
}

/**
 * Função centralizada de envio para Meta
 */
async function sendToMeta(
  url: string,
  accessToken: string,
  payload: any,
  userId: string
) {
  try {
    console.log("=== ENVIO META ===");
    console.log("User:", userId);
    console.log("Payload:", JSON.stringify(payload));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Erro Meta API:", JSON.stringify(result, null, 2));

      const errorMessage =
        result?.error?.message ||
        "Erro desconhecido ao enviar mensagem";

      throw new Error(errorMessage);
    }

    const messageId = result?.messages?.[0]?.id;

    console.log("Mensagem enviada com sucesso.");
    console.log("Meta Message ID:", messageId);

    return {
      success: true,
      messageId,
      raw: result
    };

  } catch (error: any) {
    console.error("Erro ao enviar para Meta:", error?.message);
    throw error;
  }
}