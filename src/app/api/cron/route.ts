
import { NextRequest, NextResponse } from "next/server";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminApp } from "@/lib/firebase-admin";
import { Patient, Workflow, Template, Clinic } from "@/lib/types";
import { differenceInDays, differenceInHours, differenceInMonths, differenceInWeeks } from "date-fns";
import twilio from "twilio";

const adminApp = getFirebaseAdminApp();
const db = getFirestore(adminApp);

const PLAN_LIMITS = {
    Essencial: 150,
    Profissional: 300,
    Premium: 750,
    Trial: 10, // Limite para trial
};

const calculateDateDifference = (date1: Date, date2: Date, unit: 'hours' | 'days' | 'weeks' | 'months'): number => {
    switch (unit) {
        case 'hours': return differenceInHours(date1, date2);
        case 'days': return differenceInDays(date1, date2);
        case 'weeks': return differenceInWeeks(date1, date2);
        case 'months': return differenceInMonths(date1, date2);
        default: return Infinity;
    }
};

export async function GET(request: NextRequest) {
    const secret = request.headers.get("x-cron-secret");
    if (secret !== process.env.CRON_SECRET) {
        console.warn("CRON: Tentativa de acesso não autorizada.");
        return new NextResponse("Acesso não autorizado", { status: 401 });
    }

    const now = new Date();
    console.log(`CRON: Iniciando execução em ${now.toISOString()}`);

    try {
        console.log("CRON: Fase 1 - Procurando clínicas e fluxos de trabalho...");

        const clinicsSnapshot = await db.collection("clinics").where("isTwilioConnected", "==", true).get();
        if (clinicsSnapshot.empty) {
            console.log("CRON: Nenhuma clínica com Twilio conectado encontrada.");
        }

        const schedulingPromises = clinicsSnapshot.docs.map(async (clinicDoc) => {
            const clinic = clinicDoc.data() as Clinic;
            const userId = clinicDoc.id;
            const plan = clinic.plan || 'Trial'; // Assume Trial se nenhum plano estiver definido
            const limit = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] || 0;
            const usage = clinic.monthlyUsage || 0;

            if (usage >= limit) {
                console.log(`CRON: Limite do plano '${plan}' atingido para a clínica ${userId} (${usage}/${limit}). Pulando agendamento.`);
                return;
            }

            const workflowsSnapshot = await db.collection(`users/${userId}/workflows`).where("active", "==", true).get();
            if (workflowsSnapshot.empty) return;

            let newMessagesScheduled = 0;

            for (const workflowDoc of workflowsSnapshot.docs) {
                if (usage + newMessagesScheduled >= limit) break; // Para o loop se o limite for atingido

                const workflow = workflowDoc.data() as Workflow;
                const patientsSnapshot = await db.collection(`users/${userId}/patients`).get();
                const patientsMap = new Map<string, Patient>(patientsSnapshot.docs.map(doc => [doc.id, doc.data() as Patient]));

                for (const patientId of workflow.patients) {
                    if (usage + newMessagesScheduled >= limit) break;

                    const patient = patientsMap.get(patientId);
                    if (!patient || !patient.nextAppointment) continue;
                    
                    const appointmentDate = (patient.nextAppointment as unknown as Timestamp).toDate();

                    for (const step of workflow.steps) {
                        if (usage + newMessagesScheduled >= limit) break;

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
                            const templateDoc = await db.doc(`users/${userId}/messageTemplates/${templateId}`).get();
                            const template = templateDoc.data() as Template;
                            if (!template) continue;

                            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                            const duplicateCheckSnapshot = await db.collection("scheduled_messages")
                                .where("patientId", "==", patientId)
                                .where("workflowId", "==", workflowDoc.id)
                                .where("stepIndex", "==", workflow.steps.indexOf(step))
                                .where("createdAt", ">=", startOfToday)
                                .get();

                            if (!duplicateCheckSnapshot.empty) continue;
                            
                            console.log(`CRON: AGENDANDO MENSAGEM para paciente ${patient.id}`);
                            newMessagesScheduled++;

                            await db.collection("scheduled_messages").add({
                                recipient: patient.phone,
                                message: template.body,
                                wabaId: clinic.wabaId,
                                userId: userId,
                                status: "scheduled",
                                patientContext: { name: patient.name },
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

        console.log("CRON: Fase 2 - Enviando mensagens agendadas...");
        
        const messagesToSendSnapshot = await db.collection("scheduled_messages").where("status", "==", "scheduled").get();
        if (messagesToSendSnapshot.empty) {
            return NextResponse.json({ message: "Nenhuma mensagem nova para processar." }, { status: 200 });
        }

        const masterAccountSid = process.env.TWILIO_ACCOUNT_SID;
        const masterAuthToken = process.env.TWILIO_AUTH_TOKEN;
        if (!masterAccountSid || !masterAuthToken) {
             console.error("CRON: Credenciais master da Twilio não configuradas!");
             return new NextResponse("Credenciais master da Twilio não configuradas.", { status: 500 });
        }

        const masterClient = twilio(masterAccountSid, masterAuthToken);
        const batch = db.batch();

        const clinicUsageUpdate: { [key: string]: number } = {};

        const sendingPromises = messagesToSendSnapshot.docs.map(async (doc) => {
            const data = doc.data();
            const { recipient, message, wabaId, patientContext, userId } = data;

            const personalizedMessage = message.replace(/{{nome_paciente}}/g, patientContext.name || '');

            try {
                await masterClient.messages.create({
                    body: personalizedMessage,
                    to: `whatsapp:${recipient}`,
                    from: `whatsapp:${wabaId}`,
                });
                
                batch.update(doc.ref, { status: "sent", sentAt: FieldValue.serverTimestamp() });
                
                if (!clinicUsageUpdate[userId]) clinicUsageUpdate[userId] = 0;
                clinicUsageUpdate[userId]++;

                console.log(`CRON: Mensagem ${doc.id} enviada para ${recipient}`);
            } catch (error: any) {
                console.error(`CRON: Erro ao enviar mensagem ${doc.id} para ${recipient}:`, error.message);
                batch.update(doc.ref, { status: "failed", error: error.message });
            }
        });

        await Promise.all(sendingPromises);

        for (const userId in clinicUsageUpdate) {
            const increment = clinicUsageUpdate[userId];
            if (increment > 0) {
                const clinicRef = db.collection("clinics").doc(userId);
                batch.update(clinicRef, { monthlyUsage: FieldValue.increment(increment) });
                console.log(`CRON: Incrementando uso da clínica ${userId} em ${increment}.`);
            }
        }

        await batch.commit();

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
