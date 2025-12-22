"use client"

import { useState } from "react"
import { MoreHorizontal, PlusCircle, Upload, Loader2 } from "lucide-react"
import { collection, doc } from "firebase/firestore"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PageHeader } from "@/components/page-header"
import { PatientForm } from "@/components/patient-form"
import { type Patient } from "@/lib/types"
import { ClientSideDateTime } from "@/components/client-side-date-time"
import { useUser, useFirestore, useMemoFirebase } from "@/firebase/provider"
import { useCollection } from "@/firebase/firestore/use-collection"
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates"

export default function PatientsView() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()

  const patientsCollection = useMemoFirebase(() => {
    if (!user) return null
    return collection(firestore, `users/${user.uid}/patients`)
  }, [firestore, user])
  
  const { data: patients, isLoading } = useCollection<Patient>(patientsCollection);

  const handleAddPatient = () => {
    setSelectedPatient(null)
    setIsFormOpen(true)
  }

  const handleEditPatient = (patient: Patient) => {
    setSelectedPatient(patient)
    setIsFormOpen(true)
  }
  
  const handleDeletePatient = (patientId: string) => {
    if (!user) return;
    const patientDocRef = doc(firestore, `users/${user.uid}/patients/${patientId}`);
    deleteDocumentNonBlocking(patientDocRef);
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setSelectedPatient(null)
  }

  if (isLoading || isUserLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <PageHeader title="Pacientes">
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Importar via CSV
        </Button>
        <Button onClick={handleAddPatient}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Paciente
        </Button>
      </PageHeader>
      
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paciente</TableHead>
              <TableHead className="hidden md:table-cell">Última Consulta</TableHead>
              <TableHead className="hidden md:table-cell">Próxima Consulta</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients && patients.map((patient) => (
              <TableRow key={patient.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="hidden h-9 w-9 sm:flex">
                       <AvatarImage src={patient.avatarUrl} alt={patient.name} />
                       <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="font-medium">{patient.name}</div>
                    <div className="hidden text-sm text-muted-foreground md:inline">{patient.email}</div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {patient.lastAppointment ? (
                    <ClientSideDateTime date={patient.lastAppointment} />
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {patient.nextAppointment ? (
                    <ClientSideDateTime date={patient.nextAppointment} showTime={true} />
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={patient.status === 'Ativo' ? 'default' : 'secondary'}>{patient.status}</Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleEditPatient(patient)}>Editar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeletePatient(patient.id)}>Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PatientForm 
        open={isFormOpen} 
        onOpenChange={handleFormClose}
        patient={selectedPatient}
      />
    </>
  )
}
