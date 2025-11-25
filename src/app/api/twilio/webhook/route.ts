
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

// ============================================================================================
// ✅ INÍCIO DA CORREÇÃO DEFINITIVA (BASEADA NA ANÁLISE EXTERNA)
// ============================================================================================

// Esta função cria um objeto Date que representa o momento *exato* em São Paulo,
// independentemente do fuso horário do servidor onde o código está rodando.
// Ela faz isso construindo uma string ISO 8601 com o offset explícito (-03:00).
function nowInSaoPaulo() {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false // Garante o formato 24h
    });

    const parts = formatter.formatToParts(new Date());
    const get = (type: string) => parts.find(p => p.type === type)!.value;

    // Constrói a data com offset explícito para remover qualquer ambiguidade.
    // O JavaScript vai interpretar isso corretamente para o UTC interno do objeto Date.
    const dateString = `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}-03:00`;
    
    return new Date(dateString);
}


function manualParseBrazilianDate(input: string): Date | null {
    // Começamos com a data/hora *real* de São Paulo
    let scheduledDate = nowInSaoPaulo();

    // --- 1. Verifica se o agendamento é para "Amanhã" ---
    const isTomorrow = /amanhã/i.test(input);
    if (isTomorrow) {
        scheduledDate.setDate(scheduledDate.getDate() + 1);
    }

    // --- 2. Extrai a hora e minuto da mensagem ---
    let hour = -1;
    let minute = 0;

    const hMatch = input.match(/(\d{1,2})h/i);
    const colonMatch = input.match(/(\d{1,2}):(\d{2})/);

    if (hMatch) {
        hour = parseInt(hMatch[1], 10);
    } else if (colonMatch) {
        hour = parseInt(colonMatch[1], 10);
        minute = parseInt(colonMatch[2], 10);
    } else {
        // Se não encontrar um padrão de hora, a entrada é inválida
        return null;
    }

    if (hour < 0 || hour > 23) return null;

    // Define a hora e minuto na data de agendamento, zerando segundos.
    scheduledDate.setHours(hour, minute, 0, 0);

    // --- 3. Lógica de segurança: Se o horário resultante já passou HOJE e o usuário NÃO disse "amanhã",
    // assume-se que ele quis dizer o dia seguinte.
    const nowAfterSettingHour = nowInSaoPaulo();
    if (scheduledDate < nowAfterSettingHour && !isTomorrow) {
        scheduledDate.setDate(scheduledDate.getDate() + 1);
    }

    return scheduledDate;
}

// ============================================================================================
// ✅ FIM DA CORREÇÃO
// ============================================================================================


// Rota principal
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
                const scheduledDate = manualParseBrazilianDate(message);

                if (!scheduledDate) {
                    await sendResponse(client, from, to, "Não consegui entender a data/hora. Por favor, tente um formato como \"Amanhã às 15h\" ou \"Hoje às 22:00\".", conversationRef);
                    break;
                }
                
                const scheduledMessage = conversationData?.scheduledMessage;

                await db.collection('scheduled_messages').add({
                    recipient: from,
                    message: scheduledMessage,
                    sendAt: scheduledDate, // Agora `scheduledDate` é um objeto Date com o valor UTC correto
                    status: 'scheduled',
                    createdAt: new Date()
                });

                await sendResponse(client, from, to, `Perfeito! Seu lembrete foi agendado para ${scheduledDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.`, conversationRef);
                await conversationRef.set({ state: 'INITIAL', lastUpdated: new Date() }, { merge: true });
                break;

            default:
                await sendResponse(client, from, to, "Ocorreu um erro no nosso fluxo de conversa. Reiniciando...", conversationRef);
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
