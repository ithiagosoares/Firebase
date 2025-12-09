
import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getFirebaseAdminApp } from "@/lib/firebase-admin";
import { Patient, Workflow, Template, Clinic } from "@/lib/types";
import { differenceInDays, differenceInHours, differenceInMonths, differenceInWeeks } from "date-fns";
import axios from "axios";

const adminApp = getFirebaseAdminApp();
const db = getFirestore(adminApp);

const PLAN_LIMITS = {
    Essencial: 150,
    Profissional: 300,
    Premium: 750,
    Trial: 10, // Limite para trial
};

export async function GET(req: NextRequest) {
    // A autenticação está temporariamente desativada para simplificar. 
    // TODO: Reativar a validação do CRON_SECRET em produção.
    // const authHeader = req.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //     return new NextResponse('Unauthorized', { status: 401 });
    // }

    try {
        console.log("Iniciando a verificação de workflows...");
        const clinicsSnapshot = await db.collection('clinics').get();

        for (const clinicDoc of clinicsSnapshot.docs) {
            const clinic = clinicDoc.data() as Clinic;
            const clinicId = clinicDoc.id;

            const plan = clinic.plan || 'Trial';
            const limit = PLAN_LIMITS[plan] || PLAN_LIMITS.Trial;

            const usageDoc = await db.collection('message_usage').doc(clinicId).get();
            const currentUsage = usageDoc.exists ? usageDoc.data().count : 0;

            if (currentUsage >= limit) {
                console.log(`Clínica ${clinicId} atingiu o limite do plano ${plan}. Mensagens não serão enviadas.`);
                continue; 
            }

            const patientsSnapshot = await db.collection('clinics').doc(clinicId).collection('patients').where('workflowId', '!=', null).get();

            let processedPatients = 0;
            for (const patientDoc of patientsSnapshot.docs) {
                const patient = patientDoc.data() as Patient;
                if (!patient.workflowId) continue;

                const workflowDoc = await db.collection('clinics').doc(clinicId).collection('workflows').doc(patient.workflowId).get();
                if (!workflowDoc.exists) continue;

                const workflow = workflowDoc.data() as Workflow;
                const messageSent = await processWorkflow(patient, workflow, clinicId, patientDoc.id);
                
                if (messageSent) {
                    const newUsage = currentUsage + processedPatients + 1;
                    if (newUsage >= limit) {
                        console.log(`Clínica ${clinicId} atingiu o limite do plano ${plan} após envio.`);
                        await db.collection('message_usage').doc(clinicId).set({ count: newUsage }, { merge: true });
                        break; 
                    }
                    processedPatients++;
                }
            }
            if (processedPatients > 0) {
                const newTotalUsage = currentUsage + processedPatients;
                await db.collection('message_usage').doc(clinicId).set({ count: newTotalUsage }, { merge: true });
            }
        }

        return NextResponse.json({ message: "Workflows verificados com sucesso." });
    } catch (error) {
        console.error("Erro ao verificar workflows:", error);
        return new NextResponse(`Erro interno do servidor: ${error.message}`, { status: 500 });
    }
}

async function processWorkflow(patient: Patient, workflow: Workflow, clinicId: string, patientId: string): Promise<boolean> {
    if (!workflow.templates || workflow.templates.length === 0) return false;

    const now = new Date();
    // Certifique-se de que patient.appointmentDate existe e é um objeto Timestamp antes de chamar toDate()
    if (!patient.appointmentDate || typeof patient.appointmentDate.toDate !== 'function') return false;
    const appointmentDate = patient.appointmentDate.toDate();
    
    let messageSent = false;

    for (const templateRef of workflow.templates) {
        const templateId = templateRef.id;
        const alreadySentSnapshot = await db.collection('clinics').doc(clinicId).collection('patients').doc(patientId).collection('messages')
            .where('templateId', '==', templateId)
            .limit(1).get();

        if (!alreadySentSnapshot.empty) continue; 

        const templateDoc = await db.collection('clinics').doc(clinicId).collection('templates').doc(templateId).get();
        if (!templateDoc.exists) continue;

        const template = templateDoc.data() as Template;
        const trigger = template.trigger;
        let shouldSend = false;

        const diffFunctions = {
            hours: differenceInHours,
            days: differenceInDays,
            weeks: differenceInWeeks,
            months: differenceInMonths
        };

        const diffFn = diffFunctions[trigger.unit];
        if (!diffFn) continue;

        const diff = diffFn(appointmentDate, now);

        // Lógica para determinar se a mensagem deve ser enviada
        if (trigger.when === 'before' && diff >= 0 && diff <= trigger.value) {
            shouldSend = true;
        } else if (trigger.when === 'after' && diff < 0 && Math.abs(diff) >= trigger.value) {
            shouldSend = true;
        }


        if (shouldSend) {
            await sendMessage(patient, template, clinicId, patientId, templateId);
            messageSent = true;
            break; 
        }
    }
    return messageSent;
}

async function sendMessage(patient: Patient, template: Template, clinicId: string, patientId: string, templateId: string) {
    const personalizedMessage = template.message.replace('{patientName}', patient.name);
    const whatsappApiUrl = process.env.WHATSAPP_API_URL;

    if (!whatsappApiUrl) {
        console.error("Erro: A variável de ambiente WHATSAPP_API_URL não está definida.");
        // Registra a falha no Firestore para que não tente reenviar indefinidamente
        await db.collection('clinics').doc(clinicId).collection('patients').doc(patientId).collection('messages').add({
            templateId: templateId,
            status: 'failed',
            error: 'WHATSAPP_API_URL não configurada no servidor.',
            sentAt: new Date(),
            to: patient.phone,
            body: personalizedMessage
        });
        return;
    }

    try {
        // Chamada para a API da Meta/n8n via Axios
        await axios.post(whatsappApiUrl, {
            number: patient.phone,
            message: personalizedMessage,
        });

        // Registra o sucesso no Firestore
        await db.collection('clinics').doc(clinicId).collection('patients').doc(patientId).collection('messages').add({
            templateId: templateId,
            status: 'sent',
            sentAt: new Date(),
            to: patient.phone,
            body: personalizedMessage
        });

        console.log(`Mensagem para ${patient.name} (${patient.phone}) delegada para a API do WhatsApp.`);

    } catch (error) {
        const errorMessage = error.response?.data?.error || error.message;
        console.error(`Erro ao delegar mensagem para ${patient.name}:`, errorMessage);

        // Registra a falha no Firestore
        await db.collection('clinics').doc(clinicId).collection('patients').doc(patientId).collection('messages').add({
            templateId: templateId,
            status: 'failed',
            error: errorMessage,
            sentAt: new Date(),
            to: patient.phone,
            body: personalizedMessage
        });
    }
}
