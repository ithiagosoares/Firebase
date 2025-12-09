
import { NextRequest, NextResponse } from "next/server";

// TODO: REMOVER ESTE ARQUIVO APÓS A MIGRAÇÃO COMPLETA PARA A META API
// import { getFirestore } from "firebase-admin/firestore";
// import { getFirebaseAdminApp } from "@/lib/firebase-admin";
// import { Patient, Workflow, Template, Clinic } from "@/lib/types";
// import { differenceInDays, differenceInHours, differenceInMonths, differenceInWeeks } from "date-fns";
// import twilio from "twilio";

// const adminApp = getFirebaseAdminApp();
// const db = getFirestore(adminApp);

// const PLAN_LIMITS = {
//     Essencial: 150,
//     Profissional: 300,
//     Premium: 750,
//     Trial: 10, // Limite para trial
// };

export async function GET(req: NextRequest) {
    return NextResponse.json({ message: "Cron job desativado." });

    // const authHeader = req.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //     return new NextResponse('Unauthorized', { status: 401 });
    // }

    // try {
    //     console.log("Iniciando a verificação de workflows...");
    //     const clinicsSnapshot = await db.collection('clinics').get();

    //     for (const clinicDoc of clinicsSnapshot.docs) {
    //         const clinic = clinicDoc.data() as Clinic;
    //         const clinicId = clinicDoc.id;

    //         const plan = clinic.plan || 'Trial'; // Default to Trial if no plan is set
    //         const limit = PLAN_LIMITS[plan] || PLAN_LIMITS.Trial;

    //         const usageDoc = await db.collection('message_usage').doc(clinicId).get();
    //         const currentUsage = usageDoc.exists ? usageDoc.data().count : 0;

    //         if (currentUsage >= limit) {
    //             console.log(`Clínica ${clinicId} atingiu o limite do plano ${plan}. Mensagens não serão enviadas.`);
    //             continue; // Pula para a próxima clínica
    //         }

    //         const patientsSnapshot = await db.collection('clinics').doc(clinicId).collection('patients').where('workflowId', '!=', null).get();

    //         for (const patientDoc of patientsSnapshot.docs) {
    //             const patient = patientDoc.data() as Patient;
    //             if (!patient.workflowId) continue;

    //             const workflowDoc = await db.collection('clinics').doc(clinicId).collection('workflows').doc(patient.workflowId).get();
    //             if (!workflowDoc.exists) continue;

    //             const workflow = workflowDoc.data() as Workflow;
    //             const messageSent = await processWorkflow(patient, workflow, clinicId, patientDoc.id);
    //             if (messageSent) {
    //                 // Se uma mensagem foi enviada, incrementa a contagem de uso
    //                 const newUsage = (currentUsage || 0) + 1;
    //                 await db.collection('message_usage').doc(clinicId).set({ count: newUsage }, { merge: true });

    //                 if (newUsage >= limit) {
    //                     console.log(`Clínica ${clinicId} atingiu o limite do plano ${plan} após envio.`);
    //                     break; // Para de processar pacientes para esta clínica
    //                 }
    //             }
    //         }
    //     }

    //     return NextResponse.json({ message: "Workflows verificados com sucesso." });
    // } catch (error) {
    //     console.error("Erro ao verificar workflows:", error);
    //     return new NextResponse(`Erro interno do servidor: ${error.message}`, { status: 500 });
    // }
}

// async function processWorkflow(patient: Patient, workflow: Workflow, clinicId: string, patientId: string): Promise<boolean> {
//     if (!workflow.templates || workflow.templates.length === 0) return false;

//     const now = new Date();
//     const appointmentDate = patient.appointmentDate.toDate();
//     let messageSent = false;

//     for (const templateRef of workflow.templates) {
//         const templateId = templateRef.id;
//         const alreadySentSnapshot = await db.collection('clinics').doc(clinicId).collection('patients').doc(patientId).collection('messages')
//             .where('templateId', '==', templateId)
//             .limit(1).get();

//         if (!alreadySentSnapshot.empty) continue; // Mensagem já enviada

//         const templateDoc = await db.collection('clinics').doc(clinicId).collection('templates').doc(templateId).get();
//         if (!templateDoc.exists) continue;

//         const template = templateDoc.data() as Template;
//         const trigger = template.trigger;
//         let shouldSend = false;

//         const diffFunctions = {
//             hours: differenceInHours,
//             days: differenceInDays,
//             weeks: differenceInWeeks,
//             months: differenceInMonths
//         };

//         const diffFn = diffFunctions[trigger.unit];
//         if (!diffFn) continue;

//         const diff = diffFn(appointmentDate, now);

//         if (trigger.when === 'before' && diff > 0 && diff <= trigger.value) {
//             shouldSend = true;
//         } else if (trigger.when === 'after' && diff < 0 && Math.abs(diff) >= trigger.value) {
//             shouldSend = true;
//         }

//         if (shouldSend) {
//             await sendMessage(patient, template, clinicId, patientId, templateId);
//             messageSent = true;
//             break; // Envia apenas uma mensagem por execução do cron
//         }
//     }
//     return messageSent;
// }

// async function sendMessage(patient: Patient, template: Template, clinicId: string, patientId: string, templateId: string) {
//     const credentialsDoc = await db.collection('twilio_credentials').doc(clinicId).get();
//     if (!credentialsDoc.exists) {
//         console.log(`Credenciais Twilio não encontradas para a clínica ${clinicId}`);
//         return;
//     }
//     const credentials = credentialsDoc.data();
//     const client = twilio(credentials.accountSid, credentials.authToken);

//     const personalizedMessage = template.message.replace('{patientName}', patient.name);

//     try {
//         const message = await client.messages.create({
//             body: personalizedMessage,
//             from: credentials.fromNumber, // Número Twilio da clínica
//             to: patient.phone
//         });

//         await db.collection('clinics').doc(clinicId).collection('patients').doc(patientId).collection('messages').add({
//             sid: message.sid,
//             templateId: templateId,
//             status: 'sent',
//             sentAt: new Date(),
//             to: patient.phone,
//             body: personalizedMessage
//         });

//         console.log(`Mensagem enviada para ${patient.name} (SID: ${message.sid})`);
//     } catch (error) {
//         console.error(`Erro ao enviar mensagem para ${patient.name}:`, error);
//         await db.collection('clinics').doc(clinicId).collection('patients').doc(patientId).collection('messages').add({
//             templateId: templateId,
//             status: 'failed',
//             error: error.message,
//             sentAt: new Date(),
//             to: patient.phone,
//             body: personalizedMessage
//         });
//     }
// }
