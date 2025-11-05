"use client"

import { useState, useEffect, useMemo } from "react"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, PlusCircle, Send, Loader2, Lightbulb } from "lucide-react"
import Link from "next/link"
import { MultiSelect } from "@/components/ui/multi-select"
import { useToast } from "@/hooks/use-toast"
import { useRouter, useParams } from "next/navigation"
import { type Patient, type Workflow, type Template, WorkflowStep, ScheduledMessage } from "@/lib/types"
import { doc, collection, writeBatch, query, where, getDocs, Timestamp } from "firebase/firestore"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { add, sub } from "date-fns"

import { useUser, useFirestore, useMemoFirebase } from "@/firebase/provider"
import { useDoc } from "@/firebase/firestore/use-doc"
import { useCollection } from "@/firebase/firestore/use-collection"
import { addDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates"

export default function EditWorkflowPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();

  const { user, isUserLoading: isUserLoadingUser } = useUser();
  const firestore = useFirestore();

  const workflowDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, `users/${user.uid}/workflows/${id}`);
  }, [firestore, user, id]);
  const { data: workflow, isLoading: isLoadingWorkflow } = useDoc<Workflow>(workflowDocRef);
  
  const patientsCollection = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/patients`);
  }, [firestore, user]);
  const { data: patients, isLoading: isLoadingPatients } = useCollection<Patient>(patientsCollection);

  const templatesCollection = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/messageTemplates`);
  }, [firestore, user]);
  const { data: templates, isLoading: isLoadingTemplates } = useCollection<Template>(templatesCollection);


  const [title, setTitle] = useState("");
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [steps, setSteps] = useState<Partial<WorkflowStep>[]>([]);
  
  const originalPatientIds = useMemo(() => workflow?.patients || [], [workflow]);

  useEffect(() => {
    if (workflow) {
      setTitle(workflow.title);
      setSelectedPatients(workflow.patients);
      setSteps(workflow.steps.map(step => ({
        ...step,
        schedule: {
          quantity: step.schedule.quantity || 1,
          unit: step.schedule.unit || 'days',
          event: step.schedule.event || 'before',
        }
      })));
    }
  }, [workflow]);
  
    const patientOptions = useMemo(() => {
        return patients ? patients.map(p => ({ value: p.id, label: p.name })) : [];
    }, [patients]);
    
    const templateOptions = useMemo(() => {
        return templates ? templates.map(t => ({ value: t.id, label: t.title })) : [];
    }, [templates]);

  const newlyAddedPatients = useMemo(() => {
    return selectedPatients.filter(p => !originalPatientIds.includes(p));
  }, [selectedPatients, originalPatientIds]);

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

  const handleSendToNew = async () => {
    if (!user || !firestore || !patients || !workflow) return;

    let patientsScheduled = 0;
    let patientsWithoutDate = 0;
    
    const patientsMap = new Map(patients.map(p => [p.id, p]));
    const scheduledMessagesCollection = collection(firestore, `users/${user.uid}/scheduledMessages`);

    for (const patientId of newlyAddedPatients) {
        const patientData = patientsMap.get(patientId);
        if (!patientData) continue;
        
        if (patientData.nextAppointment && patientData.nextAppointment.toDate() > new Date()) {
            const appointmentDate = patientData.nextAppointment.toDate();
            
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
            }
        } else {
            patientsWithoutDate++;
        }
    }

    toast({
      title: "Envio Concluído!",
      description: `Mensagens foram agendadas para ${patientsScheduled} novo(s) paciente(s).`
    });

    if (patientsWithoutDate > 0) {
      toast({
        variant: "destructive",
        title: "Aviso de Dados",
        description: `${patientsWithoutDate} paciente(s) no fluxo estão sem data de próxima consulta e foram ignorados.`
      })
    }
  }

  const handleSaveChanges = () => {
    if (!workflowDocRef) return;
    const updatedWorkflow = { title, patients: selectedPatients, steps };
    setDocumentNonBlocking(workflowDocRef, updatedWorkflow, { merge: true });
    toast({
      title: "Fluxo salvo!",
      description: "Suas alterações no fluxo foram salvas com sucesso.",
    })
    router.push("/workflows");
  }
  
  const handleAddStep = () => {
    setSteps([...steps, { template: '', schedule: { quantity: 1, unit: 'days', event: 'before' } }]);
  };

  const handleRemoveStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    setSteps(newSteps);
  };
  
  const handleStepChange = (index: number, field: string, value: any) => {
      const newSteps = [...steps];
      const step = newSteps[index];
      if (field.includes("schedule.")) {
          const scheduleField = field.split(".")[1] as keyof WorkflowStep['schedule'];
          if(step.schedule) {
            (step.schedule[scheduleField] as any) = value;
          }
      } else {
          (step as any)[field] = value;
      }
      setSteps(newSteps);
  };


  if (isLoadingWorkflow || isUserLoadingUser || isLoadingPatients || isLoadingTemplates) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  
  if (!workflow) {
    return <div>Fluxo não encontrado.</div>
  }

  return (
    <>
      <PageHeader title={`Editar Fluxo: ${workflow.title}`} />
      
      <Alert className="bg-blue-50 border-blue-200 text-blue-900 mb-8">
          <Lightbulb className="h-4 w-4 text-blue-600" />
          <AlertTitle className="font-bold text-blue-800">Dicas Importantes</AlertTitle>
          <AlertDescription className="space-y-1 mt-2">
              <p>• Os fluxos são acionados pela data em <strong>"Próxima Consulta"</strong> no cadastro do paciente. Pacientes sem essa data serão ignorados.</p>
              <p>• A opção "Enviar Agora" em um fluxo existente aplicará as regras apenas para pacientes que já têm uma próxima consulta agendada.</p>
              <p>• Se adicionar um novo paciente a um fluxo, use o botão <strong>"Enviar para X novo(s)"</strong> para agendar as mensagens para ele.</p>
          </AlertDescription>
      </Alert>

      <Card>
          <CardHeader>
          <CardTitle>Configuração do Fluxo</CardTitle>
          <CardDescription>Ajuste as regras de envio para esta automação.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
          <div className="space-y-2">
              <Label htmlFor="workflow-name">Nome do Fluxo</Label>
              <Input 
              id="workflow-name" 
              placeholder="Ex: Lembretes de Retorno" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              />
          </div>
          <div className="space-y-2">
              <Label htmlFor="patient-group">Para quais pacientes?</Label>
              <MultiSelect
              options={patientOptions}
              onValueChange={setSelectedPatients}
              defaultValue={selectedPatients}
              placeholder="Selecione os pacientes"
              />
          </div>

          <div className="space-y-4">
              <Label>Passos do Fluxo</Label>
              
              {steps.map((step, index) => (
              <div key={index} className="border p-4 rounded-lg space-y-4 relative">
                  <div className="flex justify-between items-center">
                      <h4 className="font-semibold">Passo {index + 1}</h4>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleRemoveStep(index)}>
                          <Trash2 className="h-4 w-4" />
                      </Button>
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor={`template-${index}`}>Template</Label>
                      <Select value={step.template} onValueChange={value => handleStepChange(index, 'template', value)}>
                          <SelectTrigger id={`template-${index}`}>
                          <SelectValue placeholder="Selecione um template" />
                          </SelectTrigger>
                          <SelectContent>
                          {templateOptions.map(t => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="space-y-2">
                      <Label>Quando enviar?</Label>
                      <div className="flex items-center gap-2 flex-wrap">
                          <span>Enviar</span>
                          <Input type="number" value={step.schedule?.quantity} onChange={e => handleStepChange(index, 'schedule.quantity', parseInt(e.target.value))} className="w-16" />
                          <Select value={step.schedule?.unit} onValueChange={value => handleStepChange(index, 'schedule.unit', value)}>
                              <SelectTrigger className="w-32">
                                  <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="hours">Horas</SelectItem>
                                  <SelectItem value="days">Dias</SelectItem>
                                  <SelectItem value="weeks">Semanas</SelectItem>
                                  <SelectItem value="months">Meses</SelectItem>
                              </SelectContent>
                          </Select>
                          <Select value={step.schedule?.event} onValueChange={value => handleStepChange(index, 'schedule.event', value)}>
                              <SelectTrigger className="w-48">
                                  <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="before">Antes da consulta</SelectItem>
                                  <SelectItem value="after">Depois da consulta</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                  </div>
              </div>
              ))}

              <Button variant="outline" className="w-full" onClick={handleAddStep}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Adicionar Passo
              </Button>
          </div>

          </CardContent>
          <CardFooter className="flex justify-between">
          <div>
              {newlyAddedPatients.length > 0 && (
              <Button onClick={handleSendToNew}>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar para {newlyAddedPatients.length} novo(s)
              </Button>
              )}
          </div>
          <div className="flex gap-2">
              <Button variant="outline" asChild>
              <Link href="/workflows">Cancelar</Link>
              </Button>
              <Button onClick={handleSaveChanges}>Salvar Alterações</Button>
          </div>
          </CardFooter>
      </Card>
    </>
  )
}
