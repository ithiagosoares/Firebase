
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
        // Inicializa o cliente DENTRO do try, para capturar qualquer erro de inicialização
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
        
        return new NextResponse(null, { status: 200 });

    } catch (error: any) {
        console.error("### ERRO GRAVE no webhook da Twilio ###", error);

        // --- CORREÇÃO DA DEPURAÇÃO ---
        // Corrigido o erro de sintaxe adicionando a palavra 'new'.
        const errorMessage = error.message || 'Um erro desconhecido ocorreu.';
        const debugResponse = new twilio.twiml.MessagingResponse();
        debugResponse.message(`Erro no servidor: ${errorMessage}`);

        return new NextResponse(debugResponse.toString(), {
            status: 200, // Responde 200 para a Twilio não reenviar
            headers: { 'Content-Type': 'text/xml' },
        });
    }
}
