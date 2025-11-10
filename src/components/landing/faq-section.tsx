"use client"

import Image from "next/image"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "../ui/button"
import Link from "next/link"

const faqItems = [
    {
        question: "Quais são os benefícios da VitalLink?",
        answer: "Você reduzirá as faltas, aumentará o retorno de pacientes, otimizará o tempo da sua equipe e, consequentemente, aumentará seu faturamento. Tudo de forma automática."
    },
    {
        question: "A plataforma é muito complicada de usar?",
        answer: "Não! A VitalLink foi desenhada para ser 'Plug & Play'. A configuração inicial leva menos de 5 minutos e não exige nenhum conhecimento técnico."
    },
    {
        question: "O paciente recebe lembrete por WhatsApp ou SMS?",
        answer: "Nossa comunicação é focada 100% no WhatsApp, utilizando a API oficial, o que garante maior taxa de abertura e interação."
    },
    {
        question: "Posso cancelar a qualquer momento?",
        answer: "Sim. Nossos planos são sem fidelidade. Você pode cancelar quando quiser, sem burocracia ou multas."
    },
    {
        question: "Preciso treinar minha equipe para usar?",
        answer: "Não é necessário. A plataforma é tão intuitiva que sua equipe estará usando todas as funcionalidades em poucos minutos. Além disso, temos um tour introdutório e suporte dedicado."
    },
    {
        question: "Qual o impacto real que posso esperar no meu faturamento?",
        answer: "Estudos mostram que a redução de faltas pode impactar o faturamento em até 20%. Além disso, a reativação de pacientes antigos gera uma receita que antes era perdida."
    }
]

export function FaqSection() {
  return (
    <section className="w-full py-20 lg:py-32 bg-gray-50 overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl text-gray-900">
            Perguntas frequentes:
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative flex items-center justify-center min-h-[500px]">
                 <Image
                    alt="Fundo com brilho gradiente"
                    className="absolute inset-0 w-full h-full object-contain opacity-75 blur-3xl"
                    aria-hidden="true"
                    src="https://firebasestorage.googleapis.com/v0/b/studio-296644579-18969.firebasestorage.app/o/Ellipse%202.svg?alt=media&token=e4b6008a-9288-4501-9b74-13a8374d7310"
                    width="600"
                    height="600"
                />
                 <Image
                    alt="Gráfico de crescimento de pacientes"
                    className="relative mx-auto h-[500px] w-auto object-contain"
                    height="500"
                    width="400"
                    src="https://firebasestorage.googleapis.com/v0/b/studio-296644579-18969.firebasestorage.app/o/iphone_graph.svg?alt=media&token=bd02f306-cd71-4e7f-b072-cee5121ff8ff"
                    data-ai-hint="iphone graph"
                />
            </div>
            <div className="space-y-4">
                <Accordion type="single" collapsible className="w-full">
                    {faqItems.map((item, index) => (
                        <AccordionItem key={index} value={`item-${index}`} className="bg-white border border-gray-200 rounded-lg mb-2 px-4 shadow-sm hover:shadow-md transition-shadow">
                            <AccordionTrigger className="text-left font-medium hover:no-underline">
                                {item.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-gray-600">
                                {item.answer}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </div>
        
        <div className="text-center mt-16">
             <Button asChild size="lg" className="bg-gradient-to-r from-primary to-[#05326D] text-white font-semibold hover:shadow-lg hover:brightness-110 transition-all duration-300">
              <Link href="/signup">
                Quero aumentar meus retornos
              </Link>
            </Button>
        </div>

      </div>
    </section>
  )
}
