"use client";

import { MessageSquare, CheckCircle, Sliders, Clock, Users, BarChart3 } from "lucide-react";

export function FeaturesGrid() {
  const features = [
    {
      title: "Lembretes automáticos via WhatsApp",
      description: "Envie mensagens automaticamente antes das consultas. Reduza o esquecimento dos seus pacientes.",
      icon: MessageSquare,
    },
    {
      title: "Confirmação de presença",
      description: "Reduza faltas pedindo confirmação dos pacientes com botões interativos direto no WhatsApp.",
      icon: CheckCircle,
    },
    {
      title: "Personalização de mensagens",
      description: "Adapte o tom, use o nome do paciente e insira informações específicas conforme sua clínica.",
      icon: Sliders,
    },
    {
      title: "Agendamento inteligente",
      description: "Defina a exata janela de tempo para o envio das mensagens (dias ou horas antes da consulta).",
      icon: Clock,
    },
    {
      title: "Multi-clínica (multi-tenant)",
      description: "Cada empresa conecta e gerencia o seu próprio número de WhatsApp de forma isolada e segura.",
      icon: Users,
    },
    {
      title: "Dashboard de controle",
      description: "Acompanhe envios, veja os status de entrega, mensagens lidas e pacientes agendados em tempo real.",
      icon: BarChart3,
    },
  ];

  return (
    <section className="w-full py-12 md:py-24 bg-gray-50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter text-gray-900 sm:text-4xl">
            Tudo o que você precisa
          </h2>
          <p className="mt-4 text-gray-500 md:text-lg max-w-[800px] mx-auto">
            Uma plataforma completa para gerenciar seus lembretes e manter sua agenda sempre cheia.
          </p>
        </div>
        <div className="mx-auto grid max-w-6xl items-start gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="flex flex-col items-start p-6 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow h-full"
              >
                <div className="bg-gradient-to-br from-[#00B3A4]/10 to-[#05326D]/10 p-3 rounded-lg mb-4">
                  <Icon className="h-6 w-6 text-[#00B3A4]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
