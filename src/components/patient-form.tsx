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
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

import { useUser, useFirestore } from "@/firebase/provider"
import { setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates"

type PatientFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  patient: Patient | null
}

export function PatientForm({ open, onOpenChange, patient }: PatientFormProps) {
  const { user } = useUser();
  const firestore = useFirestore();

  const [name, setName] = useState("")
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("")
  const [lastAppointmentDate, setLastAppointmentDate] = useState<Date | undefined>()
  const [nextAppointmentDate, setNextAppointmentDate] = useState<Date | undefined>()
  const [nextAppointmentTime, setNextAppointmentTime] = useState("")
  const [consentGiven, setConsentGiven] = useState(true)

  const combineDateTime = (date: Date | undefined, time: string): Date | undefined => {
    if (!date) return undefined;
    if (!time) return date; // Return just the date if no time is provided
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

        // Handle lastAppointment
        if (patient.lastAppointment) {
          const lastDate = patient.lastAppointment instanceof Timestamp ? patient.lastAppointment.toDate() : patient.lastAppointment;
          setLastAppointmentDate(lastDate);
        } else {
          setLastAppointmentDate(undefined);
        }
        
        // Handle nextAppointment
        if (patient.nextAppointment) {
          const nextDate = patient.nextAppointment instanceof Timestamp ? patient.nextAppointment.toDate() : patient.nextAppointment;
          setNextAppointmentDate(nextDate);
          setNextAppointmentTime(format(nextDate, "HH:mm"));
        } else {
          setNextAppointmentDate(undefined);
          setNextAppointmentTime("");
        }

        setConsentGiven(true) // Assuming existing patients have consented
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
  
  const handleSubmit = () => {
    if (!user || !firestore) return;

    const lastAppointment = lastAppointmentDate;
    const nextAppointment = combineDateTime(nextAppointmentDate, nextAppointmentTime);

    const patientData: Partial<Patient> = {
      name,
      email,
      phone,
      status: "Ativo", // Default status
      lastAppointment: lastAppointment ? Timestamp.fromDate(lastAppointment) : undefined,
      nextAppointment: nextAppointment ? Timestamp.fromDate(nextAppointment) : undefined,
    };

    if (patient) {
      // Update existing patient
      const patientDocRef = doc(firestore, `users/${user.uid}/patients/${patient.id}`);
      setDocumentNonBlocking(patientDocRef, patientData, { merge: true });
    } else {
      // Add new patient
      const patientsCollection = collection(firestore, `users/${user.uid}/patients`);
      addDocumentNonBlocking(patientsCollection, patientData);
    }
    onOpenChange(false);
  }

  const dialogTitle = patient ? "Editar Paciente" : "Adicionar Paciente"
  const dialogDescription = patient 
    ? "Altere os dados do paciente." 
    : "Preencha os dados do novo paciente."
    
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of today

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo <span className="text-destructive">*</span></Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome Completo" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail <span className="text-destructive">*</span></Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(99) 99999-9999" />
          </div>
           <div className="space-y-2">
            <Label htmlFor="lastAppointment">Última Consulta</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !lastAppointmentDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {lastAppointmentDate ? format(lastAppointmentDate, "dd/MM/yyyy") : <span>Selecione uma data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={lastAppointmentDate}
                    onSelect={setLastAppointmentDate}
                    disabled={{ after: today }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
           <div className="space-y-2">
            <Label htmlFor="nextAppointment">Próxima Consulta <span className="text-destructive">*</span></Label>
            <div className="flex gap-2">
                <Popover>
                <PopoverTrigger asChild>
                    <Button
                    variant={"outline"}
                    className={cn(
                        "w-2/3 justify-start text-left font-normal",
                        !nextAppointmentDate && "text-muted-foreground"
                    )}
                    >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {nextAppointmentDate ? format(nextAppointmentDate, "dd/MM/yyyy") : <span>Selecione uma data</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar
                    mode="single"
                    selected={nextAppointmentDate}
                    onSelect={setNextAppointmentDate}
                    disabled={{ before: today }}
                    initialFocus
                    />
                </PopoverContent>
                </Popover>
                <Input
                    type="time"
                    value={nextAppointmentTime}
                    onChange={(e) => setNextAppointmentTime(e.target.value)}
                    className="w-1/3"
                />
            </div>
          </div>
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox 
              id="lgpd-consent" 
              checked={consentGiven}
              onCheckedChange={(checked) => setConsentGiven(checked as boolean)}
              disabled={!!patient} // Cannot change consent for existing patients in this form
            />
            <Label htmlFor="lgpd-consent" className="text-sm font-normal text-muted-foreground">
              O paciente autoriza o uso dos seus dados para comunicações, de acordo com a LGPD.
            </Label>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={!consentGiven}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
