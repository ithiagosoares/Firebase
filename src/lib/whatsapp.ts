
// Esta função se conecta à API da Meta para enviar uma mensagem.
export async function sendMessage(to: string, text: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.error("ERRO CRÍTICO: As variáveis de ambiente WHATSAPP_PHONE_NUMBER_ID ou WHATSAPP_ACCESS_TOKEN não estão configuradas. A mensagem não pode ser enviada.");
    return;
  }

  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
  
  const payload = {
    messaging_product: "whatsapp",
    to: to,
    type: "text",
    text: { body: text },
  };

  try {
    console.log(`ENVIANDO MENSAGEM -> Para: ${to}, Texto: "${text}"`);

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
      console.error('Erro ao enviar mensagem via WhatsApp:', JSON.stringify(result, null, 2));
      throw new Error(`Falha ao enviar mensagem: ${result.error?.message || 'Erro desconhecido'}`);
    } else {
      console.log('Mensagem enviada com sucesso:', result);
      return result;
    }
  } catch (error) {
    console.error('Erro de rede ou fetch ao tentar enviar mensagem:', error);
    throw error;
  }
}
