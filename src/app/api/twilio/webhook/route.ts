
import { NextRequest, NextResponse } from "next/server";

// TODO: REMOVER ESTE ARQUIVO APÓS A MIGRAÇÃO COMPLETA PARA A META API
// import twilio from 'twilio';
// import { db } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
    return NextResponse.json({ message: "Endpoint desativado." });

    // const formData = await req.formData();
    // const body = Object.fromEntries(formData.entries());

    // const twilioSignature = req.headers.get('X-Twilio-Signature') || '';

    // // Idealmente, você deve buscar o Auth Token de forma segura, por exemplo, do Firebase Secret Manager
    // const authToken = process.env.TWILIO_AUTH_TOKEN || '';

    // // Validar a requisição do Twilio
    // const isValid = twilio.validateRequest(authToken, twilioSignature, req.url, body);

    // if (!isValid) {
    //     return new NextResponse('Invalid Twilio Signature', { status: 401 });
    // }

    // // Processar a mensagem
    // const messageStatus = body.MessageStatus;
    // const messageSid = body.MessageSid;

    // console.log(`Message SID: ${messageSid}, Status: ${messageStatus}`);

    // try {
    //     // Atualizar o status da mensagem no Firestore
    //     const messagesQuery = db.collectionGroup('messages').where('sid', '==', messageSid);
    //     const querySnapshot = await messagesQuery.get();

    //     if (querySnapshot.empty) {
    //         console.log(`No message found with SID: ${messageSid}`);
    //         // Se a mensagem não for encontrada, ainda retornamos 200 para o Twilio não reenviar.
    //         return new NextResponse('Message not found, but acknowledged.', { status: 200 });
    //     }

    //     const batch = db.batch();
    //     querySnapshot.docs.forEach(doc => {
    //         const docRef = doc.ref;
    //         batch.update(docRef, { status: messageStatus });
    //         console.log(`Updating message ${doc.id} to status ${messageStatus}`);
    //     });

    //     await batch.commit();

    //     return new NextResponse('Webhook processed successfully.', { status: 200 });

    // } catch (error) {
    //     console.error('Error processing Twilio webhook:', error);
    //     return new NextResponse('Internal Server Error', { status: 500 });
    // }
}
