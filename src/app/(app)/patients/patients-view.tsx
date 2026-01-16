"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Loader2, User, Phone, Pencil, Trash2, CheckSquare } from "lucide-react" 
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
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import { ImportPatientsDialog } from "@/components/import-patients-dialog"
import { PatientForm } from "@/components/patient-form"

// Hooks do Firebase
import { useFirebase, useMemoFirebase } from "@/firebase/provider"
import { collection, query, orderBy, writeBatch, doc } from "firebase/firestore"
import { useCollection } from "@/firebase/firestore/use-collection"
import { type Patient } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

export default function PatientsView() {
  const { firestore, user } = useFirebase()
  const { toast } = useToast()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
  const [selectedPatients, setSelectedPatients] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)

  const patientsCollection = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return query(collection(firestore, `users/${user.uid}/patients`), orderBy('createdAt', 'desc'))
  }, [firestore, user]);

  const { data: patients, isLoading } = useCollection<Patient>(patientsCollection);

  const toggleSelectAll = (checked: boolean) => {
    if (checked && patients) {
        setSelectedPatients(patients.map(p => p.id));
    } else {
        setSelectedPatients([]);
    }
  }

  const toggleSelectOne = (patientId: string, checked: boolean) => {
    if (checked) {
        setSelectedPatients(prev => [...prev, patientId]);
    } else {
        setSelectedPatients(prev => prev.filter(id => id !== patientId));
    }
  }

  const handleBulkDelete = async () => {
    if (!firestore || !user || selectedPatients.length === 0) return;

    if (!confirm(`Tem certeza que deseja excluir ${selectedPatients.length} pacientes?`)) return;

    setIsDeleting(true);
    try {
        const batch = writeBatch(firestore);
        selectedPatients.forEach(id => {
            const docRef = doc(firestore, `users/${user.uid}/patients/${id}`);
            batch.delete(docRef);
        });

        await batch.commit();
        
        toast({ title: "Excluídos", description: `${selectedPatients.length} pacientes foram removidos.` });
        setSelectedPatients([]);

    } catch (error) {
        console.error("Erro ao excluir:", error);
        toast({ variant: "destructive", title: "Erro", description: "Falha ao excluir pacientes." });
    } finally {
        setIsDeleting(false);
    }
  }

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setIsDialogOpen(true);
  }

  const handleAddNew = () => {
    setEditingPatient(null);
    setIsDialogOpen(true);
  }

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
        
        <div className="flex gap-2 w-full sm:w-auto items-center">
             {selectedPatients.length > 0 ? (
                <Button variant="destructive" onClick={handleBulkDelete} disabled={isDeleting} className="w-full sm:w-auto">
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Trash2 className="h-4 w-4 mr-2" />}
                    Excluir ({selectedPatients.length}) selecionados
                </Button>
             ) : (
                 <>
                    <ImportPatientsDialog />
                    <Button onClick={handleAddNew} className="flex-1 sm:flex-none">
                        <Plus className="mr-2 h-4 w-4" /> Adicionar Paciente
                    </Button>
                 </>
             )}
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
                            <TableHead className="w-[50px]">
                                <Checkbox 
                                    checked={selectedPatients.length === patients.length && patients.length > 0}
                                    onCheckedChange={(checked) => toggleSelectAll(checked as boolean)}
                                />
                            </TableHead>
                            <TableHead>Paciente</TableHead>
                            <TableHead>Telefone</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {patients.map((patient) => {
                            // --- LÓGICA CORRIGIDA AQUI ---
                            // Verificamos se existe o objeto nextAppointment (data)
                            // Se existir, consideramos Ativo. Se não, Incompleto.
                            const hasNextAppointment = !!patient.nextAppointment;
                            const derivedStatus = hasNextAppointment ? 'Ativo' : 'Incompleto';
                            const isStatusOk = derivedStatus === 'Ativo';
                            
                            return (
                                <TableRow key={patient.id} className={selectedPatients.includes(patient.id) ? "bg-muted/50" : ""}>
                                    <TableCell>
                                        <Checkbox 
                                            checked={selectedPatients.includes(patient.id)}
                                            onCheckedChange={(checked) => toggleSelectOne(patient.id, checked as boolean)}
                                        />
                                    </TableCell>
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
                                                !isStatusOk && "bg-amber-100 text-amber-700 hover:bg-amber-100",
                                                isStatusOk && "bg-green-100 text-green-700 hover:bg-green-100"
                                            )}
                                        >
                                            {derivedStatus}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(patient)}>
                                            <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>

      <PatientForm 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        patient={editingPatient} 
      />
      
    </div>
  )
}