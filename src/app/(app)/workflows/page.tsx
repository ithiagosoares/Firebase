"use client"

import { useState, useEffect, useMemo } from "react"
import { MoreVertical, PlusCircle, Trash, Copy, Pencil, Send, Loader2, Workflow as WorkflowIcon } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { type Workflow, type ScheduledMessage, type Patient } from "@/lib/types"
import { collection, doc, writeBatch, query, where, getDocs, Timestamp, orderBy, limit, getDoc } from "firebase/firestore"
import { add, sub } from "date-fns"

import { useUser, useFirestore, useMemoFirebase } from "@/firebase/provider"
import { useCollection } from "@/firebase/firestore/use-collection"
import { setDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates"

export default function WorkflowsPage() {
  const { toast } = useToast()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()

  const workflowsCollection = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/workflows`);
  }, [firestore, user]);

  const { data: workflows, isLoading } = useCollection<Workflow>(workflowsCollection);

  const patientsCollection = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/patients`);
  }, [firestore, user]);
  const { data: patients, isLoading: isLoadingPatients } = useCollection<Patient>(patientsCollection);


  const handleToggleActive = (id: string, active: boolean) => {
    if (!user) return;
    const workflowDoc = doc(firestore, `users/${user.uid}/workflows/${id}`);
    setDocumentNonBlocking(workflowDoc, { active }, { merge: true });
  }
  
  const handleDeleteWorkflow = (id: string) => {
    if (!user) return;
    const workflowDoc = doc(firestore, `users/${user.uid}/workflows/${id}`);
    deleteDocumentNonBlocking(workflowDoc);
  };

  const scheduleMessagesForAppointment = (
    userId: string,
    patientId: string,
    appointmentDate: Date,
    workflow: Workflow
  ) => {
    const scheduledMessagesCollection = collection(firestore, `users/${userId}/scheduledMessages`);
  
    workflow.steps.forEach(step => {
      let scheduledTime;
  
      const scheduleAction = step.schedule.event === 'before' ? sub : add;
      scheduledTime = scheduleAction(appointmentDate, { [step.schedule.unit]: step.schedule.quantity });
  
      const newMessage: Omit<ScheduledMessage, 'id' | 'appointmentId'> = {
        userId,
        patientId,
        templateId: step.template,
        workflowId: workflow.id,
        scheduledTime: Timestamp.fromDate(scheduledTime),
        status: 'Agendado',
      };
      addDocumentNonBlocking(scheduledMessagesCollection, newMessage);
    });
  };

  const handleSendNow = async (workflow: Workflow) => {
    if (!user || !firestore || !patients) return;

    let patientsScheduled = 0;
    let patientsWithoutDate = 0;
    let patientsWithExistingMessages = 0;
    
    const patientsMap = new Map(patients.map(p => [p.id, p]));
    const scheduledMessagesCollection = collection(firestore, `users/${user.uid}/scheduledMessages`);

    for (const patientId of workflow.patients) {
        const patientData = patientsMap.get(patientId);
        
        if (!patientData) continue;
        
        if (patientData.nextAppointment && patientData.nextAppointment.toDate() > new Date()) {
            const appointmentDate = patientData.nextAppointment.toDate();
            
            // Check for existing scheduled messages for this workflow and patient
            const q = query(
              scheduledMessagesCollection, 
              where("patientId", "==", patientId),
              where("workflowId", "==", workflow.id),
              where("status", "==", "Agendado")
            );
            const existingMessagesSnapshot = await getDocs(q);

            if (existingMessagesSnapshot.empty) {
                scheduleMessagesForAppointment(user.uid, patientId, appointmentDate, workflow);
                patientsScheduled++;
            } else {
                patientsWithExistingMessages++;
            }
        } else {
          if (!patientData.nextAppointment) {
            patientsWithoutDate++;
          }
        }
    }

    if (patientsScheduled > 0) {
      toast({
        title: "Fluxo de trabalho iniciado!",
        description: `Mensagens foram agendadas para ${patientsScheduled} novo(s) paciente(s).`,
      });
    } else {
       toast({
        variant: "default",
        title: "Nenhum novo agendamento",
        description: "Nenhum paciente elegível para novos agendamentos neste fluxo.",
      });
    }

    if (patientsWithExistingMessages > 0) {
        toast({
            variant: "default",
            title: "Aviso de Fluxo",
            description: `Este fluxo já possui mensagens agendadas para ${patientsWithExistingMessages} paciente(s) e não será reenviado.`
        })
    }

    if (patientsWithoutDate > 0) {
      toast({
        variant: "destructive",
        title: "Aviso de Dados",
        description: `${patientsWithoutDate} paciente(s) no fluxo estão sem data de próxima consulta e foram ignorados.`
      })
    }
  };
  
  const getScheduleDescription = (wf: Workflow) => {
    if (!wf.steps || wf.steps.length === 0) return "Nenhum passo";
    const firstStep = wf.steps[0];
    const { quantity, unit, event } = firstStep.schedule;
    
    const unitMap: Record<string, string> = {
        hours: "hora(s)",
        days: "dia(s)",
        weeks: "semana(s)",
        months: "mês(es)"
    };

    const friendlyUnit = unitMap[unit] || unit;

    return `${quantity} ${friendlyUnit} ${event === 'before' ? 'antes' : 'depois'} da consulta`;
  }
  
  const renderEmptyState = () => (
    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm mt-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <WorkflowIcon className="h-12 w-12 text-muted-foreground" />
        <h3 className="text-2xl font-bold tracking-tight">
          Nenhum fluxo de automação criado
        </h3>
        <p className="text-sm text-muted-foreground">
          Comece a automatizar sua comunicação criando seu primeiro fluxo.
        </p>
        <Button className="mt-4" asChild>
          <Link href="/workflows/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Criar Fluxo
          </Link>
        </Button>
      </div>
    </div>
  );

  if (isLoading || isUserLoading || isLoadingPatients) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button asChild>
          <Link href="/workflows/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Criar Fluxo
          </Link>
        </Button>
      </div>

      {workflows && workflows.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {workflows.map((wf) => (
            <Card key={wf.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>{wf.title}</CardTitle>
                  <Switch 
                    checked={wf.active} 
                    onCheckedChange={(checked) => handleToggleActive(wf.id, checked)}
                    aria-label="Ativar ou desativar fluxo" />
                </div>
                <CardDescription>
                  Enviando para "{wf.target}"
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-2">
                <p className="text-sm text-muted-foreground">
                  Agendamento: <span className="font-medium text-foreground">{getScheduleDescription(wf)}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Passos: <span className="font-medium text-foreground">{wf.steps.length}</span>
                </p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" size="sm" onClick={() => handleSendNow(wf)}>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar Agora
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={`/workflows/edit/${wf.id}`} className="flex items-center cursor-pointer">
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDeleteWorkflow(wf.id)} className="text-destructive">
                      <Trash className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        renderEmptyState()
      )}
    </>
  )
}
