import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { db } from "../../../../lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

/**
 * CRON protegido para envio de mensagens agendadas
 */
export async function GET(request: NextRequest) {
    // 1. 🚨 Autorização obrigatória via cabeçalho x-cron-secret
    const secret = request.headers.get("x-cron-secret");

    if (secret !== process.env.CRON_SECRET) {
        console.warn("CRON: tentativa de acesso sem autorização");
        return new Response("Acesso não autorizado", { status: 401 });
    }

    const client = twilio(accountSid, authToken);
    const now = Timestamp.now();

    try {
        const querySnapshot = await db
            .collection("scheduled_messages")
            .where("sendAt", "<=", now)
            .where("status", "==", "scheduled")
            .get();

        if (querySnapshot.empty) {
            return NextResponse.json(
                { message: "Nenhuma mensagem para enviar." },
                { status: 200 }
            );
        }

        const promises = querySnapshot.docs.map(async (doc) => {
            const data = doc.data();
            const { recipient, message, twilioNumber } = data;

            if (!twilioNumber) {
                await doc.ref.update({ status: "failed_missing_number" });
                return;
            }

            try {
                await client.messages.create({
                    body: message,
                    to: recipient,
                    from: twilioNumber,
                });

                await doc.ref.update({ status: "sent" });
            } catch (error) {
                console.error(`Erro ao enviar mensagem ${doc.id}:`, error);
                await doc.ref.update({ status: "failed" });
            }
        });

        await Promise.all(promises);

        return NextResponse.json(
            { message: `${promises.length} mensagens processadas.` },
            { status: 200 }
        );
    } catch (err) {
        console.error("ERRO NO CRON:", err);
        return NextResponse.json(
            { error: "Erro interno no servidor" },
            { status: 500 }
        );
    }
}
