export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { sendMessage } from '@/lib/whatsapp'; // <-- IMPORTAÇÃO ATUALIZADA

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

// Rota para receber eventos do Webhook (POST)
export async function POST(request: NextRequest) {
  const body = await request.json();
  console.log('Evento bruto do webhook recebido:', JSON.stringify(body, null, 2));

  try {
    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message || message.type !== 'text') {
      console.log('Evento ignorado (não é uma mensagem de texto).');
      return new NextResponse(null, { status: 200 });
    }

    const from = message.from;
    const text = message.text.body;

    console.log(`MENSAGEM EXTRAÍDA -> De: ${from}, Texto: "${text}"`);

    // A lógica de "eco" continua funcionando como antes
    const responseText = `Recebemos sua mensagem: "${text}"`;
    await sendMessage(from, responseText);

  } catch (error) {
    console.error('Erro ao processar o webhook:', error);
  }

  return new NextResponse(null, { status: 200 });
}
