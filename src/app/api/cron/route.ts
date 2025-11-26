
import { NextRequest, NextResponse } from "next/server";
import twilio from 'twilio';
import { db } from "../../../../../lib/firebaseAdmin";
import { Timestamp } from 'firebase-admin/firestore';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Rota para o CRON Job - Envia as mensagens agendadas
export async function GET(req: NextRequest) {
    // 1. VERIFICAÇÃO DE SEGURANÇA
    // Garante que a requisição venha do Cloud Scheduler
    if (req.headers.get('X-Appengine-Cron') !== 'true') {
        console.warn("Acesso não autorizado à rota CRON.");
        return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 });
    }

    const client = twilio(accountSid, authToken);
    const now = Timestamp.now(); // Pega a hora atual como um Timestamp do Firestore

    try {
        // 2. BUSCA NO FIRESTORE
        // Busca mensagens onde o tempo de envio é menor ou igual ao atual E o status é 'scheduled'
        const querySnapshot = await db.collection('scheduled_messages')
            .where('sendAt', '<=', now)
            .where('status', '==', 'scheduled')
            .get();

        if (querySnapshot.empty) {
            console.log("CRON: Nenhuma mensagem para enviar neste momento.");
            return NextResponse.json({ message: 'Nenhuma mensagem para enviar.' }, { status: 200 });
        }

        const promises = querySnapshot.docs.map(async (doc) => {
            const messageData = doc.data();
            const { recipient, message, from } = messageData;

            try {
                // 3. ENVIO VIA TWILIO
                await client.messages.create({
                    body: message,
                    to: recipient, // O número do destinatário
                    from: from || twilioPhoneNumber // O número da Twilio que enviará
                });

                // 4. ATUALIZAÇÃO DE STATUS
                await doc.ref.update({ status: 'sent' });
                console.log(`CRON: Mensagem enviada para ${recipient}`);

            } catch (error) {
                console.error(`CRON: Falha ao enviar ou atualizar mensagem ${doc.id}:`, error);
                await doc.ref.update({ status: 'failed' }); // Marca como falha para análise
            }
        });

        await Promise.all(promises);

        return NextResponse.json({ message: `${promises.length} mensagens processadas.` }, { status: 200 });

    } catch (error) {
        console.error("### ERRO GRAVE na função CRON ###", error);
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
    }
}
