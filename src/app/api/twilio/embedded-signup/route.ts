
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getFirebaseAdminApp } from "@/lib/firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import twilio from "twilio";

export async function POST(request: Request) {
    try {
        // MOVIDO PARA DENTRO: Garante que qualquer erro de inicialização seja capturado.
        const adminApp = getFirebaseAdminApp();
        const db = getFirestore(adminApp);

        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
        }

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const callbackUrl = `${process.env.NEXT_PUBLIC_URL}/api/twilio/callback`;

        if (!accountSid || !authToken || !callbackUrl) {
            console.error("CRÍTICO: Credenciais da Twilio ou URL da aplicação não estão definidas no ambiente.");
            return NextResponse.json({ error: "O serviço de conexão não está configurado corretamente no servidor." }, { status: 500 });
        }

        const twilioClient = twilio(accountSid, authToken);

        const subaccount = await twilioClient.api.v2010.accounts.create({
            friendlyName: `Subconta para ${userId}`,
        });

        console.log(`Subconta criada: ${subaccount.sid} para o usuário ${userId}`);

        const userDocRef = db.doc(`clinics/${userId}`);
        await userDocRef.set({ 
            twilioSubaccountSid: subaccount.sid,
            isTwilioConnected: false
        }, { merge: true });

        const fullCallbackUrl = `${callbackUrl}?subaccountSid=${subaccount.sid}`;

        const encodedUrl = new URL("https://www.twilio.com/console/signup/embedded");
        encodedUrl.searchParams.append("frameUrl", fullCallbackUrl);
        encodedUrl.searchParams.append("gated", "true");

        return NextResponse.json({ signupUrl: encodedUrl.toString() });

    } catch (error: any) {
        console.error("### ERRO NO ENDPOINT /api/twilio/embedded-signup ###:", error);
        return NextResponse.json(
            { 
                error: "Ocorreu um erro ao tentar criar la conexión com a Twilio.",
                details: error.message 
            },
            { status: 500 }
        );
    }
}
