"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { type Patient } from "@/lib/types"
import { collection, doc, Timestamp } from "firebase/firestore"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

import { useUser, useFirestore } from "@/firebase/provider"
import { setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useToast } from "@/hooks/use-toast"

type PatientFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  patient: Patient | null
}

export function PatientForm({ open, onOpenChange, patient }: PatientFormProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState("")
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("")
  const [lastAppointmentDate, setLastAppointmentDate] = useState<Date | undefined>()
  const [nextAppointmentDate, setNextAppointmentDate] = useState<Date | undefined>()
  const [nextAppointmentTime, setNextAppointmentTime] = useState("")
  const [consentGiven, setConsentGiven] = useState(true)

  const combineDateTime = (date: Date | undefined, time: string): Date | undefined => {
    if (!date) return undefined;
    if (!time) return date; 
    const [hours, minutes] = time.split(':').map(Number);
    const newDate = new Date(date);
    newDate.setHours(hours || 0, minutes || 0, 0, 0);
    return newDate;
  };

  useEffect(() => {
    if (open) {
      if (patient) {
        setName(patient.name || "");
        setEmail(patient.email || "");
        setPhone(patient.phone || "");

        if (patient.lastAppointment) {
          const lastDate = patient.lastAppointment instanceof Timestamp ? patient.lastAppointment.toDate() : patient.lastAppointment;
          setLastAppointmentDate(lastDate);
        } else {
          setLastAppointmentDate(undefined);
        }
        
        if (patient.nextAppointment) {
          const nextDate = patient.nextAppointment instanceof Timestamp ? patient.nextAppointment.toDate() : patient.nextAppointment;
          setNextAppointmentDate(nextDate);
          setNextAppointmentTime(format(nextDate, "HH:mm"));
        } else {
          setNextAppointmentDate(undefined);
          setNextAppointmentTime("");
        }

        setConsentGiven(true) 
      } else {
        setName("")
        setEmail("")
        setPhone("")
        setLastAppointmentDate(undefined)
        setNextAppointmentDate(undefined)
        setNextAppointmentTime("")
        setConsentGiven(false)
      }
    }
  }, [patient, open])
  
  const handleSubmit = async () => {
    if (!user || !firestore) return;

    if (!name || !email) {
        toast({ variant: "destructive", title: "Erro", description: "Nome e E-mail são obrigatórios." });
        return;
    }

    setIsSubmitting(true);

    try {
        const lastAppointment = lastAppointmentDate;
        const nextAppointment = combineDateTime(nextAppointmentDate, nextAppointmentTime);

        // --- LÓGICA DE STATUS AUTOMÁTICO (ITEM 3) ---
        // Se tiver Data E Hora da próxima consulta, é Ativo. Senão, Incompleto.
        const derivedStatus = (nextAppointmentDate && nextAppointmentTime) ? "Ativo" : "Incompleto";

        const patientData: any = {
            name,
            email,
            phone,
            status: derivedStatus, // Usamos o status calculado
            lastAppointment: lastAppointment ? Timestamp.fromDate(lastAppointment) : undefined,
            nextAppointment: nextAppointment ? Timestamp.fromDate(nextAppointment) : undefined,
            updatedAt: Timestamp.now()
        };

        if (patient) {
            // Update
            const patientDocRef = doc(firestore, `users/${user.uid}/patients/${patient.id}`);
            await setDocumentNonBlocking(patientDocRef, patientData, { merge: true });
            toast({ title: "Sucesso", description: "Dados do paciente atualizados." });
        } else {
            // Create
            const patientsCollection = collection(firestore, `users/${user.uid}/patients`);
            await addDocumentNonBlocking(patientsCollection, {
                ...patientData,
                createdAt: Timestamp.now()
            });
            toast({ title: "Sucesso", description: "Paciente adicionado com sucesso." });
        }
        
        onOpenChange(false);

    } catch (error) {
        console.error("Erro ao salvar paciente:", error);
        toast({ variant: "destructive", title: "Erro", description: "Ocorreu um erro ao salvar. Tente novamente." });
    } finally {
        setIsSubmitting(false);
    }
  }

  const dialogTitle = patient ? "Editar Paciente" : "Adicionar Paciente"
  const dialogDescription = patient 
    ? "Altere os dados do paciente abaixo." 
    : "Preencha os dados do novo paciente."
    
  const today = new Date();
  today.setHours(0, 0, 0, 0); 

  return (
    <Dialog open={open} onOpenChange={(val) => !isSubmitting && onOpenChange(val)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo <span className="text-destructive">*</span></Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome Completo" disabled={isSubmitting} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail <span className="text-destructive">*</span></Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" disabled={isSubmitting} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(99) 99999-9999" disabled={isSubmitting} />
          </div>
           
           <div className="space-y-2">
            <Label htmlFor="lastAppointment">Última Consulta</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !lastAppointmentDate && "text-muted-foreground")} disabled={isSubmitting}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {lastAppointmentDate ? format(lastAppointmentDate, "dd/MM/yyyy") : <span>Selecione uma data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={lastAppointmentDate} onSelect={setLastAppointmentDate} disabled={{ after: today }} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

           <div className="space-y-2">
            <Label htmlFor="nextAppointment">Próxima Consulta <span className="text-destructive">*</span></Label>
            <div className="flex gap-2">
                <Popover>
                <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-2/3 justify-start text-left font-normal", !nextAppointmentDate && "text-muted-foreground")} disabled={isSubmitting}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {nextAppointmentDate ? format(nextAppointmentDate, "dd/MM/yyyy") : <span>Selecione uma data</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={nextAppointmentDate} onSelect={setNextAppointmentDate} disabled={{ before: today }} initialFocus />
                </PopoverContent>
                </Popover>
                <Input type="time" value={nextAppointmentTime} onChange={(e) => setNextAppointmentTime(e.target.value)} className="w-1/3" disabled={isSubmitting} />
            </div>
            {/* Aviso visual sobre o status */}
            {(!nextAppointmentDate || !nextAppointmentTime) && (
                <p className="text-xs text-amber-600 mt-1">
                    Sem a data e hora da próxima consulta, o paciente ficará com status <strong>Incompleto</strong>.
                </p>
            )}
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox id="lgpd-consent" checked={consentGiven} onCheckedChange={(checked) => setConsentGiven(checked as boolean)} disabled={!!patient || isSubmitting} />
            <Label htmlFor="lgpd-consent" className="text-sm font-normal text-muted-foreground">O paciente autoriza o uso dos seus dados.</Label>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isSubmitting}>Cancelar</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={!consentGiven || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}