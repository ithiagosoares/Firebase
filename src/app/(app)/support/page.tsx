"use client"

import Link from "next/link"
import { PageHeader } from "@/components/page-header"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { HelpCircle } from "lucide-react"

const faqs = [
    {
      question: "Como integro minha API do WhatsApp?",
      answer: "Vá para a tela de Configurações, clique na aba 'WhatsApp API' e insira sua chave de API fornecida pelo seu provedor do WhatsApp Business."
    },
    {
      question: "Posso usar variáveis nos templates?",
      answer: "Sim! Você pode usar variáveis como {{NOME_CLIENTE}} e {{DATA_CONSULTA}} no conteúdo do seu template. Elas serão substituídas automaticamente."
    },
    {
      question: "Como funciona a geração de templates por IA?",
      answer: "Na tela de criação de templates, vá para a aba 'Gerar com IA', forneça o contexto da mensagem e o tom desejado, e nossa IA irá gerar até 10 sugestões para você."
    },
    {
      question: "Onde vejo as mensagens que foram enviadas?",
      answer: "A tela 'Caixa de Saída' mostra um histórico de todas as mensagens agendadas, enviadas e que falharam."
    }
]

export default function SupportPage() {
  return (
    <>
      <PageHeader title="Suporte" />
      <div className="grid md:grid-cols-2 gap-8 items-start">
        <div>
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Ajuda Interativa</CardTitle>
                    <CardDescription>Não sabe por onde começar? Refaça nosso tour introdutório a qualquer momento.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                      <Link href="/dashboard?tour=true">
                        <HelpCircle className="mr-2 h-4 w-4" />
                        Refazer Tour Introdutório
                      </Link>
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Entre em Contato</CardTitle>
                    <CardDescription>Não encontrou sua resposta? Nos envie uma mensagem.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="subject">Assunto</Label>
                        <Input id="subject" placeholder="Ex: Dúvida sobre faturamento" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="message">Sua Mensagem</Label>
                        <Textarea id="message" placeholder="Descreva seu problema ou dúvida aqui..." className="min-h-32" />
                    </div>
                </CardContent>
                <CardContent>
                    <Button className="w-full">Enviar Mensagem</Button>
                </CardContent>
            </Card>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Dúvidas Frequentes (FAQ)</CardTitle>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                    {faqs.map((faq, index) => (
                         <AccordionItem key={index} value={`item-${index}`}>
                            <AccordionTrigger>{faq.question}</AccordionTrigger>
                            <AccordionContent>
                                {faq.answer}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
        </Card>
      </div>
    </>
  )
}
