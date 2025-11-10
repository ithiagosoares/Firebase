"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CalendarClock, Zap, MessageCircle, BarChart, Lock, Heart, PlayCircle, Banknote } from "lucide-react"
import Link from "next/link"

const benefits = [
  {
    icon: MessageCircle,
    title: "Follow-ups automáticos",
    description: "Pacientes não esquecem e comparecem.",
  },
  {
    icon: CalendarClock,
    title: "Reagendamento inteligente",
    description: "Agenda cheia sem esforço.",
  },
  {
    icon: Lock,
    title: "Segurança garantida",
    description: "100% LGPD + WhatsApp oficial.",
  },
  {
    icon: BarChart,
    title: "Métricas claras",
    description: "Veja quantos pacientes retornaram.",
  },
  {
    icon: Zap,
    title: "Plug & Play",
    description: "Comece em minutos, sem treinamento.",
  },
  {
    icon: Heart,
    title: "Humanizado",
    description: "Mensagens simpáticas e naturais.",
  },
]

export function SolutionSection() {
  return (
    <section className="w-full py-20 lg:py-32">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-start">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl text-gray-900">
              Por que usar a <span className="bg-gradient-to-r from-primary to-[#05326D] bg-clip-text text-transparent">VitalLink?</span>
            </h2>
            <p className="text-gray-600 md:text-lg">
              Nossa plataforma automatiza seus lembretes e follow-ups via WhatsApp. Seus pacientes lembram, voltam, e sua clínica cresce — sem esforço manual.
            </p>
          </div>
          <div className="flex items-center justify-center bg-muted rounded-lg min-h-[300px] lg:min-h-[350px]">
            <div className="text-center p-8">
              <PlayCircle className="h-16 w-16 text-muted-foreground mx-auto" />
              <p className="mt-4 text-muted-foreground">Vídeo demonstrativo em breve</p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-16">
          {benefits.map((benefit, index) => (
            <Card key={index} className="p-6 bg-gray-50/50 border rounded-xl hover:shadow-md hover:-translate-y-1 transition-all">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 bg-primary/10 text-primary rounded-lg p-2.5">
                  <benefit.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{benefit.title}</h3>
                  <p className="text-gray-600 text-sm mt-1">{benefit.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-left">
          <p className="text-lg text-gray-700 max-w-2xl mb-4">
             VitalLink é o assistente invisível da sua clínica: lembra seus pacientes, mantém sua agenda cheia e aumenta sua receita.
          </p>
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
