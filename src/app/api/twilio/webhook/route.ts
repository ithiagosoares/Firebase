
import { NextRequest, NextResponse } from "next/server";
import twilio from 'twilio';
import { db } from "../../../../../lib/firebaseAdmin"; // Importando nossa configuração do Firestore

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

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
        const client = twilio(accountSid, authToken);
        const body = await parseTwilioRequest(req);
        const from = body.From; 
        const to = body.To;     
        const message = body.Body;

        // --- NOVO: SALVANDO A MENSAGEM NO BANCO DE DADOS ---
        // O número de telefone (From) será o ID do nosso documento de conversa.
        const conversationRef = db.collection('conversations').doc(from);
        await conversationRef.collection('messages').add({
            content: message,
            direction: 'inbound',
            timestamp: new Date(),
        });
        // -----------------------------------------------------

        const responseMessage = `Recebemos sua mensagem: "${message}". Esta é uma resposta automática. (DB test)`;

        await client.messages.create({
            body: responseMessage,
            from: to, 
            to: from  
        });

        // Salvando a resposta no banco de dados
        await conversationRef.collection('messages').add({
            content: responseMessage,
            direction: 'outbound',
            timestamp: new Date(),
        });
        
        return new NextResponse(null, { status: 200 });

    } catch (error: any) {
        console.error("### ERRO GRAVE no webhook da Twilio ###", error);

        const twiml = new twilio.twiml.MessagingResponse();
        twiml.message('Ocorreu um erro interno ao processar sua solicitação.');

        return new NextResponse(twiml.toString(), {
            status: 200,
            headers: { 'Content-Type': 'text/xml' },
        });
    }
}
