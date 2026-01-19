"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Import, Check } from "lucide-react"
import { useFirebase } from "@/firebase/provider"
import { writeBatch, collection, doc, Timestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

// --- LISTA DE TEMPLATES PADRÃO DO SISTEMA ---
const SYSTEM_TEMPLATES = [
  {
    id: "confirmacao-padrao",
    name: "Confirmação de Consulta",
    category: "Agendamento",
    content: "Olá {{NOME_CLIENTE}}, confirmamos sua consulta para {{DATA_CONSULTA}} às {{HORA_CONSULTA}}. Responda SIM para confirmar.",
  },
  {
    id: "lembrete-24h",
    name: "Lembrete (24h antes)",
    category: "Lembrete",
    content: "Oi {{NOME_CLIENTE}}! Passando para lembrar do seu compromisso amanhã às {{HORA_CONSULTA}}. Estamos te esperando!",
  },
  {
    id: "pos-consulta",
    name: "Feedback Pós-Consulta",
    category: "Fidelização",
    content: "Olá {{NOME_CLIENTE}}, esperamos que sua consulta tenha sido ótima! De 0 a 10, qual nota você daria para nosso atendimento?",
  },
  {
    id: "aniversario",
    name: "Feliz Aniversário",
    category: "Fidelização",
    content: "Parabéns {{NOME_CLIENTE}}! 🎉 A Clínica VitalLink deseja um dia maravilhoso para você. Conte sempre conosco!",
  },
  {
    id: "reativacao",
    name: "Reativação de Paciente",
    category: "Marketing",
    content: "Olá {{NOME_CLIENTE}}, faz tempo que não te vemos! Que tal agendar um check-up preventivo? Responda para saber mais.",
  },
  {
    id: "boleto-pendente",
    name: "Cobrança Amigável",
    category: "Financeiro",
    content: "Olá {{NOME_CLIENTE}}, notamos que sua fatura vence hoje. Caso já tenha pago, desconsidere. Dúvidas? Estou à disposição.",
  }
];

interface TemplateLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateLibraryDialog({ open, onOpenChange }: TemplateLibraryDialogProps) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleImport = async () => {
    if (!firestore || !user || selectedIds.length === 0) return;

    setIsImporting(true);
    try {
      const batch = writeBatch(firestore);
      const userTemplatesRef = collection(firestore, `users/${user.uid}/templates`);

      const templatesToImport = SYSTEM_TEMPLATES.filter(t => selectedIds.includes(t.id));

      templatesToImport.forEach(template => {
        const newDocRef = doc(userTemplatesRef); // Cria ID automático
        batch.set(newDocRef, {
          name: template.name,
          content: template.content,
          category: template.category,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          isSystemTemplate: true // Flag opcional para saber a origem
        });
      });

      await batch.commit();

      toast({
        title: "Templates Importados!",
        description: `${templatesToImport.length} templates foram adicionados à sua biblioteca.`
      });

      setSelectedIds([]); // Limpa seleção
      onOpenChange(false); // Fecha modal

    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao importar templates." });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Galeria de Templates</DialogTitle>
          <DialogDescription>
            Escolha um ou mais modelos testados para adicionar à sua conta.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SYSTEM_TEMPLATES.map((template) => {
              const isSelected = selectedIds.includes(template.id);
              return (
                <div 
                  key={template.id} 
                  className={`relative border rounded-lg p-4 cursor-pointer transition-all ${isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-primary/50'}`}
                  onClick={() => toggleSelection(template.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleSelection(template.id)} />
                      <span className="font-semibold">{template.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">{template.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3 bg-muted p-2 rounded-md italic">
                    "{template.content}"
                  </p>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="flex items-center justify-between sm:justify-between pt-2 border-t mt-2">
            <p className="text-sm text-muted-foreground">
                {selectedIds.length} selecionados
            </p>
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button onClick={handleImport} disabled={selectedIds.length === 0 || isImporting}>
                    {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Import className="mr-2 h-4 w-4"/>}
                    Importar Selecionados
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}