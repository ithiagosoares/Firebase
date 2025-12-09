
import { NextResponse } from "next/server";

// TODO: REMOVER ESTE ARQUIVO APÓS A MIGRAÇÃO COMPLETA PARA A META API
// import { getFirebaseAdminApp } from "@/lib/firebase-admin";
// import { getFirestore } from "firebase-admin/firestore";
// import twilio from "twilio";

export async function POST(request: Request) {
    return NextResponse.json({ message: "Endpoint desativado." });
    // try {
    //     // Extrair o ID do usuário da Clerk (exemplo, ajuste conforme necessário)
    //     const { userId } = await request.json(); // Supondo que o ID do usuário seja enviado no corpo da requisição

    //     if (!userId) {
    //         return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    //     }

    //     const firestore = getFirestore(getFirebaseAdminApp());

    //     // Obter as credenciais do Twilio do Firestore
    //     const credentialsDoc = await firestore.collection('twilio_credentials').doc(userId).get();
    //     if (!credentialsDoc.exists) {
    //         return NextResponse.json({ error: "Twilio credentials not found for this user" }, { status: 404 });
    //     }
    //     const credentials = credentialsDoc.data();
    //     const accountSid = credentials.accountSid;
    //     const authToken = credentials.authToken;

    //     const client = twilio(accountSid, authToken);

    //     // Este é um exemplo de como você pode usar o cliente Twilio.
    //     // A funcionalidade específica de "embedded signup" pode exigir uma lógica diferente.
    //     // O código abaixo é um placeholder para demonstrar o uso do cliente.

    //     // Exemplo: Listar números de telefone associados à conta
    //     const phoneNumbers = await client.incomingPhoneNumbers.list({ limit: 5 });

    //     return NextResponse.json({
    //         message: "Successfully authenticated with Twilio and fetched phone numbers.",
    //         phoneNumbers: phoneNumbers.map(p => p.phoneNumber)
    //     });

    // } catch (error) {
    //     console.error("Error in Twilio embedded signup:", error);
    //     const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    //     return NextResponse.json({ error: "Internal Server Error", details: errorMessage }, { status: 500 });
    // }
}
