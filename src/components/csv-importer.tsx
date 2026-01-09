"use client"

import { useState, useRef } from "react"
import Papa from "papaparse" // O erro da linha 4 vai sumir após o npm install
import { Button } from "@/components/ui/button"
import { Upload, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { collection, writeBatch, doc } from "firebase/firestore"
import { useFirebase } from "@/firebase/provider"

export function CsvImporter({ onSuccess }: { onSuccess?: () => void }) {
  const { firestore, user } = useFirebase()
  const { toast } = useToast()
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)

    // Mantém o 'file as any' que fizemos antes
    // E adiciona 'as any' no final do objeto de configuração
    Papa.parse(file as any, {
        header: true,
        skipEmptyLines: true,
        complete: async (results: any) => { // Pode usar any aqui para simplificar
          await processImport(results.data)
        },
        error: (error: any) => { // Pode usar any aqui também
          console.error(error)
          toast({ title: "Erro ao ler arquivo", variant: "destructive" })
          setIsImporting(false)
        }
      } as any) // <--- O SEGREDO ESTÁ AQUI (Adicione este 'as any')
  }

  const processImport = async (rows: any[]) => {
    if (!firestore || !user) return

    const batch = writeBatch(firestore)
    const collectionRef = collection(firestore, `users/${user.uid}/patients`)
    let count = 0

    rows.forEach((row) => {
      // Tenta encontrar colunas comuns
      const name = row['Nome'] || row['nome'] || row['Name'] || row['name']
      // Tenta várias variações de telefone
      let phone = row['Telefone'] || row['telefone'] || row['Phone'] || row['phone'] || row['Celular'] || row['celular'] || row['Whatsapp']

      if (name && phone) {
        // Limpeza básica do telefone
        phone = phone.toString().replace(/\D/g, '')

        const newDoc = doc(collectionRef)
        batch.set(newDoc, {
          name: name.trim(),
          phone: phone,
          createdAt: new Date(),
          status: 'Ativo'
        })
        count++
      }
    })

    try {
      await batch.commit()
      toast({ 
        title: "Importação concluída!", 
        description: `${count} pacientes foram adicionados.` 
      })
      if (onSuccess) onSuccess()
    } catch (error) {
      console.error(error)
      toast({ title: "Erro ao salvar no banco", variant: "destructive" })
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <div>
      <input 
        type="file" 
        accept=".csv" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
      />
      <Button 
        variant="outline" 
        onClick={() => fileInputRef.current?.click()} 
        disabled={isImporting}
      >
        {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
        Importar via CSV
      </Button>
    </div>
  )
}