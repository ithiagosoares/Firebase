import { NextRequest, NextResponse } from "next/server";
import twilio from 'twilio';
import { db } from "../../../../lib/firebaseAdmin";
import { Timestamp } from 'firebase-admin/firestore';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// Rota para o CRON Job - Envia as mensagens agendadas
export async function GET(req: NextRequest) {
    // 1. 🔒 VALIDAÇÃO CORRETA DO CLOUD SCHEDULER
    const userAgent = req.headers.get("user-agent") || "";

    if (!userAgent.includes("Google-Cloud-Scheduler")) {
        console.warn("CRON BLOCKED → Acesso não autorizado (User-Agent incorreto).");
        return new Response("Acesso não autorizado", { status: 403 });
    }

    const client = twilio(accountSid, authToken);
    const now = Timestamp.now();

    try {
        // 2. Buscar todas as mensagens vencidas
        const querySnapshot = await db.collection('scheduled_messages')
            .where('sendAt', '<=', now)
            .where('status', '==', 'scheduled')
            .get();

        if (querySnapshot.empty) {
            console.log("CRON: Nenhuma mensagem para enviar agora.");
            return NextResponse.json({ message: 'Nenhuma mensagem para enviar.' }, { status: 200 });
        }

        const promises = querySnapshot.docs.map(async (doc) => {
            const data = doc.data();
            const { recipient, message, twilioNumber } = data;

            if (!twilioNumber) {
                console.error(`CRON: Documento ${doc.id} sem twilioNumber`);
                await doc.ref.update({ status: 'failed_missing_number' });
                return;
            }

            try {
                // 3. Envia a mensagem
                await client.messages.create({
                    body: message,
                    to: recipient,
                    from: twilioNumber
                });

                // 4. Atualiza o documento
                await doc.ref.update({ status: 'sent' });
                console.log(`CRON: Mensagem enviada → ${recipient}`);

            } catch (err) {
                console.error(`CRON ERRO: Falha no envio da mensagem ${doc.id}`, err);
                await doc.ref.update({ status: 'failed' });
            }
        });

        await Promise.all(promises);

        return NextResponse.json({ message: `${promises.length} mensagens processadas.` }, { status: 200 });

    } catch (error) {
        console.error("ERRO CRÍTICO no CRON:", error);
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
    }
}
