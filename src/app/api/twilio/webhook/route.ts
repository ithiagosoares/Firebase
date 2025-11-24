
import { NextRequest, NextResponse } from "next/server";
import twilio from 'twilio';

// Inicializa o cliente Twilio com as credenciais do ambiente
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
// A inicialização do cliente pode falhar se as env vars não estiverem presentes
let client: twilio.Twilio;
try {
    client = twilio(accountSid, authToken);
} catch (error: any) {
    console.error("### ERRO AO INICIALIZAR CLIENTE TWILIO ###", error);
    // Se a inicialização falhar, não podemos continuar
}


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
        // Verifica se o cliente foi inicializado
        if (!client) {
            throw new Error('Cliente Twilio não inicializado. Verifique as variáveis de ambiente TWILIO_ACCOUNT_SID e TWILIO_AUTH_TOKEN.');
        }

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
        
        return new NextResponse(null, { status: 200 });

    } catch (error: any) {
        console.error("### ERRO GRAVE no webhook da Twilio ###", error);

        // --- DEPURAÇÃO --- 
        // Envia o erro real de volta via WhatsApp para podermos vê-lo.
        const errorMessage = error.message || 'Um erro desconhecido ocorreu.';
        const debugResponse = twilio.twiml.MessagingResponse();
        debugResponse.message(`Erro no servidor: ${errorMessage}`);

        return new NextResponse(debugResponse.toString(), {
            status: 200, // Respondemos 200 para a Twilio não reenviar
            headers: { 'Content-Type': 'text/xml' },
        });
    }
}
