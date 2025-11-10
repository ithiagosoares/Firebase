"use client"

import { useState, useEffect } from "react"
import { MoreHorizontal, Download, FileDown, Search, Eye, CircleCheck, CircleX, Loader2 } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { ClientSideDateTime } from "@/components/client-side-date-time"
import { type ConsentLog } from "@/lib/types"


const mockConsentData: ConsentLog[] = [
  { id: 'cons1', patientId: '1', patientName: 'Ana Silva', consentGiven: true, consentAt: '2024-07-20T10:00:00Z', consentMethod: 'Web Form', consentMeta: { ip: '192.168.1.1', userAgent: 'Chrome/126.0' } },
  { id: 'cons2', patientId: '2', patientName: 'Bruno Costa', consentGiven: true, consentAt: '2024-07-19T14:30:00Z', consentMethod: 'SMS Reply', consentMeta: { fromNumber: '+5521912345678' } },
  { id: 'cons3', patientId: '3', patientName: 'Carla Dias', consentGiven: false, consentAt: '2024-07-18T09:15:00Z', consentMethod: 'Manual Opt-out', consentMeta: { reason: 'User requested removal' } },
  { id: 'cons4', patientId: '4', patientName: 'Daniel Alves', consentGiven: true, consentAt: '2024-07-17T11:05:00Z', consentMethod: 'Web Form', consentMeta: { ip: '203.0.113.45', userAgent: 'Safari/17.5' } },
  { id: 'cons5', patientId: '5', patientName: 'Eduarda Lima', consentGiven: true, consentAt: '2024-07-21T18:00:00Z', consentMethod: 'In-person', consentMeta: { staffId: 'dr.joao', formId: 'FORM-001' } },
]

export default function ConsentAuditPage() {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [logs, setLogs] = useState<ConsentLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // In a real app, you would fetch this data from your backend
    setLogs(mockConsentData)
    setLoading(false)
  }, [])

  const filteredData = logs.filter(log =>
    log.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.patientId.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  const handleExportCSV = () => {
    toast({
        title: "Exportação iniciada",
        description: "Seu arquivo CSV com os logs de consentimento será baixado em breve."
    })
    // In a real app, you would generate and download a CSV file here.
  }

  const handleDownloadReport = (patientName: string) => {
    toast({
        title: "Gerando relatório",
        description: `O relatório de consentimento individual para ${patientName} será baixado em PDF.`
    })
    // In a real app, you would generate and download a PDF file here.
  }
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <PageHeader title="Auditoria de Consentimento">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por paciente..." 
              className="pl-10" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </PageHeader>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paciente</TableHead>
              <TableHead className="text-center">Consentimento</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Método</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <div className="font-medium">{log.patientName}</div>
                  <div className="text-sm text-muted-foreground">ID: {log.patientId}</div>
                </TableCell>
                <TableCell className="text-center">
                    <Badge variant={log.consentGiven ? "default" : "destructive"} className="flex items-center gap-1.5 w-fit mx-auto">
                        {log.consentGiven ? <CircleCheck className="h-3.5 w-3.5" /> : <CircleX className="h-3.5 w-3.5" />}
                        <span>{log.consentGiven ? "Sim" : "Não"}</span>
                    </Badge>
                </TableCell>
                <TableCell><ClientSideDateTime date={new Date(log.consentAt)} showTime={true} /></TableCell>
                <TableCell>
                  <Badge variant="secondary">{log.consentMethod}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                       <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full">
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Metadados
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Metadados do Consentimento</AlertDialogTitle>
                              <AlertDialogDescription>
                                Detalhes técnicos da ação de consentimento.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <pre className="mt-2 w-full rounded-md bg-muted p-4 text-sm">
                                <code className="text-foreground">{JSON.stringify(log.consentMeta, null, 2)}</code>
                            </pre>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Fechar</AlertDialogCancel>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      <DropdownMenuItem onClick={() => handleDownloadReport(log.patientName)}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Baixar Relatório (PDF)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
