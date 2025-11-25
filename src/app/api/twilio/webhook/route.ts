
import { NextRequest, NextResponse } from "next/server";
import twilio from 'twilio';
import { db } from "../../../../../lib/firebaseAdmin";
import { pt } from 'chrono-node'; // Importando o tradutor de datas para Português

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// --- Funções Auxiliares ---
async function parseTwilioRequest(req: NextRequest) {
    const text = await req.text();
    const params = new URLSearchParams(text);
    const body: { [key: string]: string } = {};
    for (const [key, value] of params.entries()) {
        body[key] = value;
    }
    return body;
}

async function logMessage(conversationRef: FirebaseFirestore.DocumentReference, content: string, direction: 'inbound' | 'outbound') {
    await conversationRef.collection('messages').add({ content, direction, timestamp: new Date() });
}

async function sendResponse(client: twilio.Twilio, to: string, from: string, message: string, conversationRef: FirebaseFirestore.DocumentReference) {
    await client.messages.create({ body: message, from, to });
    await logMessage(conversationRef, message, 'outbound');
}
// ------------------------

export async function POST(req: NextRequest) {
    try {
        const client = twilio(accountSid, authToken);
        const body = await parseTwilioRequest(req);
        const from = body.From;
        const to = body.To;
        const message = body.Body;

        const conversationRef = db.collection('conversations').doc(from);
        const conversationDoc = await conversationRef.get();

        await logMessage(conversationRef, message, 'inbound');

        const conversationData = conversationDoc.data();
        let currentState = conversationDoc.exists ? conversationData?.state : 'INITIAL';

        switch (currentState) {
            case 'INITIAL':
                await sendResponse(client, from, to, "Olá! Sou seu assistente de agendamentos. Qual é a mensagem que você deseja agendar?", conversationRef);
                await conversationRef.set({ state: 'AWAITING_MESSAGE_CONTENT', lastUpdated: new Date() });
                break;

            case 'AWAITING_MESSAGE_CONTENT':
                const messageContent = message;
                await sendResponse(client, from, to, `Entendido. E para quando devo agendar o envio desta mensagem?\n(Ex: "Amanhã às 15h", "27/11/2025 15:00")`, conversationRef);
                await conversationRef.set({ state: 'AWAITING_SCHEDULE_TIME', scheduledMessage: messageContent, lastUpdated: new Date() }, { merge: true });
                break;

            case 'AWAITING_SCHEDULE_TIME':
                const scheduleTimeInput = message;
                const scheduledDate = pt.parseDate(scheduleTimeInput, new Date(), { forwardDate: true });

                if (!scheduledDate) {
                    await sendResponse(client, from, to, "Não consegui entender essa data. Por favor, tente um formato como \"Amanhã às 15h\" ou \"27/11/2025 15:00\".", conversationRef);
                    break;
                }

                const scheduledMessage = conversationData?.scheduledMessage;

                // Criando o agendamento na coleção que o seu Cron Job irá ler
                await db.collection('scheduled_messages').add({
                    recipient: from,       // Número do WhatsApp do usuário
                    message: scheduledMessage, // A mensagem que coletamos no passo anterior
                    sendAt: scheduledDate,   // A data/hora exata que o chrono-node traduziu
                    status: 'scheduled',      // Status inicial do agendamento
                    createdAt: new Date()
                });

                await sendResponse(client, from, to, `Perfeito! Seu lembrete foi agendado para ${scheduledDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.`, conversationRef);
                await conversationRef.set({ state: 'INITIAL', lastUpdated: new Date() }, { merge: true }); // Reinicia o fluxo
                break;

            default:
                await sendResponse(client, from, to, "Ocorreu um erro no nosso fluxo de conversa. Reiniciando... Qual é a mensagem que você deseja agendar?", conversationRef);
                await conversationRef.set({ state: 'AWAITING_MESSAGE_CONTENT' });
                break;
        }

        return new NextResponse(null, { status: 200 });

    } catch (error: any) {
        console.error("### ERRO GRAVE no webhook da Twilio ###", error);
        const twiml = new twilio.twiml.MessagingResponse();
        twiml.message('Ocorreu um erro interno. Nossa equipe já foi notificada.');
        return new NextResponse(twiml.toString(), { status: 200, headers: { 'Content-Type': 'text/xml' } });
    }
}
