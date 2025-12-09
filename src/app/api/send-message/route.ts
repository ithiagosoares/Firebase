
import { NextResponse } from 'next/server';

// TODO: REMOVER ESTE ARQUIVO APÓS A MIGRAÇÃO COMPLETA PARA A META API
// import { Twilio } from 'twilio';

export async function POST(request: Request) {
  return NextResponse.json({ message: "Endpoint desativado." });

  // // Move Twilio Client initialization and credential check inside the POST function
  // const getTwilioClient = () => {
  //   const accountSid = process.env.TWILIO_ACCOUNT_SID;
  //   const authToken = process.env.TWILIO_AUTH_TOKEN;

  //   if (!accountSid || !authToken) {
  //     throw new Error('As credenciais do Twilio não estão configuradas no ambiente.');
  //   }

  //   return new Twilio(accountSid, authToken);
  // };

  // try {
  //   const client = getTwilioClient();
  //   const { to, from, body } = await request.json();

  //   // Validate input
  //   if (!to || !from || !body) {
  //     return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
  //   }

  //   const message = await client.messages.create({
  //     to,
  //     from,
  //     body,
  //   });

  //   return NextResponse.json({ messageSid: message.sid });

  // } catch (error) {
  //   // Log the detailed error for debugging
  //   console.error("[API Send Message Error]", error);

  //   const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';

  //   // Return a structured error response
  //   return NextResponse.json({ error: 'Falha ao enviar mensagem', details: errorMessage }, { status: 500 });
  // }
}
