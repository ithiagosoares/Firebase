"use client";

import { TrendingUp, Clock, CalendarCheck, ShieldCheck } from "lucide-react";

export function FeaturesBenefits() {
  const benefits = [
    {
      title: "Redução de faltas",
      description: "Mantenha o compromisso na mente do seu paciente.",
      icon: CalendarCheck,
    },
    {
      title: "Aumento de faturamento",
      description: "Menos horários vagos significam maior rentabilidade.",
      icon: TrendingUp,
    },
    {
      title: "Economia de tempo da equipe",
      description: "Libere sua recepção de ligações manuais exaustivas.",
      icon: Clock,
    },
    {
      title: "Automação completa",
      description: "Configurou uma vez, o sistema trabalha diariamente por você.",
      icon: ShieldCheck,
    },
  ];

  return (
    <section className="w-full py-12 md:py-24 bg-white">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row gap-12 items-center">
          <div className="md:w-1/2 space-y-6">
            <h2 className="text-3xl font-bold tracking-tighter text-gray-900 sm:text-4xl md:text-5xl">
              Por que usar o VitalLink?
            </h2>
            <p className="text-gray-500 md:text-lg">
              Transforme a maneira como você se relaciona com seus pacientes sem adicionar complexidade ao dia a dia da sua clínica.
            </p>
          </div>
          <div className="md:w-1/2 grid sm:grid-cols-2 gap-6 w-full">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex flex-col space-y-2">
                <div className="flex items-center gap-3">
                  <benefit.icon className="h-6 w-6 text-[#05326D]" />
                  <h3 className="font-bold text-gray-900">{benefit.title}</h3>
                </div>
                <p className="text-sm text-gray-500 pl-9">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
