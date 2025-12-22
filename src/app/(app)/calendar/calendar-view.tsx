
"use client"

import { useState, useEffect, useMemo } from "react"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type Appointment, type Patient } from "@/lib/types"
import { collection, query, where, getDocs, DocumentData, Query, Timestamp } from "firebase/firestore"
import { Loader2 } from "lucide-react"
import { isSameDay, format, parse } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { ClientSideDateTime } from "@/components/client-side-date-time"
import { useUser, useFirestore, useMemoFirebase } from "@/firebase/provider"
import { useCollection } from "@/firebase/firestore/use-collection"
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { FirestorePermissionError } from "@/firebase/errors"
import { errorEmitter } from "@/firebase/error-emitter"


export default function CalendarView() { // Renomeado para CalendarView
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

  const { user } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()

  const patientsCollection = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/patients`);
  }, [firestore, user]);
  const { data: patients, isLoading: isLoadingPatients } = useCollection<Patient>(patientsCollection);

  const fetchAppointments = async () => {
      if (!user || !firestore || !patients) return

      try {
        const appointmentPromises = patients.map(patient => {
            const appointmentsRef = collection(firestore, `users/${user.uid}/patients/${patient.id}/appointments`);
            return getDocs(appointmentsRef);
        });

        const appointmentSnapshots = await Promise.all(appointmentPromises);
        
        const fetchedAppointments = appointmentSnapshots.flatMap((snapshot, index) => {
            const patientName = patients[index].name;
            return snapshot.docs.map(doc => {
                 const data = doc.data();
                 return {
                    id: doc.id,
                    ...data,
                    patientName: patientName || 'Paciente',
                    type: data.notes || 'Consulta'
                 } as Appointment
            });
        });
        
        setAllAppointments(fetchedAppointments);

      } catch (serverError) {
        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path: `appointments for user ${user.uid}`, // Simplified path
        });
        errorEmitter.emit('permission-error', contextualError);
      } finally {
        setLoading(false)
      }
    }

  useEffect(() => {
    if (user && firestore && !isLoadingPatients) {
      fetchAppointments()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, firestore, patients, isLoadingPatients])

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
            description: "Selecione uma data e tenha certeza de que há pacientes cadastrados."
        });
        return;
    }

    const firstPatient = patients[0];
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Combine date and time safely
    const localDateStr = format(selectedDate, 'yyyy-MM-dd');
    const localTimeStr = '11:00';
    const localDateTimeStr = `${localDateStr} ${localTimeStr}`;
    
    const localDateTime = parse(localDateTimeStr, "yyyy-MM-dd HH:mm", new Date());

    // Convert the explicit local date/time to a UTC date object before creating the Timestamp
    const utcDate = toZonedTime(localDateTime, timeZone);
    
    const newAppointment = {
        patientId: firstPatient.id,
        userId: user.uid,
        dateTime: Timestamp.fromDate(utcDate),
        notes: "Consulta agendada"
    };

    const appointmentsCollection = collection(firestore, `users/${user.uid}/patients/${firstPatient.id}/appointments`);
    await addDocumentNonBlocking(appointmentsCollection, newAppointment);

    toast({
        title: "Consulta Agendada!",
        description: `Consulta para ${firstPatient.name} em ${localDateTime.toLocaleString()} foi agendada.`
    });
    fetchAppointments(); // Re-fetch appointments to update the UI
  };

  if (loading || isLoadingPatients) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <PageHeader title="Calendário de Consultas">
        <Button onClick={saveAppointment}>Agendar Consulta para 11:00</Button>
      </PageHeader>
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
                  <div key={apt.id} className="flex items-start gap-4">
                    <div className="font-semibold"><ClientSideDateTime date={apt.dateTime} showTime={true} timeOnly={true} /></div>
                    <div className="flex-1">
                      <p className="font-medium">{apt.patientName}</p>
                      <p className="text-sm text-muted-foreground">{apt.type}</p>
                    </div>
                    <Badge variant={apt.type === 'Retorno' ? 'secondary' : 'default'}>
                      {apt.type === 'Primeira Consulta' ? 'Novo' : apt.type === 'Retorno' ? 'Retorno' : 'Rotina'}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center">Nenhuma consulta para este dia.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
