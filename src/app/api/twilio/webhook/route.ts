
import { NextRequest, NextResponse } from "next/server";
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// Função para parsear a requisição da Twilio
async function parseTwilioRequest(req: NextRequest) {
    const text = await req.text();
    const params = new URLSearchParams(text);
    const body: { [key: string]: string } = {};
    for (const [key, value] of params.entries()) {
        body[key] = value;
    }
    return body;
}

export async function POST(req: NextRequest) {
    try {
        // A inicialização do cliente permanece aqui para capturar erros de autenticação.
        const client = twilio(accountSid, authToken);

        const body = await parseTwilioRequest(req);
        const from = body.From; 
        const to = body.To;     
        const message = body.Body;

        console.log(`--- Mensagem Recebida: ${message} de ${from} ---`);

        const responseMessage = `Recebemos sua mensagem: "${message}". Esta é uma resposta automática.`;

        await client.messages.create({
            body: responseMessage,
            from: to, 
            to: from  
        });

        console.log(`--- Resposta enviada para ${from} ---`);
        
        // Responde 200 OK para a Twilio para confirmar o recebimento.
        return new NextResponse(null, { status: 200 });

    } catch (error: any) {
        console.error("### ERRO GRAVE no webhook da Twilio ###", error);

        // Bloco de erro final: não expõe detalhes ao usuário.
        // Envia uma mensagem TwiML genérica em caso de falha futura.
        const twiml = new twilio.twiml.MessagingResponse();
        twiml.message('Ocorreu um erro interno ao processar sua solicitação. Por favor, tente novamente mais tarde.');

        return new NextResponse(twiml.toString(), {
            status: 200, // Responde 200 para evitar que a Twilio reenvie a requisição.
            headers: { 'Content-Type': 'text/xml' },
        });
    }
}
