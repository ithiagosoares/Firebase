"use client"

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { TrendingDown, CircleDollarSign, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";

export function ProblemSection() {
    const problems = [
        { 
            icon: TrendingDown,
            title: "30% a 50% dos pacientes esquecem retornos",
            description: "Sem lembretes automáticos, a taxa de no-show dispara"
        },
        { 
            icon: CircleDollarSign,
            title: "Cada paciente perdido = R$ 500 a R$ 2.000/ano a menos",
            description: "Receita que simplesmente evapora por falta de organização"
        },
        { 
            icon: Clock,
            title: "Equipes gastam horas em contatos manuais",
            description: "Tempo valioso desperdiçado em tarefas que não escalam"
        },
    ];

  return (
    <section className="w-full py-10 lg:py-16 bg-gray-50 overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl text-gray-900">
            Você está <span className="text-red-600">perdendo pacientes</span> sem nem perceber.
          </h2>
          <p className="mt-4 text-gray-600 md:text-lg">
            Todos os meses, centenas de clínicas e consultórios deixam pacientes sumirem no silêncio. Não é porque eles não gostaram do atendimento. Não é porque não precisam mais de cuidados.
          </p>
           <p className="mt-2 text-gray-700 md:text-lg">
            👉 É simplesmente porque <span className="font-bold">ninguém lembrou eles de voltar.</span>
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
           <div className="relative flex items-center justify-center lg:order-1">
            <Image
                alt="Ilustração de um calendário com buracos representando perda financeira"
                className="relative mx-auto w-full max-w-md"
                height="450"
                width="450"
                src="https://firebasestorage.googleapis.com/v0/b/studio-296644579-18969.firebasestorage.app/o/Calendar_broken.png?alt=media&token=76f03239-51c0-4c2c-aa14-7eebdaca7d52"
            />
          </div>
            
          <div className="space-y-6 lg:order-2">
            {problems.map((item, index) => (
                <div key={index} className="flex items-start gap-4">
                    <div className="flex-shrink-0 bg-red-100 text-red-600 rounded-full p-2.5">
                        <item.icon className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-800">{item.title}</h3>
                        <p className="text-gray-600">{item.description}</p>
                    </div>
                </div>
            ))}

            <div className="bg-red-100 border-l-4 border-red-600 p-4 rounded-r-lg">
                <div className="flex">
                    <div className="py-1">
                        <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
                    </div>
                    <div>
                        <p className="text-sm text-red-700">
                            Enquanto você perde tempo com burocracia, seus concorrentes estão ocupando o espaço que deveria ser seu.
                        </p>
                    </div>
                </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}