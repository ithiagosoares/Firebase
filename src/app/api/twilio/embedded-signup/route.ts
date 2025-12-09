
import { NextRequest, NextResponse } from "next/server";

// TODO: REMOVER ESTE ARQUIVO APÓS A MIGRAÇÃO COMPLETA PARA A META API
// import { getFirebaseAdminApp } from "@/lib/firebase-admin";
// import { getFirestore } from "firebase-admin/firestore";
// import twilio from 'twilio';

export async function POST(req: NextRequest) {
    return NextResponse.json({ message: "Endpoint desativado." });
    // const { clinicId, twilioAccountSid, twilioAuthToken, twilioPhoneNumber } = await req.json();

    // if (!clinicId || !twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    //     return NextResponse.json({ error: 'Parâmetros ausentes.' }, { status: 400 });
    // }

    // const adminApp = getFirebaseAdminApp();
    // const db = getFirestore(adminApp);

    // try {
    //     // Validação das credenciais com a API da Twilio
    //     const client = twilio(twilioAccountSid, twilioAuthToken);
    //     await client.api.v2010.accounts(twilioAccountSid).fetch();

    //     // Armazenamento das credenciais no Firestore
    //     await db.collection('twilio_credentials').doc(clinicId).set({
    //         accountSid: twilioAccountSid,
    //         authToken: twilioAuthToken, // Considere criptografar este token
    //         fromNumber: twilioPhoneNumber,
    //         createdAt: new Date(),
    //     });

    //     // Atualização do status da clínica
    //     await db.collection('clinics').doc(clinicId).update({
    //         twilio_configured: true
    //     });

    //     return NextResponse.json({ message: 'Credenciais Twilio configuradas com sucesso!' });
    // } catch (error) {
    //     console.error('Erro ao validar ou salvar credenciais Twilio:', error);

    //     if (error.status === 401) {
    //         return NextResponse.json({ error: 'Credenciais Twilio inválidas.' }, { status: 401 });
    //     }

    //     return NextResponse.json({ error: 'Erro interno ao processar sua solicitação.' }, { status: 500 });
    // }
}
