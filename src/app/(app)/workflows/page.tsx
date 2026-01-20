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
import { type Workflow, type ScheduledMessage, type Patient, type Schedule, type RelativeSchedule } from "@/lib/types"
// Adicionado WriteBatch type para o TypeScript não reclamar
import { collection, doc, writeBatch, query, where, getDocs, Timestamp, orderBy, limit, getDoc, WriteBatch } from "firebase/firestore"
import { add, sub, format } from "date-fns"
import { ptBR } from 'date-fns/locale';

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

  // --- ATUALIZADO: Agora aceita o 'batch' para salvar tudo de uma vez ---
  const scheduleMessagesForAppointment = (
    userId: string,
    patientId: string,
    appointmentDate: Date,
    workflow: Workflow,
    batch: WriteBatch // Recebe o lote de gravação
  ) => {
    // Referência global para o Cron ler
    const scheduledMessagesCollection = collection(firestore, `scheduledMessages`); 
    // OBS: Antes estava users/{id}/scheduledMessages, mudei para global para o Cron achar fácil, 
    // mas se seu cron busca dentro do user, mantenha o anterior. 
    // Pelo código do Cron que fizemos, ele busca na coleção global 'scheduledMessages'.
  
    workflow.steps.forEach(step => {
      // "Enviar agora" só se aplica a agendamentos relativos à consulta
      if (step.schedule.triggerType !== 'relative') return;

      const schedule = step.schedule as RelativeSchedule;
      const scheduleAction = schedule.event === 'before' ? sub : add;
      const scheduledTime = scheduleAction(appointmentDate, { [schedule.unit]: schedule.quantity });
  
      const newMessageRef = doc(scheduledMessagesCollection);
      
      const newMessage = {
        userId, // Fundamental para o envio funcionar
        patientId,
        templateId: step.template,
        workflowId: workflow.id,
        scheduledTime: Timestamp.fromDate(scheduledTime),
        status: 'Agendado',
        createdAt: Timestamp.now()
      };
      
      batch.set(newMessageRef, newMessage);
    });
  };

  const handleSendNow = async (workflow: Workflow) => {
    if (!user || !firestore || !patients) return;

    let patientsScheduled = 0;
    let patientsWithoutDate = 0;
    let patientsWithExistingMessages = 0;
    
    const patientsMap = new Map(patients.map(p => [p.id, p]));
    // Coleção global para verificar duplicidade (conforme o Cron espera)
    const scheduledMessagesCollection = collection(firestore, `scheduledMessages`);

    // Inicia um lote de gravação (Batch)
    const batch = writeBatch(firestore);

    for (const patientId of workflow.patients) {
        const patientData = patientsMap.get(patientId);
        
        if (!patientData) continue;
        
        // Verifica se tem próxima consulta e se é futura
        if (patientData.nextAppointment && patientData.nextAppointment.toDate() > new Date()) {
            const appointmentDate = patientData.nextAppointment.toDate();
            
            // Verifica se já existe mensagem agendada para não duplicar
            const q = query(
              scheduledMessagesCollection, 
              where("patientId", "==", patientId),
              where("workflowId", "==", workflow.id),
              where("status", "==", "Agendado")
            );
            const existingMessagesSnapshot = await getDocs(q);

            if (existingMessagesSnapshot.empty) {
                // Passamos o batch para agendar
                scheduleMessagesForAppointment(user.uid, patientId, appointmentDate, workflow, batch);
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

    // Se houve agendamentos, salva tudo no banco
    if (patientsScheduled > 0) {
        try {
            await batch.commit();
            toast({
                title: "Fluxo iniciado!",
                description: `Mensagens agendadas para ${patientsScheduled} paciente(s). O sistema enviará automaticamente.`,
            });
        } catch (error) {
            console.error("Erro ao salvar lote:", error);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao agendar mensagens." });
        }
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
            description: `Este fluxo já estava ativo para ${patientsWithExistingMessages} paciente(s).`
        })
    }

    if (patientsWithoutDate > 0) {
      toast({
        variant: "destructive",
        title: "Aviso de Dados",
        description: `${patientsWithoutDate} paciente(s) ignorados por estarem sem data de próxima consulta.`
      })
    }
  };
  
  const getScheduleDescription = (wf: Workflow) => {
    if (!wf.steps || wf.steps.length === 0) return "Nenhum passo";
    
    const { schedule } = wf.steps[0];

    if (schedule.triggerType === 'specific') {
        const date = (schedule.dateTime as any).toDate ? (schedule.dateTime as any).toDate() : new Date();
        return `Em ${format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`;
    }

    if (schedule.triggerType === 'relative') {
        const { quantity, unit, event } = schedule;
        const unitMap: Record<string, string> = {
            hours: "hora(s)",
            days: "dia(s)",
            weeks: "semana(s)",
            months: "mês(es)"
        };
        const friendlyUnit = unitMap[unit] || unit;
        return `${quantity} ${friendlyUnit} ${event === 'before' ? 'antes' : 'depois'} da consulta`;
    }
    
    return "Agendamento inválido";
  }
  
  const renderEmptyState = () => (
    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm mt-8 min-h-[400px] bg-muted/5">
      <div className="flex flex-col items-center gap-6 text-center p-12 max-w-md"> 
        <div className="bg-primary/10 p-4 rounded-full">
           <WorkflowIcon className="h-10 w-10 text-primary" /> 
        </div>
        
        <div className="space-y-2">
          <h3 className="text-2xl font-bold tracking-tight">Nenhum fluxo criado</h3>
          <p className="text-sm text-muted-foreground">
            Automatize sua comunicação criando sequências de mensagens inteligentes.
          </p>
        </div>
  
        <Button className="mt-4 w-full sm:w-auto" asChild>
          <Link href="/workflows/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Criar Primeiro Fluxo
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