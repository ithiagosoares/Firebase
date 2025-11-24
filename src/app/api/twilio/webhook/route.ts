
import { NextRequest, NextResponse } from "next/server";
import twilio from 'twilio';

// Inicializa o cliente Twilio com as credenciais do ambiente
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

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
        const body = await parseTwilioRequest(req);

        // Extrai as informações da mensagem recebida
        const from = body.From; // O número do paciente
        const to = body.To;     // O nosso número da Twilio
        const message = body.Body; // A mensagem do paciente

        console.log(`--- Mensagem Recebida da Twilio ---`);
        console.log(`De: ${from}`);
        console.log(`Mensagem: "${message}"`);
        console.log(`---------------------------------`);

        // --- LÓGICA DE RESPOSTA ---
        // Aqui é onde a "inteligência" do seu app vai entrar no futuro.
        // Por agora, vamos apenas confirmar o recebimento.
        const responseMessage = `Recebemos sua mensagem: "${message}". Esta é uma resposta automática.`;

        await client.messages.create({
            body: responseMessage,
            from: to, // Envia A PARTIR do nosso número Twilio
            to: from  // Envia PARA o número do paciente
        });

        console.log(`--- Resposta Enviada ---`);
        console.log(`Para: ${from}`);
        console.log(`Mensagem: "${responseMessage}"`);
        console.log(`------------------------`);
        
        // Responde à Twilio que tudo correu bem.
        return new NextResponse(null, { status: 200 });

    } catch (error) {
        console.error("### ERRO GRAVE no webhook da Twilio ###", error);
        // Mesmo com erro, é bom responder 200 para a Twilio não ficar reenviando
        // a mesma requisição e causando mais erros em loop.
        return new NextResponse('Erro interno ao processar a mensagem.', { status: 200 });
    }
}
