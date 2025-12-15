
import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "@/lib/firebase-admin";
import { Patient, Workflow, Template, Clinic, WithId } from "@/lib/types";
import { differenceInDays, differenceInHours, differenceInMonths, differenceInWeeks } from "date-fns";
import axios from "axios";

const PLAN_LIMITS: { [key: string]: number } = {
    Essencial: 150,
    Profissional: 300,
    Premium: 750,
    Trial: 10,
};

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    const expectedSecret = process.env.CRON_SECRET;

    // =================================================================================
    //  INÍCIO DO CÓDIGO DE DEPURAÇÃO TEMPORÁRIO
    // =================================================================================
    console.log(`[DEBUG] Comprimento do cabeçalho 'Authorization' recebido: ${authHeader?.length}`);
    console.log(`[DEBUG] Comprimento do 'CRON_SECRET' esperado (process.env): ${expectedSecret?.length}`);
    // =================================================================================
    //  FIM DO CÓDIGO DE DEPURAÇÃO
    // =================================================================================

    if (authHeader !== `Bearer ${expectedSecret}`) {
        console.error(`[AUTH] Falha na autorização. O cabeçalho não corresponde ao CRON_SECRET.`);
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        console.log("CRON: Iniciando verificação de workflows...");
        const clinicsSnapshot = await db().collection('clinics').get();

        for (const clinicDoc of clinicsSnapshot.docs) {
            const clinic = clinicDoc.data() as Clinic;
            const clinicId = clinicDoc.id;
            const plan = clinic.plan || 'Trial';
            const limit = PLAN_LIMITS[plan] || PLAN_LIMITS.Trial;

            const usageDoc = await db().collection('message_usage').doc(clinicId).get();
            const currentUsage = usageDoc.exists ? (usageDoc.data()?.count || 0) : 0;

            if (currentUsage >= limit) {
                console.log(`CRON: Clínica ${clinicId} atingiu o limite do plano ${plan}.`);
                continue;
            }

            const workflowsSnapshot = await db().collection('clinics').doc(clinicId).collection('workflows').where('active', '==', true).get();
            if (workflowsSnapshot.empty) {
                continue;
            }

            let clinicMessageCounter = 0;
            for (const workflowDoc of workflowsSnapshot.docs) {
                const workflow = { id: workflowDoc.id, ...workflowDoc.data() } as WithId<Workflow>;
                if (!workflow.patients || workflow.patients.length === 0) {
                    continue;
                }

                for (const patientId of workflow.patients) {
                    if (currentUsage + clinicMessageCounter >= limit) {
                        console.log(`CRON: Limite do plano atingido durante o processamento da clínica ${clinicId}.`);
                        break;
                    }

                    const patientDoc = await db().collection('clinics').doc(clinicId).collection('patients').doc(patientId).get();
                    if (!patientDoc.exists) continue;
                    
                    const patient = { id: patientDoc.id, ...patientDoc.data() } as WithId<Patient>;
                    
                    const messageSent = await processWorkflowForPatient(patient, workflow, clinicId);
                    if (messageSent) {
                        clinicMessageCounter++;
                    }
                }
                if (currentUsage + clinicMessageCounter >= limit) break;
            }

            if (clinicMessageCounter > 0) {
                const newTotalUsage = currentUsage + clinicMessageCounter;
                await db().collection('message_usage').doc(clinicId).set({ count: newTotalUsage }, { merge: true });
                console.log(`CRON: Clínica ${clinicId} enviou ${clinicMessageCounter} mensagens. Novo total: ${newTotalUsage}.`);
            }
        }

        return NextResponse.json({ message: "Workflows verificados com sucesso." });
    } catch (error) {
        console.error("CRON: Erro ao verificar workflows:", error);
        const errorMessage = (error instanceof Error) ? error.message : "Erro desconhecido";
        return new NextResponse(`Erro interno do servidor: ${errorMessage}`, { status: 500 });
    }
}

async function processWorkflowForPatient(patient: WithId<Patient>, workflow: WithId<Workflow>, clinicId: string): Promise<boolean> {
    if (!workflow.steps || workflow.steps.length === 0) return false;

    const now = new Date();
    if (!patient.nextAppointment || typeof patient.nextAppointment.toDate !== 'function') return false;
    const appointmentDate = patient.nextAppointment.toDate();
    
    for (const step of workflow.steps) {
        const templateId = step.template;
        const alreadySentSnapshot = await db().collection('clinics').doc(clinicId).collection('patients').doc(patient.id).collection('messages')
            .where('templateId', '==', templateId)
            .where('workflowId', '==', workflow.id)
            .limit(1).get();

        if (!alreadySentSnapshot.empty) continue;

        const templateDoc = await db().collection('clinics').doc(clinicId).collection('templates').doc(templateId).get();
        if (!templateDoc.exists) continue;

        const template = templateDoc.data() as Template;
        const schedule = step.schedule;
        let shouldSend = false;

        const diffFunctions = {
            hours: differenceInHours,
            days: differenceInDays,
            weeks: differenceInWeeks,
            months: differenceInMonths
        };

        const diffFn = diffFunctions[schedule.unit];
        if (!diffFn) continue;

        const diff = diffFn(appointmentDate, now);

        if (schedule.event === 'before' && diff > 0 && diff <= schedule.quantity) {
            shouldSend = true;
        } else if (schedule.event === 'after' && diff < 0 && Math.abs(diff) >= schedule.quantity) {
            shouldSend = true;
        }
        
        if (shouldSend) {
            await sendMessage(patient, template, clinicId, workflow.id, templateId);
            return true; 
        }
    }
    return false; 
}

async function sendMessage(patient: WithId<Patient>, template: Template, clinicId: string, workflowId: string, templateId: string) {
    const personalizedMessage = template.body.replace(/{patientName}/g, patient.name);
    const whatsappApiUrl = process.env.WHATSAPP_API_URL;

    if (!whatsappApiUrl) {
        console.error("CRON Error: A variável de ambiente WHATSAPP_API_URL não está definida.");
        await logMessageStatus('failed', clinicId, patient.id, workflowId, templateId, patient.phone, personalizedMessage, 'WHATSAPP_API_URL não configurada no servidor.');
        return;
    }

    try {
        await axios.post(whatsappApiUrl, {
            number: patient.phone,
            message: personalizedMessage,
        });

        await logMessageStatus('sent', clinicId, patient.id, workflowId, templateId, patient.phone, personalizedMessage);
        console.log(`CRON: Mensagem para ${patient.name} (${patient.phone}) delegada para a API do WhatsApp.`);

    } catch (error) {
        const errorMessage = (error instanceof Error) ? error.message : "Erro desconhecido";
        console.error(`CRON: Erro ao delegar mensagem para ${patient.name}:`, errorMessage);
        await logMessageStatus('failed', clinicId, patient.id, workflowId, templateId, patient.phone, personalizedMessage, errorMessage);
    }
}

async function logMessageStatus(status: 'sent' | 'failed', clinicId: string, patientId: string, workflowId: string, templateId: string, to: string, body: string, error?: string) {
    const logEntry: any = {
        workflowId,
        templateId,
        status,
        sentAt: Timestamp.now(),
        to,
        body
    };
    if (error) {
        logEntry.error = error;
    }
    await db().collection('clinics').doc(clinicId).collection('patients').doc(patientId).collection('messages').add(logEntry);
}
