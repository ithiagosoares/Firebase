
import { NextRequest, NextResponse } from 'next/server';
// TODO: REMOVER ESTE ARQUIVO APÓS A MIGRAÇÃO COMPLETA PARA A META API
// import { getFirestore } from 'firebase-admin/firestore';
// import { getFirebaseAdminApp } from '@/lib/firebase-admin';
// import twilio from 'twilio';

export async function POST(req: NextRequest) {
    return NextResponse.json({ message: "Endpoint desativado." });
    // const adminApp = getFirebaseAdminApp();
    // const db = getFirestore(adminApp);

    // const formData = await req.formData();
    // const messageSid = formData.get('MessageSid') as string;
    // const messageStatus = formData.get('MessageStatus') as string;
    // const to = formData.get('To') as string;

    // console.log(`Webhook recebido: SID ${messageSid}, Status ${messageStatus}`);

    // if (!messageSid || !messageStatus || !to) {
    //     return NextResponse.json({ error: 'Dados incompletos no webhook' }, { status: 400 });
    // }

    // try {
    //     const clinicsSnapshot = await db.collection('clinics').where('twilio_configured', '==', true).get();
    //     let clinicId = null;

    //     for (const doc of clinicsSnapshot.docs) {
    //         const credentialsDoc = await db.collection('twilio_credentials').doc(doc.id).get();
    //         if (credentialsDoc.exists() && credentialsDoc.data().fromNumber === to) {
    //             clinicId = doc.id;
    //             break;
    //         }
    //     }

    //     if (!clinicId) {
    //         console.error(`Nenhuma clínica encontrada para o número: ${to}`);
    //         return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 });
    //     }

    //     const messagesQuery = await db.collectionGroup('messages').where('sid', '==', messageSid).get();

    //     if (messagesQuery.empty) {
    //         console.error(`Mensagem com SID ${messageSid} não encontrada.`);
    //         return NextResponse.json({ error: 'Mensagem não encontrada' }, { status: 404 });
    //     }

    //     const messageDoc = messagesQuery.docs[0];
    //     await messageDoc.ref.update({ status: messageStatus });

    //     console.log(`Status da mensagem ${messageSid} atualizado para ${messageStatus}`);

    //     const response = new NextResponse('<Response/>', {
    //         headers: { 'Content-Type': 'text/xml' },
    //     });
    //     return response;

    // } catch (error) {
    //     console.error('Erro ao processar webhook da Twilio:', error);
    //     return new NextResponse('Erro interno do servidor', { status: 500 });
    // }
}
