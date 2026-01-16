"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { FileSpreadsheet, Info, Upload } from "lucide-react"

// Importe seu componente original de importação aqui,
// ou implemente a lógica de input type="file" aqui dentro.
import { CsvImporter } from "@/components/csv-importer" 

export function ImportPatientsDialog() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" /> Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Pacientes via CSV</DialogTitle>
          <DialogDescription>
            Siga as instruções abaixo para garantir que seus dados sejam importados corretamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
            
            <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                <Info className="h-4 w-4 text-blue-800" />
                <AlertTitle>Formatação do Arquivo</AlertTitle>
                <AlertDescription>
                    O arquivo deve estar no formato <strong>.csv</strong> (separado por vírgulas ou ponto e vírgula).
                </AlertDescription>
            </Alert>

            <div className="space-y-2">
                <h4 className="text-sm font-medium leading-none">Colunas Obrigatórias</h4>
                <p className="text-sm text-muted-foreground">A primeira linha do arquivo deve conter exatamente estes cabeçalhos:</p>
                
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-[100px]">Nome</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Telefone</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-medium">João Silva</TableCell>
                                <TableCell>joao@email.com</TableCell>
                                <TableCell>11999999999</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Maria Souza</TableCell>
                                <TableCell>maria@email.com</TableCell>
                                <TableCell>21988888888</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-dashed border-slate-300 text-center">
                <div className="mb-4">
                    <FileSpreadsheet className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                        Seu arquivo está pronto? Clique abaixo para selecionar.
                    </p>
                </div>
                
                {/* Aqui renderizamos seu componente original que faz o trabalho pesado */}
                {/* Passamos uma prop para fechar o modal após sucesso, se o seu componente suportar */}
                <div className="flex justify-center">
                    <CsvImporter /> 
                </div>
            </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}