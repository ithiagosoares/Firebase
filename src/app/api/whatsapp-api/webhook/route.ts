export const runtime = 'nodejs'; // Força o runtime do Node.js para garantir acesso ao process.env

import { NextRequest, NextResponse } from 'next/server';

// Rota de verificação do Webhook da Meta (GET)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    console.log('Webhook da Meta verificado com sucesso!');
    return new NextResponse(challenge, { status: 200 });
  } else {
    console.error('Falha na verificação do Webhook da Meta.');
    return new NextResponse(null, { status: 403 });
  }
}

// ===== NOVA FUNÇÃO: ENVIAR MENSAGENS =====
// Esta função se conecta à API da Meta para enviar uma mensagem.
async function sendMessage(to: string, text: string) {
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
      console.error('Erro ao enviar mensagem de resposta via WhatsApp:', JSON.stringify(result, null, 2));
    } else {
      console.log('Mensagem de resposta enviada com sucesso:', result);
    }
  } catch (error) {
    console.error('Erro de rede ou fetch ao tentar enviar mensagem:', error);
  }
}


// Rota para receber eventos do Webhook (POST)
// Forçando um novo deploy para carregar os segredos atualizados.
export async function POST(request: NextRequest) {
  const body = await request.json();
  console.log('Evento bruto do webhook recebido:', JSON.stringify(body, null, 2));

  try {
    // ETAPA 1: EXTRAIR AS INFORMAÇÕES DA MENSAGEM
    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message || message.type !== 'text') {
      console.log('Evento ignorado (não é uma mensagem de texto).');
      return new NextResponse(null, { status: 200 });
    }

    const from = message.from; // Número de telefone de quem enviou.
    const text = message.text.body; // O conteúdo da mensagem.

    console.log(`MENSAGEM EXTRAÍDA -> De: ${from}, Texto: \"${text}\"`);

    // ETAPA 2: LÓGICA DE NEGÓCIO E RESPOSTA
    
    // Para testar, vamos criar um \"eco\". O sistema responderá com o que recebeu.
    const responseText = `Recebemos sua mensagem: \"${text}\"`;
    
    // Chama a função para enviar a resposta de volta ao usuário
    await sendMessage(from, responseText);

  } catch (error) {
    console.error('Erro ao processar o webhook:', error);
    return new NextResponse(null, { status: 200 });
  }

  // ETAPA 3: CONFIRMAR RECEBIMENTO
  return new NextResponse(null, { status: 200 });
}
