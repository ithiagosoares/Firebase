"use client"

import { useState } from "react" // Adicionado useState
import Link from "next/link"
import { Plus, Loader2, User, Phone } from "lucide-react" 
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// Componentes do seu projeto
import { CsvImporter } from "@/components/csv-importer"
import { PatientForm } from "@/components/patient-form" // <--- Importamos o SEU formulário existente

// Hooks do Firebase
import { useFirebase, useMemoFirebase } from "@/firebase/provider"
import { collection, query, orderBy } from "firebase/firestore"
import { useCollection } from "@/firebase/firestore/use-collection"
import { type Patient } from "@/lib/types" // Importando a tipagem correta

export default function PatientsView() {
  const { firestore, user } = useFirebase()

  // Estado para controlar o modal de Novo Paciente
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Conexão com o banco de dados
  const patientsCollection = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, `users/${user.uid}/patients`), orderBy('createdAt', 'desc'))
  }, [firestore, user]);

  const { data: patients, isLoading } = useCollection<Patient>(patientsCollection);

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Pacientes</h1>
            <p className="text-muted-foreground">Gerencie sua base de contatos.</p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
             <CsvImporter />
             
             {/* Botão que abre o modal existente */}
             <Button onClick={() => setIsDialogOpen(true)} className="flex-1 sm:flex-none">
                <Plus className="mr-2 h-4 w-4" /> Adicionar Paciente
             </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Lista de Pacientes</CardTitle>
            <CardDescription>
                Você tem o total de <strong>{patients?.length || 0}</strong> pacientes cadastrados.
            </CardDescription>
        </CardHeader>
        <CardContent>
            {!patients || patients.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                    Nenhum paciente encontrado. Importe via CSV ou adicione manualmente.
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Paciente</TableHead>
                            <TableHead>Telefone</TableHead>
                            <TableHead>Qualidade do Dado</TableHead>
                            <TableHead className="text-right">Cadastro</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {patients.map((patient) => (
                            <TableRow key={patient.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <User className="h-4 w-4" />
                                        </div>
                                        {patient.name}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Phone className="h-3 w-3" />
                                        {patient.phone || "-"}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge 
                                        variant="outline" 
                                        className={cn(
                                            "border-0",
                                            patient.status === 'Erro' && "bg-red-100 text-red-700 hover:bg-red-100",
                                            patient.status === 'Incompleto' && "bg-amber-100 text-amber-700 hover:bg-amber-100",
                                            (!patient.status || patient.status === 'Ativo') && "bg-green-100 text-green-700 hover:bg-green-100"
                                        )}
                                    >
                                        {patient.status || 'Ativo'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground text-sm">
                                    {patient.createdAt?.seconds 
                                        ? new Date(patient.createdAt.seconds * 1000).toLocaleDateString('pt-BR')
                                        : '-'
                                    }
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>

      {/* AQUI ESTÁ A INTEGRAÇÃO COM O SEU FORMULÁRIO EXISTENTE */}
      <PatientForm 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        patient={null} // Passamos null para indicar que é um NOVO paciente
      />
      
    </div>
  )
}