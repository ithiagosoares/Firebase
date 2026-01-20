"use client"

import { useState, useMemo } from "react"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Calendar } from "@/components/ui/calendar"
import { Trash2, PlusCircle, Loader2, Lightbulb, Calendar as CalendarIcon, Clock } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MultiSelect } from "@/components/ui/multi-select"
import { type Patient, type Template, type PartialWorkflowStep, type Schedule, WithId } from "@/lib/types"
import { collection, Timestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

import { useUser, useFirestore, useMemoFirebase } from "@/firebase/provider"
import { useCollection } from "@/firebase/firestore/use-collection"
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates"

// --- ALTERAÇÃO 1: Importar os templates padrões ---
import { defaultTemplates } from "@/data/defaultTemplates"

const defaultStep: PartialWorkflowStep = {
    template: '',
    schedule: { 
        triggerType: 'relative', 
        quantity: 1, 
        unit: 'days', 
        event: 'before' 
    }
};

export default function NewWorkflowPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user, isUserLoading: isUserLoadingUser } = useUser();
    const firestore = useFirestore();

    const [title, setTitle] = useState("");
    const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
    const [steps, setSteps] = useState<PartialWorkflowStep[]>([defaultStep]);

    const patientsCollection = useMemoFirebase(() => {
        if (!user) return null;
        return collection(firestore, `users/${user.uid}/patients`);
    }, [firestore, user]);
    const { data: patients, isLoading: isLoadingPatients } = useCollection<Patient>(patientsCollection);

    const templatesCollection = useMemoFirebase(() => {
        if (!user) return null;
        return collection(firestore, `users/${user.uid}/messageTemplates`);
    }, [firestore, user]);
    const { data: templates, isLoading: isLoadingTemplates } = useCollection<WithId<Template>>(templatesCollection);

    const patientOptions = useMemo(() => {
        return patients ? patients.map(p => ({ value: p.id, label: p.name })) : [];
    }, [patients]);
    
    // --- ALTERAÇÃO 2: Mesclar templates padrões com os do banco ---
    const templateOptions = useMemo(() => {
        const defaultOpts = defaultTemplates.map(t => ({
            value: t.name,
            label: t.name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        }));

        const customOpts = templates ? templates.map(t => ({ 
            value: t.id, 
            label: t.title 
        })) : [];

        return [...defaultOpts, ...customOpts];
    }, [templates]);

    const handleAddStep = () => {
        setSteps([...steps, { ...defaultStep, schedule: { ...defaultStep.schedule } }]);
    };

    const handleRemoveStep = (index: number) => {
        const newSteps = steps.filter((_, i) => i !== index);
        setSteps(newSteps);
    };

    const handleStepChange = (index: number, field: string, value: any) => {
        setSteps(prevSteps => {
            const newSteps = [...prevSteps];
            const step = { ...newSteps[index] }; 

            if (field.startsWith("schedule.")) {
                const scheduleField = field.split(".")[1];
                let newSchedule = { ...step.schedule };

                if (scheduleField === 'triggerType') {
                    if (value === 'relative') {
                        newSchedule = { 
                            triggerType: 'relative', 
                            quantity: 1, 
                            unit: 'days', 
                            event: 'before' 
                        };
                    } else {
                        const existingSpecific = step.schedule?.triggerType === 'specific' ? (step.schedule as any).dateTime : new Date();
                        newSchedule = { 
                            triggerType: 'specific',
                            dateTime: Timestamp.fromDate(existingSpecific)
                        };
                    }
                } else {
                     (newSchedule as any)[scheduleField] = value;
                }
                step.schedule = newSchedule;

            } else {
                (step as any)[field] = value;
            }
            
            newSteps[index] = step;
            return newSteps;
        });
    };

    const handleSpecificDateTimeChange = (index: number, newDate: Date | undefined, newTime: string | undefined) => {
        setSteps(prevSteps => {
            const newSteps = [...prevSteps];
            const step = { ...newSteps[index] };
            if (step.schedule?.triggerType !== 'specific') return prevSteps;

            const currentTimestamp = (step.schedule as any).dateTime;
            const currentDate = currentTimestamp ? currentTimestamp.toDate() : new Date();
            
            let finalDate = currentDate;

            if (newDate) {
                finalDate.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
            }

            if (newTime) {
                const [hours, minutes] = newTime.split(':').map(Number);
                finalDate.setHours(hours, minutes);
            }
            
            const newSchedule = { ...step.schedule, dateTime: Timestamp.fromDate(finalDate) };
            step.schedule = newSchedule as Schedule;
            newSteps[index] = step;
            return newSteps;
        });
    };

    const handleSaveWorkflow = () => {
        if (!user) return;
        const workflowsCollection = collection(firestore, `users/${user.uid}/workflows`);
        
        try {
            const cleanedSteps = steps.map(step => {
                if (!step.template) {
                    throw new Error("Todos os passos devem ter um template selecionado.");
                }
                if (step.schedule?.triggerType === 'relative') {
                    const { triggerType, quantity, unit, event } = step.schedule;
                    return { template: step.template, schedule: { triggerType, quantity, unit, event } };
                } else if (step.schedule?.triggerType === 'specific') {
                    const { triggerType, dateTime } = step.schedule as any;
                    return { template: step.template, schedule: { triggerType, dateTime } };
                }
                throw new Error("Tipo de agendamento inválido em um dos passos.");
            });

            const newWorkflow = {
                title,
                patients: selectedPatients,
                steps: cleanedSteps,
                active: true,
                target: "Pacientes selecionados"
            };

            addDocumentNonBlocking(workflowsCollection, newWorkflow);
            toast({ title: "Fluxo salvo!", description: "Seu novo fluxo de automação foi criado." });
            router.push("/workflows");
        } catch (error) {
            console.error("Erro ao salvar fluxo: ", error);
            toast({ title: "Erro", description: (error as Error).message, variant: "destructive" });
        }
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
                <p>• O gatilho <strong>Relativo à Consulta</strong> usa a data em "Próxima Consulta" no cadastro do paciente.</p>
                <p>• O gatilho <strong>Data e Hora Específica</strong> envia a mensagem na data e hora exatas que você definir, para todos os pacientes do fluxo.</p>
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

                    <div className="space-y-3">
                        <Label>Gatilho de Envio</Label>
                        <RadioGroup 
                            value={step.schedule?.triggerType}
                            onValueChange={(value) => handleStepChange(index, 'schedule.triggerType', value)}
                            className="flex space-x-4"
                        >
                            <div className="flex items-center space-x-2"><RadioGroupItem value="relative" id={`relative-${index}`} /><Label htmlFor={`relative-${index}`}>Relativo à Consulta</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="specific" id={`specific-${index}`} /><Label htmlFor={`specific-${index}`}>Data e Hora Específica</Label></div>
                        </RadioGroup>
                    </div>

                    {step.schedule?.triggerType === 'relative' && (
                        <div className="space-y-2 animate-in fade-in">
                            <Label>Quando enviar?</Label>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span>Enviar</span>
                                <Input type="number" value={step.schedule?.quantity} onChange={e => handleStepChange(index, 'schedule.quantity', parseInt(e.target.value))} className="w-16" />
                                <Select value={step.schedule?.unit} onValueChange={value => handleStepChange(index, 'schedule.unit', value)}>
                                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="hours">Horas</SelectItem>
                                        <SelectItem value="days">Dias</SelectItem>
                                        <SelectItem value="weeks">Semanas</SelectItem>
                                        <SelectItem value="months">Meses</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={step.schedule?.event} onValueChange={value => handleStepChange(index, 'schedule.event', value)}>
                                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="before">Antes da consulta</SelectItem>
                                        <SelectItem value="after">Depois da consulta</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {step.schedule?.triggerType === 'specific' && (
                        <div className="space-y-2 animate-in fade-in">
                             <Label>Em qual data e hora?</Label>
                             <div className="flex items-center gap-2 flex-wrap">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn("w-[240px] justify-start text-left font-normal", !(step.schedule as any).dateTime && "text-muted-foreground")}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {(step.schedule as any).dateTime ? format((step.schedule as any).dateTime.toDate(), "PPP") : <span>Escolha uma data</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={(step.schedule as any).dateTime?.toDate()}
                                            onSelect={(date) => handleSpecificDateTimeChange(index, date, undefined)}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        type="time"
                                        className="w-32 pl-10"
                                        value={(step.schedule as any).dateTime ? format((step.schedule as any).dateTime.toDate(), "HH:mm") : '09:00'}
                                        onChange={(e) => handleSpecificDateTimeChange(index, undefined, e.target.value)}
                                    />
                                </div>
                             </div>
                        </div>
                    )}
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