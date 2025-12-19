
import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin'; // <-- CORREÇÃO: Importa a instância do DB pronta
import { Patient, ScheduledMessage, Template, WithId } from '@/lib/types';
import { sendMessage } from '@/lib/whatsapp';

// Função para substituir variáveis no template
function populateTemplate(templateBody: string, patient: Patient): string {
  return templateBody.replace(/\{\{nome\}\}/g, patient.name);
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');

  if (authorization !== `Bearer ${cronSecret}`) {
    console.warn('CRON: Tentativa de acesso não autorizada.');
    return new NextResponse('Não autorizado', { status: 401 });
  }

  console.log('CRON: Autenticação bem-sucedida. Iniciando verificação de mensagens...');
  const firestoreDb = db(); // <-- CORREÇÃO: Obtém a instância do DB

  try {
    const now = Timestamp.now();
    const scheduledMessagesRef = firestoreDb.collection('scheduledMessages');
    const querySnapshot = await scheduledMessagesRef
      .where('status', '==', 'Agendado')
      .where('scheduledTime', '<=', now)
      .get();

    if (querySnapshot.empty) {
      console.log('CRON: Nenhuma mensagem agendada para enviar.');
      return NextResponse.json({ success: true, message: 'Nenhuma mensagem para enviar.' });
    }

    console.log(`CRON: ${querySnapshot.size} mensagem(ns) encontrada(s) para processar.`);

    const processingPromises = querySnapshot.docs.map(async (doc) => {
      const message = { id: doc.id, ...doc.data() } as WithId<ScheduledMessage>;
      const messageRef = doc.ref;

      try {
        const patientDoc = await firestoreDb.collection('patients').doc(message.patientId).get();
        const templateDoc = await firestoreDb.collection('templates').doc(message.templateId).get();

        if (!patientDoc.exists || !templateDoc.exists) {
          throw new Error(`Paciente (ID: ${message.patientId}) ou Template (ID: ${message.templateId}) não encontrado.`);
        }

        const patient = patientDoc.data() as Patient;
        const template = templateDoc.data() as Template;
        const populatedMessage = populateTemplate(template.body, patient);

        await sendMessage(patient.phone, populatedMessage);

        await messageRef.update({ status: 'Enviado' });
        console.log(`CRON: Mensagem ${message.id} enviada com sucesso para ${patient.name}.`);

      } catch (error: any) {
        console.error(`CRON: Falha ao processar mensagem ${message.id}. Erro:`, error.message);
        await messageRef.update({ status: 'Falhou' });
      }
    });

    await Promise.all(processingPromises);

    return NextResponse.json({ success: true, message: 'Processamento do CRON concluído.' });

  } catch (error: any) {
    console.error('CRON: Erro crítico durante a execução.', error);
    return new NextResponse(`Erro interno do servidor: ${error.message}`, { status: 500 });
  }
}
