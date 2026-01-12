"use client"

import { useState, useRef } from "react"
import Papa from "papaparse"
import { Button } from "@/components/ui/button"
import { Upload, Loader2, AlertTriangle } from "lucide-react" // Adicionei AlertTriangle
import { useToast } from "@/hooks/use-toast"
import { collection, writeBatch, doc } from "firebase/firestore"
import { useFirebase } from "@/firebase/provider"

export function CsvImporter({ onSuccess }: { onSuccess?: () => void }) {
  const { firestore, user } = useFirebase()
  const { toast } = useToast()
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- 1. FUNÇÃO DE INTELIGÊNCIA (Nível 1) ---
  // Normaliza strings para comparação (tira acentos, minúsculo, trim)
  const normalize = (str: string) => 
    str?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() || "";

  // Encontra a chave correta no CSV baseada numa lista de possíveis nomes
  const findBestMatch = (headers: string[], possibilities: string[]) => {
    return headers.find(header => 
      possibilities.some(p => normalize(header).includes(normalize(p)))
    );
  }
  // -------------------------------------------

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)

    Papa.parse(file as any, {
        header: true,
        skipEmptyLines: true,
        complete: async (results: any) => {
          await processImport(results.data)
        },
        error: (error: any) => {
          console.error(error)
          toast({ title: "Erro ao ler arquivo", variant: "destructive" })
          setIsImporting(false)
        }
      } as any)
  }

  const processImport = async (rows: any[]) => {
    if (!firestore || !user || rows.length === 0) {
        setIsImporting(false)
        return
    }

    const batch = writeBatch(firestore)
    const collectionRef = collection(firestore, `users/${user.uid}/patients`)
    
    // Identifica quais colunas o usuário usou
    const headers = Object.keys(rows[0]);
    
    // Tenta adivinhar as colunas usando nossa lógica inteligente
    const nameKey = findBestMatch(headers, ['nome', 'name', 'cliente', 'paciente', 'aluno', 'fulano']);
    const phoneKey = findBestMatch(headers, ['telefone', 'phone', 'celular', 'whatsapp', 'contato', 'tel', 'zap']);

    let successCount = 0;
    let warningCount = 0;

    rows.forEach((row) => {
      // Pega os valores usando as chaves que encontramos (ou undefined se não achou)
      const rawName = nameKey ? row[nameKey] : undefined;
      const rawPhone = phoneKey ? row[phoneKey] : undefined;

      // Limpeza do telefone
      const cleanPhone = rawPhone ? rawPhone.toString().replace(/\D/g, '') : '';
      
      // --- 2. DEFINIÇÃO DE STATUS ---
      let status = 'Ativo'; // Padrão (Válido)
      let finalName = rawName ? rawName.trim() : 'Sem Nome';

      // Regra 1: Se não tem nome, é Incompleto
      if (!rawName || rawName.trim() === '') {
          status = 'Incompleto';
          finalName = '(Sem Nome)';
      }

      // Regra 2: Se telefone é inválido (menos de 8 dígitos ou vazio), é Erro
      if (!cleanPhone || cleanPhone.length < 8) {
          status = 'Erro';
      }

      // Contagem para o feedback
      if (status === 'Ativo') successCount++;
      else warningCount++;

      // Cria o documento independente do status (importamos tudo)
      const newDoc = doc(collectionRef)
      batch.set(newDoc, {
        name: finalName,
        phone: cleanPhone,
        originalPhone: rawPhone || '', // Guarda o original para conferência
        dataStatus: status, // Novo campo crucial
        createdAt: new Date(),
        status: 'Ativo' // Status "administrativo" do paciente (pode manter Ativo)
      })
    })

    try {
      await batch.commit()
      
      // Feedback mais detalhado
      let description = `${successCount} pacientes válidos importados.`;
      if (warningCount > 0) {
          description += ` Atenção: ${warningCount} contatos têm dados incompletos ou erros.`;
      }

      toast({ 
        title: "Importação Finalizada", 
        description: description,
        variant: warningCount > 0 ? "default" : "default", // Pode mudar para warning se tiver componente
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