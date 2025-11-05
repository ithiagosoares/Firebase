
"use client"

import { useState, useMemo, useEffect } from "react"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, PlusCircle, Loader2, Lightbulb } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MultiSelect } from "@/components/ui/multi-select"
import { type Patient, type Template, type WorkflowStep } from "@/lib/types"
import { collection } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

import { useUser, useFirestore, useMemoFirebase } from "@/firebase/provider"
import { useCollection } from "@/firebase/firestore/use-collection"
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates"

export default function NewWorkflowPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user, isUserLoading: isUserLoadingUser } = useUser();
    const firestore = useFirestore();

    const [title, setTitle] = useState("");
    const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
    const [steps, setSteps] = useState<Partial<WorkflowStep>[]>([
        { template: '', schedule: { quantity: 1, unit: 'days', event: 'before' } }
    ]);

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

    const patientOptions = useMemo(() => {
        return patients ? patients.map(p => ({ value: p.id, label: p.name })) : [];
    }, [patients]);
    
    const templateOptions = useMemo(() => {
        return templates ? templates.map(t => ({ value: t.id, label: t.title })) : [];
    }, [templates]);

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

    const handleSaveWorkflow = () => {
        if (!user) return;
        const workflowsCollection = collection(firestore, `users/${user.uid}/workflows`);
        const newWorkflow = {
            title,
            patients: selectedPatients,
            steps,
            active: true,
            target: "Pacientes selecionados" // or derive from selection
        };
        addDocumentNonBlocking(workflowsCollection, newWorkflow);
        toast({ title: "Fluxo salvo!", description: "Seu novo fluxo de automação foi criado." });
        router.push("/workflows");
    };

    if (isUserLoadingUser || isLoadingPatients || isLoadingTemplates) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    }

  return (
    <>
        <PageHeader title="Criar Novo Fluxo" />
        
        <Alert className="bg-blue-50 border-blue-200 text-blue-900 mb-8">
            <Lightbulb className="h-4 w-4 text-blue-600" />
            <AlertTitle className="font-bold text-blue-800">Dicas Importantes</AlertTitle>
            <AlertDescription className="space-y-1 mt-2">
                <p>• Os fluxos são acionados pela data em <strong>"Próxima Consulta"</strong> no cadastro do paciente. Pacientes sem essa data serão ignorados.</p>
                <p>• A opção "Enviar Agora" em um fluxo existente aplicará as regras apenas para pacientes que já têm uma próxima consulta agendada.</p>
                <p>• Se adicionar um novo paciente a um fluxo depois, você pode usar a opção "Enviar Agora" para agendar as mensagens para ele.</p>
            </AlertDescription>
        </Alert>

        <Card>
            <CardHeader>
            <CardTitle>Configuração do Fluxo</CardTitle>
            <CardDescription>Defina regras para enviar mensagens automaticamente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="workflow-name">Nome do Fluxo</Label>
                <Input id="workflow-name" placeholder="Ex: Lembretes de Retorno" value={title} onChange={e => setTitle(e.target.value)} />
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
            <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" asChild>
                <Link href="/workflows">Cancelar</Link>
            </Button>
            <Button onClick={handleSaveWorkflow}>Salvar Fluxo</Button>
            </CardFooter>
        </Card>
    </>
  )
}
