import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { Patient, ScheduledMessage, WithId } from '@/lib/types';
import { sendTemplateMessage } from '@/lib/whatsapp'; 
import { defaultTemplates } from '@/data/defaultTemplates';

export const dynamic = 'force-dynamic'; 

export async function GET(request: Request) {
  // Verificação de Segurança
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');

  if (authorization !== `Bearer ${cronSecret}`) {
    return new NextResponse('Não autorizado', { status: 401 });
  }

  const firestoreDb = db(); // Instância do Admin

  try {
    const now = Timestamp.now();
    const scheduledMessagesRef = firestoreDb.collection('scheduledMessages');
    
    // Busca mensagens que estão 'Agendado' e cuja hora já chegou (ou passou)
    const querySnapshot = await scheduledMessagesRef
      .where('status', '==', 'Agendado')
      .where('scheduledTime', '<=', now)
      .get();

    if (querySnapshot.empty) {
      return NextResponse.json({ success: true, message: 'Nenhuma mensagem para enviar.' });
    }

    console.log(`CRON: ${querySnapshot.size} mensagem(ns) encontrada(s).`);

    const processingPromises = querySnapshot.docs.map(async (doc) => {
      const message = { id: doc.id, ...doc.data() } as WithId<ScheduledMessage>;
      const messageRef = doc.ref;

      try {
        // 1. Busca dados do Paciente na subcoleção do usuário correto
        const patientDoc = await firestoreDb.doc(`users/${message.userId}/patients/${message.patientId}`).get();
        
        // 2. Busca dados da Clínica para preencher variáveis como {{2}}
        const userDoc = await firestoreDb.collection('users').doc(message.userId).get();
        const userData = userDoc.data();
        const clinicName = userData?.clinicName || "Sua Clínica";

        if (!patientDoc.exists) {
            throw new Error(`Paciente ${message.patientId} não encontrado.`);
        }
        
        const patient = patientDoc.data() as Patient;

        // 3. Resolve o Template
        let templateName = message.templateId;
        
        // Verifica se é um template padrão
        const defaultTemp = defaultTemplates.find(t => t.name === message.templateId);
        
        if (defaultTemp) {
            templateName = defaultTemp.name; 
        } else {
            // Se não é padrão, busca nos templates personalizados do usuário
            const templateDoc = await firestoreDb.doc(`users/${message.userId}/messageTemplates/${message.templateId}`).get();
            if (templateDoc.exists) {
                templateName = templateDoc.data()?.name || templateDoc.data()?.title; 
            }
        }

        // 4. Monta as variáveis (Components) para a Meta
        // A Meta exige um array de objetos para substituir {{1}}, {{2}}, etc.
        const components = [
            {
                type: "body",
                parameters: [
                    // {{1}} = Nome do Paciente
                    { type: "text", text: patient.name },  
                    // {{2}} = Nome da Clínica
                    { type: "text", text: clinicName }     
                ]
            }
        ];

        // 5. Envia a mensagem (Agora sem erro de tipagem)
        // A ordem é: userId, telefone, nomeTemplate, components
        await sendTemplateMessage(message.userId, patient.phone, templateName, components);

        // 6. Atualiza o status no banco
        await messageRef.update({ status: 'Enviado', sentAt: Timestamp.now() });
        console.log(`CRON: Mensagem ${message.id} enviada para ${patient.name}.`);

      } catch (error: any) {
        console.error(`CRON: Falha msg ${message.id}:`, error.message);
        await messageRef.update({ status: 'Falhou', error: error.message });
      }
    });

    await Promise.all(processingPromises);

    return NextResponse.json({ success: true, processed: querySnapshot.size });

  } catch (error: any) {
    console.error('CRON: Erro crítico.', error);
    return new NextResponse(`Erro interno: ${error.message}`, { status: 500 });
  }
}