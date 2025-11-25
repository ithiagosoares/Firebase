
import { NextRequest, NextResponse } from "next/server";
import twilio from 'twilio';
import { db } from "../../../../../lib/firebaseAdmin";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// --- Funções Auxiliares (Sem alteração) ---
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
// ✅ INÍCIO DA CORREÇÃO DEFINITIVA (FORNECIDA PELO USUÁRIO)
// ============================================================================================

function getBrazilDate(baseDate: Date, hour: number, minute: number, addDays = 0): Date {
    const fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });

    const parts = fmt.formatToParts(baseDate);
    const year = Number(parts.find(p => p.type === "year")!.value);
    const month = Number(parts.find(p => p.type === "month")!.value);
    const day = Number(parts.find(p => p.type === "day")!.value);

    // new Date() com componentes cria a data no fuso horário local do servidor.
    // Como os componentes (ano, mês, dia) foram extraídos de SP, a data final
    // representará o momento correto, que o Firestore converterá para UTC.
    return new Date(year, month - 1, day + addDays, hour, minute, 0, 0);
}


function manualParseBrazilianDate(text: string): Date | null {
    const now = new Date();
    let addDay = /amanhã/i.test(text) ? 1 : 0;

    const h1 = text.match(/(\d{1,2})h/);
    const h2 = text.match(/(\d{1,2}):(\d{2})/);

    let hour = -1;
    let minute = 0;

    if (h1) {
        hour = Number(h1[1]);
    } else if (h2) {
        hour = Number(h2[1]);
        minute = Number(h2[2]);
    } else {
        return null; // Formato de hora inválido
    }

    if (hour < 0 || hour > 23) return null;

    const date = getBrazilDate(now, hour, minute, addDay);

    // Se a data/hora calculada já passou no fuso de SP e o usuário NÃO disse "amanhã",
    // automaticamente agendamos para o dia seguinte.
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Sao_Paulo",
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: false
    });
    const parts = formatter.formatToParts(now);
    const get = (type: any) => parts.find(p => p.type === type)!.value;
    const nowInSaoPaulo = new Date(`${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`);

    if (date < nowInSaoPaulo && addDay === 0) {
        return getBrazilDate(now, hour, minute, 1);
    }

    return date;
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
                await sendResponse(client, from, to, `Entendido. E para quando devo agendar o envio desta mensagem?\n(Ex: "Amanhã às 15h", "Hoje às 22:00")`, conversationRef);
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
