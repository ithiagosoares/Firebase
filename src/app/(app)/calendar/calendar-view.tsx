"use client"

import { useState, useEffect, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type Appointment, type Patient } from "@/lib/types"
import { collection, doc, Timestamp } from "firebase/firestore"
import { Loader2 } from "lucide-react"
import { isSameDay, format, parse } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { ClientSideDateTime } from "@/components/client-side-date-time"
import { useUser, useFirestore, useMemoFirebase } from "@/firebase/provider"
import { useCollection } from "@/firebase/firestore/use-collection"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"

export default function CalendarView() {
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([])
  // Inicializa como undefined para evitar erro de hidratação com datas diferentes entre server/client
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [isMounted, setIsMounted] = useState(false) // Novo estado para controlar hidratação

  const { user } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()

  // Garante que o componente só renderiza a UI final após montar no cliente
  useEffect(() => {
    setIsMounted(true)
    setSelectedDate(new Date()) // Define a data apenas no cliente
  }, [])

  const patientsCollection = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/patients`);
  }, [firestore, user]);
  
  const { data: patients, isLoading: isLoadingPatients } = useCollection<Patient>(patientsCollection);

  useEffect(() => {
    if (patients) {
        const derivedAppointments: Appointment[] = patients
            .filter(p => p.nextAppointment)
            .map(p => ({
                id: p.id,
                dateTime: p.nextAppointment as Timestamp,
                patientName: p.name,
                type: 'Consulta',
                userId: user?.uid || '',
                patientId: p.id,
                notes: ''
            }));
        
        setAllAppointments(derivedAppointments);
    }
  }, [patients, user]);

  const appointmentDates = useMemo(() => {
    return allAppointments.map(apt => apt.dateTime.toDate());
  }, [allAppointments]);

  const todaysAppointments = useMemo(() => {
    if (!selectedDate) return []
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const zonedSelectedDate = toZonedTime(selectedDate, timeZone)

    return allAppointments.filter(apt => {
      const zonedAptDate = toZonedTime(apt.dateTime.toDate(), timeZone)
      return isSameDay(zonedAptDate, zonedSelectedDate)
    })
  }, [allAppointments, selectedDate])

  const saveAppointment = async () => {
    if (!user || !selectedDate || !patients || patients.length === 0) {
        toast({
            variant: "destructive",
            title: "Não é possível salvar",
            description: "É necessário ter pacientes cadastrados."
        });
        return;
    }

    const firstPatient = patients[0];
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    const localDateStr = format(selectedDate, 'yyyy-MM-dd');
    const localTimeStr = '11:00';
    const localDateTimeStr = `${localDateStr} ${localTimeStr}`;
    const localDateTime = parse(localDateTimeStr, "yyyy-MM-dd HH:mm", new Date());

    const utcDate = toZonedTime(localDateTime, timeZone);
    
    const patientDocRef = doc(firestore, `users/${user.uid}/patients/${firstPatient.id}`);
    
    await setDocumentNonBlocking(patientDocRef, {
        nextAppointment: Timestamp.fromDate(utcDate),
        status: 'Ativo',
        updatedAt: Timestamp.now()
    }, { merge: true });

    toast({
        title: "Consulta Agendada!",
        description: `Consulta para ${firstPatient.name} definida para ${localDateTime.toLocaleString()}.`
    });
  };

  // Se não estiver montado (Server side) OU estiver carregando dados, mostra Loader.
  // Isso resolve o erro de Hydration Failed garantindo que Server e Client inicial sejam iguais (Loader).
  if (!isMounted || isLoadingPatients) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={saveAppointment} disabled={!patients || patients.length === 0}>
            Agendar Consulta Teste (11:00)
        </Button>
      </div>
      <div className="grid md:grid-cols-[1fr_350px] gap-8 items-start">
        <Card>
          <CardContent className="p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="p-3 w-full"
              classNames={{
                day_selected:
                  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day_today: "bg-accent text-accent-foreground",
              }}
              modifiers={{
                withAppointment: appointmentDates,
              }}
              modifiersClassNames={{
                withAppointment: 'day-with-appointment',
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Consultas do Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todaysAppointments.length > 0 ? (
                todaysAppointments.map((apt) => (
                  <div key={apt.id} className="flex items-start gap-4 border-b pb-4 last:border-0">
                    <div className="font-semibold text-primary">
                        <ClientSideDateTime date={apt.dateTime} showTime={true} timeOnly={true} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{apt.patientName}</p>
                      <p className="text-sm text-muted-foreground">Consulta Agendada</p>
                    </div>
                    <Badge>Agendado</Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                    <p className="text-muted-foreground">Nenhuma consulta para este dia.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}