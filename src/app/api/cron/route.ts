import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { Patient, ScheduledMessage, WithId } from '@/lib/types';
import { sendTemplateMessage } from '@/lib/whatsapp';
import { defaultTemplates } from '@/data/defaultTemplates';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');

  if (authorization !== `Bearer ${cronSecret}`) {
    return new NextResponse('Não autorizado', { status: 401 });
  }

  const firestoreDb = db();

  try {
    const now = Timestamp.now();

    const querySnapshot = await firestoreDb
      .collection('scheduledMessages')
      .where('status', '==', 'Agendado') // ✅ CORRIGIDO
      .where('sendAt', '<=', now)
      .get();

    if (querySnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: 'Nenhuma mensagem para enviar.'
      });
    }

    console.log(`CRON: ${querySnapshot.size} mensagem(ns) encontrada(s).`);

    const processingPromises = querySnapshot.docs.map(async (doc) => {
      const messageRef = doc.ref;

      try {
        // 🔐 LOCK TRANSACIONAL (evita duplicação)
        const lockedMessage = await firestoreDb.runTransaction(async (transaction) => {
          const freshDoc = await transaction.get(messageRef);
        
          if (!freshDoc.exists) {
            throw new Error('Documento não existe.');
          }
        
          const data = freshDoc.data() as ScheduledMessage;
        
          if (data.status !== 'Agendado') {
            return null;
          }
        
          transaction.update(messageRef, {
            status: 'Processando',
            processingAt: Timestamp.now()
          });
        
          // ✅ CORREÇÃO AQUI
          return { ...data, id: freshDoc.id };
        });
        

        if (!lockedMessage) {
          console.log(`CRON: Mensagem ${doc.id} já processada por outro worker.`);
          return;
        }

        const message = lockedMessage as WithId<ScheduledMessage>;

        // 🔎 Busca paciente
        const patientDoc = await firestoreDb
          .doc(`users/${message.userId}/patients/${message.patientId}`)
          .get();

        if (!patientDoc.exists) {
          throw new Error(`Paciente ${message.patientId} não encontrado.`);
        }

        const patient = patientDoc.data() as Patient;

        // 🔎 Busca clínica
        const userDoc = await firestoreDb
          .collection('users')
          .doc(message.userId)
          .get();

        const clinicName = userDoc.data()?.clinicName || "Sua Clínica";

        // 🔎 Resolve template
        let templateName = message.templateId;

        const defaultTemp = defaultTemplates.find(
          t => t.name === message.templateId
        );

        if (!defaultTemp) {
          const templateDoc = await firestoreDb
            .doc(`users/${message.userId}/messageTemplates/${message.templateId}`)
            .get();

          if (templateDoc.exists) {
            templateName =
              templateDoc.data()?.name ||
              templateDoc.data()?.title;
          }
        }

        // 🧱 Monta componentes
        const components = [
          {
            type: "body",
            parameters: [
              { type: "text", text: patient.name },
              { type: "text", text: clinicName }
            ]
          }
        ];

        // 🚀 Envia para Meta
        await sendTemplateMessage(
          message.userId,
          patient.phone,
          templateName,
          components
        );

        // ✅ Marca como Enviado
        await messageRef.update({
          status: 'Enviado',
          sentAt: Timestamp.now()
        });

        console.log(`CRON: Mensagem ${message.id} enviada.`);

      } catch (error: any) {
        console.error(`CRON: Falha msg ${doc.id}:`, error.message);

        await messageRef.update({
          status: 'Falhou',
          error: error.message,
          failedAt: Timestamp.now()
        });
      }
    });

    await Promise.all(processingPromises);

    return NextResponse.json({
      success: true,
      processed: querySnapshot.size
    });

  } catch (error: any) {
    console.error('CRON: Erro crítico.', error);

    return new NextResponse(
      `Erro interno: ${error.message}`,
      { status: 500 }
    );
  }
}
