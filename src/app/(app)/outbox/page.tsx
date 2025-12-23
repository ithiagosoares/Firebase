"use client"

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { XCircle, Search, Workflow, Loader2, Pencil, Calendar as CalendarIcon, MoreVertical, Trash2 } from "lucide-react"
import { type ScheduledMessage, type Patient, type Template } from "@/lib/types"
import { collection, doc, Timestamp } from "firebase/firestore"
import { ClientSideDateTime } from "@/components/client-side-date-time"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from 'date-fns'
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useUser, useFirestore, useMemoFirebase } from "@/firebase/provider"
import { useCollection } from "@/firebase/firestore/use-collection"
import { deleteDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates"

type EnrichedMessage = ScheduledMessage & {
  patientName: string;
  templateName: string;
  workflowName?: string; 
};

export default function OutboxPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const { user, isUserLoading: isUserAuthLoading } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()

  // State for editing a message
  const [editingMessage, setEditingMessage] = useState<EnrichedMessage | null>(null);
  const [newDate, setNewDate] = useState<Date | undefined>();
  const [newTime, setNewTime] = useState("");


  const messagesCollection = useMemoFirebase(() => 
    user ? collection(firestore, `users/${user.uid}/scheduledMessages`) : null
  , [firestore, user])
  const { data: messages, isLoading: isLoadingMessages } = useCollection<ScheduledMessage>(messagesCollection)

  const patientsCollection = useMemoFirebase(() =>
    user ? collection(firestore, `users/${user.uid}/patients`) : null
  , [firestore, user])
  const { data: patients, isLoading: isLoadingPatients } = useCollection<Patient>(patientsCollection)

  const templatesCollection = useMemoFirebase(() =>
    user ? collection(firestore, `users/${user.uid}/messageTemplates`) : null
  , [firestore, user])
  const { data: templates, isLoading: isLoadingTemplates } = useCollection<Template>(templatesCollection)

  const enrichedMessages = useMemo<EnrichedMessage[]>(() => {
    if (!messages || !patients || !templates) return []

    const patientsMap = new Map(patients.map(p => [p.id, p.name]))
    const templatesMap = new Map(templates.map(t => [t.id, t.title]))

    return messages.map(msg => ({
      ...msg,
      patientName: patientsMap.get(msg.patientId) || "Paciente Desconhecido",
      templateName: templatesMap.get(msg.templateId) || "Template Desconhecido",
      workflowName: msg.workflowId ? "Lembrete de Consulta" : undefined, // Placeholder
    }))
  }, [messages, patients, templates])

  const filteredMessages = enrichedMessages.filter(msg =>
    msg.patientName.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => b.scheduledTime.toMillis() - a.scheduledTime.toMillis());

  const messagesByPatient = filteredMessages.reduce((acc, msg) => {
    if (!acc[msg.patientId]) {
      acc[msg.patientId] = { name: msg.patientName, messages: [] }
    }
    acc[msg.patientId].messages.push(msg)
    return acc
  }, {} as Record<string, { name: string, messages: EnrichedMessage[] }>)

  const handleOpenEditPopover = (message: EnrichedMessage) => {
    setEditingMessage(message);
    const scheduledDate = message.scheduledTime.toDate();
    setNewDate(scheduledDate);
    setNewTime(format(scheduledDate, "HH:mm"));
  }
  
  const handleReschedule = () => {
    if (!editingMessage || !newDate || !user) return;

    const [hours, minutes] = newTime.split(':').map(Number);
    const finalDate = new Date(newDate);
    finalDate.setHours(hours, minutes, 0, 0);

    const messageDocRef = doc(firestore, `users/${user.uid}/scheduledMessages`, editingMessage.id);
    setDocumentNonBlocking(messageDocRef, { scheduledTime: Timestamp.fromDate(finalDate) }, { merge: true });

    toast({
        title: "Mensagem Reagendada!",
        description: "O novo horário de envio foi salvo."
    });

    setEditingMessage(null);
  }

  const handleCancelMessage = (messageId: string) => {
    if (!user || !firestore) return;
    const messageDocRef = doc(firestore, `users/${user.uid}/scheduledMessages`, messageId);
    setDocumentNonBlocking(messageDocRef, { status: 'Cancelado' }, { merge: true });
    toast({
      title: "Cancelado!",
      description: "A mensagem agendada foi cancelada."
    });
  }

    const handleDeleteMessage = (messageId: string) => {
    if (!user || !firestore) return;
    const messageDocRef = doc(firestore, `users/${user.uid}/scheduledMessages`, messageId);
    deleteDocumentNonBlocking(messageDocRef);
    toast({
      variant: "destructive",
      title: "Excluído!",
      description: "A mensagem foi excluída permanentemente."
    });
  }
  
  const isLoading = isUserAuthLoading || isLoadingMessages || isLoadingPatients || isLoadingTemplates

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por paciente..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-lg">
        {Object.keys(messagesByPatient).length > 0 ? (
          <Accordion type="multiple" className="w-full">
            {Object.values(messagesByPatient).map(({ name, messages }) => (
              <AccordionItem value={name} key={name}>
                <AccordionTrigger className="px-6">
                  <div className="flex items-center gap-4">
                    <span className="font-medium">{name}</span>
                    <Badge variant="outline">{messages.length} mensagens</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Detalhes</TableHead>
                        <TableHead>Agendado Para</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {messages.map((msg) => (
                        <TableRow key={msg.id}>
                          <TableCell>
                            <div className="font-medium">{msg.templateName}</div>
                            {msg.workflowName && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Workflow className="h-3 w-3" />
                                <span>{msg.workflowName}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell><ClientSideDateTime date={msg.scheduledTime} showTime={true} /></TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                msg.status === "Enviado"
                                  ? "default"
                                  : msg.status === "Falhou"
                                  ? "destructive"
                                  : msg.status === "Cancelado"
                                  ? "outline"
                                  : "secondary"
                              }
                            >
                              {msg.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                             <div className="flex gap-2 justify-end items-center">
                                {msg.status === "Agendado" && (
                                <>
                                    <Popover open={editingMessage?.id === msg.id} onOpenChange={(isOpen) => !isOpen && setEditingMessage(null)}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" onClick={() => handleOpenEditPopover(msg)}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Editar
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                        mode="single"
                                        selected={newDate}
                                        onSelect={setNewDate}
                                        initialFocus
                                        />
                                        <div className="p-4 border-t">
                                        <div className="grid gap-2">
                                            <Label htmlFor="time">Hora do Envio</Label>
                                            <Input id="time" type="time" value={newTime} onChange={e => setNewTime(e.target.value)} />
                                        </div>
                                        </div>
                                        <div className="p-4 pt-0 flex justify-end gap-2">
                                        <Button variant="ghost" size="sm" onClick={() => setEditingMessage(null)}>Cancelar</Button>
                                        <Button size="sm" onClick={handleReschedule}>Salvar</Button>
                                        </div>
                                    </PopoverContent>
                                    </Popover>
                                    <Button variant="ghost" size="sm" onClick={() => handleCancelMessage(msg.id)}>
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Cancelar
                                    </Button>
                                </>
                                )}

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem 
                                            onClick={() => handleDeleteMessage(msg.id)} 
                                            className="text-destructive"
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Excluir
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="text-center p-8 text-muted-foreground">
            Nenhuma mensagem agendada encontrada.
          </div>
        )}
      </div>
    </>
  )
}
