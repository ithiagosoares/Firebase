import { NextRequest, NextResponse } from "next/server";
import twilio from 'twilio';
import { db } from "../../../../../lib/firebaseAdmin";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// ---------------------------------------------------------------------------
// PARSE DA REQUISIÇÃO TWILIO
// ---------------------------------------------------------------------------
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
    await conversationRef.collection('messages').add({
        content,
        direction,
        timestamp: new Date()
    });
}

async function sendResponse(client: twilio.Twilio, to: string, from: string, message: string, conversationRef: FirebaseFirestore.DocumentReference) {
    await client.messages.create({ body: message, from, to });
    await logMessage(conversationRef, message, 'outbound');
}



// ============================================================================================
// ⏰ CORREÇÃO DEFINITIVA DO FUSO HORÁRIO — VERSÃO CONSOLIDADA
// ============================================================================================

// 🔥 Cria Data EXACTA no fuso horário de São Paulo, sem conversão automática do Node
function getBrazilDate(baseDate: Date, hour: number, minute: number, addDays = 0): Date {
    const fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });

    const parts = fmt.formatToParts(baseDate);
    const year = parts.find(p => p.type === "year")!.value;
    const month = parts.find(p => p.type === "month")!.value;
    const day = parts.find(p => p.type === "day")!.value;

    // 👇 CRIA UMA STRING ISO FIXA NO FUSO -03:00
    const iso = `${year}-${month}-${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00-03:00`;
    return new Date(iso);
}


// ============================================================================================
// 🧠 PARSER DE DATA EM PORTUGUÊS (ROBUSTO)
// ============================================================================================
function manualParseBrazilianDate(input: string): Date | null {
    let text = input.trim();

    // Normalização: remove acentos e múltiplos espaços
    text = text
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ");

    const now = new Date();

    const isTomorrow = /\bamanha\b/i.test(text);
    const isToday = /\bhoje\b/i.test(text);

    let addDay = isTomorrow ? 1 : 0;

    // Capturas possíveis:
    // 14h, 14hs, 14h00, 14:00, 9h, 9:30, etc.
    const h2 = text.match(/(\d{1,2})[:h](\d{2})/i);
    const h1 = text.match(/(\d{1,2})\s*(?:h|hs)\b/i);

    let hour = -1;
    let minute = 0;

    if (h2) {
        hour = Number(h2[1]);
        minute = Number(h2[2]);
    } else if (h1) {
        hour = Number(h1[1]);
    } else {
        return null; // Hora inválida
    }

    if (hour < 0 || hour > 23) return null;
    if (minute < 0 || minute > 59) return null;

    const date = getBrazilDate(now, hour, minute, addDay);

    // Verificar se já passou hoje
    const fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Sao_Paulo",
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: false
    });
    const parts = fmt.formatToParts(now);
    const curr = new Date(
        `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}-${parts.find(p => p.type === 'day')!.value}T${parts.find(p => p.type === 'hour')!.value}:${parts.find(p => p.type === 'minute')!.value}:${parts.find(p => p.type === 'second')!.value}-03:00`
    );

    if (date < curr && !isTomorrow) {
        return getBrazilDate(now, hour, minute, 1);
    }

    return date;
}



// ============================================================================================
// 🚀 ROTA PRINCIPAL
// ============================================================================================
export async function POST(req: NextRequest) {
    try {
        const client = twilio(accountSid, authToken);
        const body = await parseTwilioRequest(req);
        const from = body.From;
        const to = body.To;
        const message = body.Body?.trim();

        if (!from || !to || !message) {
            console.error("Requisição inválida recebida da Twilio:", body);
            return new NextResponse("Invalid request", { status: 400 });
        }

        const conversationRef = db.collection('conversations').doc(from);
        const conversationDoc = await conversationRef.get();

        await logMessage(conversationRef, message, 'inbound');

        const conversationData = conversationDoc.data() || {};
        let currentState = conversationData.state || 'INITIAL';

        switch (currentState) {

            case 'INITIAL':
                await sendResponse(
                    client, from, to,
                    "Olá! Sou seu assistente de agendamentos. Qual é a mensagem que você deseja agendar?",
                    conversationRef
                );
                await conversationRef.set({ state: 'AWAITING_MESSAGE_CONTENT', lastUpdated: new Date() }, { merge: true });
                break;

            case 'AWAITING_MESSAGE_CONTENT':
                await sendResponse(
                    client, from, to,
                    `Entendido. E para quando devo agendar o envio desta mensagem?\n(Ex: "Amanhã às 15h", "Hoje às 22:00")`,
                    conversationRef
                );

                await conversationRef.set({
                    state: 'AWAITING_SCHEDULE_TIME',
                    scheduledMessage: message,
                    lastUpdated: new Date()
                }, { merge: true });

                break;


            case 'AWAITING_SCHEDULE_TIME': {
                const scheduledDate = manualParseBrazilianDate(message);

                if (!scheduledDate) {
                    await sendResponse(
                        client, from, to,
                        "Não consegui entender a data/hora. Tente algo como: \"Amanhã às 15h\" ou \"Hoje às 22:00\".",
                        conversationRef
                    );
                    break;
                }

                const scheduledMessage = conversationData.scheduledMessage;

                if (!scheduledMessage) {
                    // fluxo corrompido
                    await conversationRef.set({ state: 'INITIAL' }, { merge: true });
                    await sendResponse(
                        client, from, to,
                        "Ocorreu um erro no fluxo. Vamos começar de novo. Qual mensagem deseja agendar?",
                        conversationRef
                    );
                    break;
                }

                await db.collection('scheduled_messages').add({
                    recipient: from,
                    message: scheduledMessage,
                    sendAt: scheduledDate,
                    status: 'scheduled',
                    createdAt: new Date()
                });

                await sendResponse(
                    client,
                    from,
                    to,
                    `Perfeito! Seu lembrete foi agendado para ${scheduledDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.`,
                    conversationRef
                );

                await conversationRef.set({
                    state: 'INITIAL',
                    scheduledMessage: null,
                    lastUpdated: new Date()
                }, { merge: true });

                break;
            }

            default:
                await conversationRef.set({ state: 'INITIAL' }, { merge: true });
                await sendResponse(client, from, to, "Fluxo reiniciado. Qual mensagem deseja agendar?", conversationRef);
        }

        return new NextResponse(null, { status: 200 });

    } catch (error: any) {
        console.error("### ERRO GRAVE no webhook da Twilio ###", error);

        const twiml = new twilio.twiml.MessagingResponse();
        twiml.message('Erro interno. A equipe já foi notificada.');

        return new NextResponse(twiml.toString(), {
            status: 200,
            headers: { "Content-Type": "text/xml" }
        });
    }
}
