
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

// Rota para receber eventos do Webhook (POST)
export async function POST(request: NextRequest) {
  const body = await request.json();
  console.log('Evento do webhook recebido:', JSON.stringify(body, null, 2));
  
  // Aqui você pode adicionar a lógica para processar o evento do webhook.
  // Por exemplo, salvar no banco de dados, chamar outra API, etc.
  // A dependência @google-cloud/storage está disponível se você precisar usá-la.

  return new NextResponse(null, { status: 200 });
}
