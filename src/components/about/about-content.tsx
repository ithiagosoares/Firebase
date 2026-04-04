"use client";

import { CheckCircle2 } from "lucide-react";

export function AboutContent() {
  return (
    <section className="w-full py-16 md:py-24 bg-gray-50">
      <div className="container mx-auto px-4 md:px-6 max-w-5xl">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tighter text-gray-900 sm:text-4xl">
              Nossa Missão
            </h2>
            <p className="text-gray-500 md:text-lg leading-relaxed">
              No VitalLink, acreditamos que os profissionais de saúde devem focar no que fazem de melhor: cuidar das pessoas. A comunicação administrativa e o agendamento devem ser processos invisíveis, automatizados e impecáveis.
            </p>
            <p className="text-gray-500 md:text-lg leading-relaxed">
              Foi com essa visão que construímos uma plataforma robusta, segura e totalmente adaptada às necessidades do setor de saúde (especialmente odontológico), unindo tecnologia de ponta com a facilidade do WhatsApp.
            </p>

            <ul className="space-y-3 mt-8">
              {[
                "Reduzir o absenteísmo nas clínicas",
                "Automatizar tarefas repetitivas e manuais",
                "Proteger a privacidade e os dados (LGPD)",
                "Prover uma experiência incrível para o paciente"
              ].map((item, index) => (
                <li key={index} className="flex items-center gap-3 text-gray-700">
                  <CheckCircle2 className="h-5 w-5 text-[#00B3A4]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="relative">
             <div className="aspect-square rounded-2xl bg-gradient-to-tr from-[#00B3A4] to-[#05326D] p-1 shadow-2xl opacity-90">
               <div className="w-full h-full bg-white rounded-xl flex items-center justify-center p-8 text-center flex-col gap-4">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center shadow-inner mb-4 text-[#05326D]">
                     <span className="text-3xl font-bold">V</span>
                  </div>
                 <h3 className="text-2xl font-bold text-gray-900">Nossa Visão</h3>
                 <p className="text-gray-500 text-sm">
                   Ser a plataforma definitiva de automação de relacionamento e agendamento para a área da saúde no Brasil.
                 </p>
               </div>
             </div>

             <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[url('/dots.svg')] bg-repeat opacity-20 -z-10"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
