
import { NextRequest, NextResponse } from "next/server";
import twilio from 'twilio';
import { db } from "../../../../../lib/firebaseAdmin";

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

// --- ANALISADOR DE DATA MANUAL (SUBSTITUI O CHRONO-NODE) ---
function manualParseBrazilianDate(input: string): Date | null {
    const nowInSP = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    let scheduledDate = new Date(nowInSP);

    // 1. Verifica por "Amanhã"
    if (input.match(/amanhã/i)) {
        scheduledDate.setDate(scheduledDate.getDate() + 1);
    }

    // 2. Extrai a hora (ex: "14h", "14:00")
    let hour = -1;
    let minute = 0;
    
    const timeRegexH = /(\d{1,2})h/i;
    const timeMatchH = input.match(timeRegexH);

    const timeRegexColon = /(\d{1,2}):(\d{2})/;
    const timeMatchColon = input.match(timeRegexColon);

    if (timeMatchH) {
        hour = parseInt(timeMatchH[1], 10);
    } else if (timeMatchColon) {
        hour = parseInt(timeMatchColon[1], 10);
        minute = parseInt(timeMatchColon[2], 10);
    }

    // 3. Se a hora foi encontrada, define no objeto de data. Senão, a análise falha.
    if (hour !== -1 && hour >= 0 && hour < 24) {
        scheduledDate.setHours(hour, minute, 0, 0); // Define H, M, S, MS
    } else {
        return null; // Indica falha ao analisar a hora
    }

    // 4. Se a data calculada for no passado (e "amanhã" não foi dito), avança para o dia seguinte.
    const finalNowInSP = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    if (scheduledDate < finalNowInSP && !input.match(/amanhã/i)) {
        scheduledDate.setDate(scheduledDate.getDate() + 1);
    }
    
    return scheduledDate;
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
                // LÓGICA DE DATA TOTALMENTE MANUAL. CHRONO-NODE REMOVIDO.
                const scheduledDate = manualParseBrazilianDate(message);

                if (!scheduledDate) {
                    await sendResponse(client, from, to, "Não consegui entender a data/hora. Por favor, tente um formato como \"Amanhã às 15h\" ou \"Hoje às 22:00\".", conversationRef);
                    break;
                }
                
                const scheduledMessage = conversationData?.scheduledMessage;

                await db.collection('scheduled_messages').add({
                    recipient: from,
                    message: scheduledMessage,
                    sendAt: scheduledDate,
                    status: 'scheduled',
                    createdAt: new Date()
                });

                await sendResponse(client, from, to, `Perfeito! Seu lembrete foi agendado para ${scheduledDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.`, conversationRef);
                await conversationRef.set({ state: 'INITIAL', lastUpdated: new Date() }, { merge: true });
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
