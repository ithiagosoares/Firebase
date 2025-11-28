
import { NextRequest, NextResponse } from "next/server";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminApp } from "@/lib/firebase-admin"; // CORRIGIDO: Usando a inicialização centralizada
import { Patient, Workflow, Template, Clinic } from "@/lib/types"; // Supondo que você tenha um arquivo de tipos
import { differenceInDays, differenceInHours, differenceInMonths, differenceInWeeks, parseISO } from "date-fns";
import twilio from "twilio";

// Inicializa o app e o Firestore uma vez
const adminApp = getFirebaseAdminApp();
const db = getFirestore(adminApp);

// Função auxiliar para calcular a diferença de tempo com base na unidade
const calculateDateDifference = (date1: Date, date2: Date, unit: 'hours' | 'days' | 'weeks' | 'months'): number => {
    switch (unit) {
        case 'hours': return differenceInHours(date1, date2);
        case 'days': return differenceInDays(date1, date2);
        case 'weeks': return differenceInWeeks(date1, date2);
        case 'months': return differenceInMonths(date1, date2);
        default: return Infinity;
    }
};

/**
 * CRON Job para agendar e enviar mensagens de fluxos de trabalho.
 * Este processo tem duas partes:
 * 1. Scheduler: Encontra fluxos de trabalho e cria as mensagens na coleção `scheduled_messages`.
 * 2. Sender: Envia as mensagens que estão na coleção `scheduled_messages`.
 */
export async function GET(request: NextRequest) {
    // 1. 🚨 Autorização
    const secret = request.headers.get("x-cron-secret");
    if (secret !== process.env.CRON_SECRET) {
        console.warn("CRON: Tentativa de acesso não autorizada.");
        return new NextResponse("Acesso não autorizado", { status: 401 });
    }

    const now = new Date();
    console.log(`CRON: Iniciando execução em ${now.toISOString()}`);

    try {
        // =================================================================================
        // PARTE 1: O AGENDADOR (Scheduler)
        // =================================================================================
        console.log("CRON: Fase 1 - Procurando clínicas e fluxos de trabalho...");

        const clinicsSnapshot = await db.collection("clinics").where("isTwilioConnected", "==", true).get();
        if (clinicsSnapshot.empty) {
            console.log("CRON: Nenhuma clínica com Twilio conectado encontrada.");
        }

        const schedulingPromises = clinicsSnapshot.docs.map(async (clinicDoc) => {
            const clinic = clinicDoc.data() as Clinic;
            const userId = clinicDoc.id;

            if (!clinic.twilioSubaccountSid) {
                console.log(`CRON: Clínica ${userId} não tem Subaccount SID. Pulando.`);
                return;
            }

            const workflowsSnapshot = await db.collection(`users/${userId}/workflows`).where("active", "==", true).get();
            if (workflowsSnapshot.empty) {
                // Isso é normal, não um erro. Apenas log para debug.
                // console.log(`CRON: Nenhuma workflow ativo para o usuário ${userId}.`);
                return;
            }

            for (const workflowDoc of workflowsSnapshot.docs) {
                const workflow = workflowDoc.data() as Workflow;
                
                const patientsSnapshot = await db.collection(`users/${userId}/patients`).get();
                const patientsMap = new Map<string, Patient>(
                    patientsSnapshot.docs.map(doc => [doc.id, doc.data() as Patient])
                );

                for (const patientId of workflow.patients) {
                    const patient = patientsMap.get(patientId);
                    if (!patient || !patient.nextAppointment) {
                        continue; 
                    }
                    
                    const appointmentDate = (patient.nextAppointment as unknown as Timestamp).toDate();

                    for (const step of workflow.steps) {
                        const { schedule, template: templateId } = step;
                        if (!schedule || !templateId) continue;

                        const targetDate = appointmentDate;
                        const diff = calculateDateDifference(targetDate, now, schedule.unit);
                        
                        let shouldSendMessage = false;
                        if (schedule.event === 'before' && diff >= 0 && diff === schedule.quantity) {
                           shouldSendMessage = true;
                        } else if (schedule.event === 'after' && diff < 0 && Math.abs(diff) === schedule.quantity) {
                           shouldSendMessage = true;
                        }
                        
                        if (shouldSendMessage) {
                            console.log(`CRON: AGENDANDO MENSAGEM para paciente ${patient.id} do fluxo ${workflow.title}`);

                            const templateDoc = await db.doc(`users/${userId}/messageTemplates/${templateId}`).get();
                            const template = templateDoc.data() as Template;
                            if (!template) continue;

                            // VERIFICAÇÃO DE DUPLICIDADE: Checar se já agendamos essa mensagem para este paciente e este passo hoje.
                            const startOfToday = new Date(now.setHours(0, 0, 0, 0));
                            const endOfToday = new Date(now.setHours(23, 59, 59, 999));

                            const duplicateCheckSnapshot = await db.collection("scheduled_messages")
                                .where("patientId", "==", patientId)
                                .where("workflowId", "==", workflowDoc.id)
                                .where("stepIndex", "==", workflow.steps.indexOf(step))
                                .where("createdAt", ">=", startOfToday)
                                .where("createdAt", "<=", endOfToday)
                                .limit(1)
                                .get();

                            if (!duplicateCheckSnapshot.empty) {
                                console.log(`CRON: Mensagem duplicada para paciente ${patientId} e fluxo ${workflow.title} já agendada hoje. Pulando.`);
                                continue;
                            }

                            await db.collection("scheduled_messages").add({
                                recipient: `whatsapp:${patient.phone}`,
                                message: template.body,
                                twilioSubaccountSid: clinic.twilioSubaccountSid,
                                wabaId: clinic.wabaId,
                                userId: userId,
                                status: "scheduled",
                                sendAt: Timestamp.fromDate(now),
                                createdAt: FieldValue.serverTimestamp(),
                                patientId: patientId,
                                workflowId: workflowDoc.id,
                                stepIndex: workflow.steps.indexOf(step)
                            });
                        }
                    }
                }
            }
        });

        await Promise.all(schedulingPromises);
        console.log("CRON: Fase 1 - Agendamento concluído.");

        // =================================================================================
        // PARTE 2: O ENVIADOR (Sender)
        // =================================================================================
        console.log("CRON: Fase 2 - Enviando mensagens agendadas...");
        
        const messagesToSendSnapshot = await db
            .collection("scheduled_messages")
            .where("status", "==", "scheduled")
            .get();

        if (messagesToSendSnapshot.empty) {
            console.log("CRON: Nenhuma mensagem na fila para enviar agora.");
            return NextResponse.json({ message: "Nenhuma mensagem nova para processar." }, { status: 200 });
        }

        const sendingPromises = messagesToSendSnapshot.docs.map(async (doc) => {
            const data = doc.data();
            const { recipient, message, twilioSubaccountSid, wabaId } = data;

            const masterAccountSid = process.env.TWILIO_ACCOUNT_SID;
            const masterAuthToken = process.env.TWILIO_AUTH_TOKEN;

            if (!masterAccountSid || !masterAuthToken) {
                 console.error("CRON: Credenciais master da Twilio não configuradas!");
                 await doc.ref.update({ status: "failed_missing_credentials" });
                 return;
            }

            const subaccountClient = twilio(masterAccountSid, masterAuthToken, { accountSid: twilioSubaccountSid });

            try {
                await subaccountClient.messages.create({
                    body: message,
                    to: recipient,
                    from: wabaId,
                });

                await doc.ref.update({ status: "sent", sentAt: FieldValue.serverTimestamp() });
                console.log(`CRON: Mensagem ${doc.id} enviada para ${recipient}`);
            } catch (error: any) {
                console.error(`CRON: Erro ao enviar mensagem ${doc.id}:`, error.message);
                await doc.ref.update({ status: "failed", error: error.message });
            }
        });

        await Promise.all(sendingPromises);
        console.log(`CRON: Fase 2 - Processamento de ${sendingPromises.length} mensagens concluído.`);

        return NextResponse.json(
            { message: `Processo CRON finalizado. ${sendingPromises.length} mensagens foram processadas.` },
            { status: 200 }
        );

    } catch (err: any) {
        console.error("CRON: ERRO GERAL NO PROCESSO:", err);
        return new NextResponse(
            JSON.stringify({ error: "Erro interno no servidor durante a execução do CRON.", details: err.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
