'use client'

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Copy, Check, MessageSquare } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

// Importa a lista de templates que você forneceu
import { defaultTemplates } from "@/data/defaultTemplates"

export default function TemplatesPage() {
  const { toast } = useToast()
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  // Função para copiar o texto do corpo
  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(content)
    setCopiedIndex(index)
    toast({
      title: "Copiado!",
      description: "Conteúdo do template copiado para a área de transferência.",
    })

    setTimeout(() => {
      setCopiedIndex(null)
    }, 2000)
  }

  // Função auxiliar para formatar snake_case para Título (ex: lembrete_24h -> Lembrete 24h)
  const formatName = (name: string) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Função auxiliar para traduzir/colorir categorias
  const getCategoryBadge = (category: string) => {
    if (category === 'UTILITY') {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">Utilidade</Badge>
    }
    if (category === 'MARKETING') {
      return <Badge variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-200">Marketing</Badge>
    }
    return <Badge variant="outline">{category}</Badge>
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <MessageSquare className="h-8 w-8 text-primary" />
          Meus Templates
        </h1>
        <p className="text-muted-foreground">
          Gerencie e utilize as mensagens automáticas do sistema.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {defaultTemplates.map((template, index) => (
          <Card key={index} className="flex flex-col h-full hover:shadow-md transition-shadow border-primary/10">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start gap-2 mb-2">
                {getCategoryBadge(template.category)}
              </div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                {formatName(template.name)}
              </CardTitle>
              {/* Mostra as variáveis disponíveis como descrição curta */}
              <CardDescription className="text-xs truncate">
                Variáveis: {Object.keys(template.variables).join(', ')}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="flex-grow">
              <div className="bg-muted/30 p-4 rounded-md text-sm text-foreground/80 italic whitespace-pre-wrap h-full min-h-[100px] border border-border/50">
                "{template.body}"
              </div>
            </CardContent>

            <CardFooter className="pt-2">
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={() => handleCopy(template.body, index)}
              >
                {copiedIndex === index ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar Mensagem
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}