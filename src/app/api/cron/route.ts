
import { NextRequest, NextResponse } from "next/server";
import twilio from 'twilio';
import { db } from "../../../../../lib/firebaseAdmin";
import { Timestamp } from 'firebase-admin/firestore';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// Rota para o CRON Job - Envia as mensagens agendadas
export async function GET(req: NextRequest) {
    // 1. ✅ VERIFICAÇÃO DE SEGURANÇA (SUGERIDA PELO USUÁRIO)
    // Verificando o User-Agent que o Google Cloud Scheduler envia por padrão.
    if (req.headers.get('user-agent') !== 'Google-Cloud-Scheduler') {
        console.warn("CRON: Acesso não autorizado (User-Agent inválido).");
        return new Response('Acesso não autorizado', { status: 403 });
    }

    const client = twilio(accountSid, authToken);
    const now = Timestamp.now();

    try {
        // 2. BUSCA NO FIRESTORE
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
            const { recipient, message, twilioNumber } = messageData;

            if (!twilioNumber) {
                console.error(`CRON: Mensagem ${doc.id} não possui 'twilioNumber'. Pulando.`);
                await doc.ref.update({ status: 'failed_missing_number' });
                return;
            }

            try {
                // 3. ENVIO VIA TWILIO
                await client.messages.create({
                    body: message,
                    to: recipient,
                    from: twilioNumber
                });

                // 4. ATUALIZAÇÃO DE STATUS
                await doc.ref.update({ status: 'sent' });
                console.log(`CRON: Mensagem enviada para ${recipient}`);

            } catch (error) {
                console.error(`CRON: Falha ao enviar ou atualizar mensagem ${doc.id}:`, error);
                await doc.ref.update({ status: 'failed' });
            }
        });

        await Promise.all(promises);

        return NextResponse.json({ message: `${promises.length} mensagens processadas.` }, { status: 200 });

    } catch (error) {
        console.error("### ERRO GRAVE na função CRON ###", error);
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
    }
}
