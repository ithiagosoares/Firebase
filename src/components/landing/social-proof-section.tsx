"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"

const stats = [
    {
        value: "48,2%",
        description: "dos pacientes que faltaram disseram que foi por “esquecer” da consulta.",
        source: "*Pesquisa em Unidade de Saúde da Família em Vitória/ES"
    },
    {
        value: "10 - 20%",
        description: "é a perda média gerada por cada falta no faturamento mensal da clínica (dependendo do número de profissionais).",
        source: "*BMJ Open, Using digital notifications to improve attendance (2016)"
    },
    {
        value: "39%",
        description: "de redução das faltas em consulta pela adoção de sistemas de lembretes.",
        source: "*Revisão no American Journal of Medicine"
    }
]

export function SocialProofSection() {
    return (
        <section className="w-full py-20 lg:py-32 bg-gray-50">
            <div className="container mx-auto px-4 md:px-6 grid lg:grid-cols-2 gap-16 items-center">
                {/* Left Column */}
                <div className="space-y-6">
                    <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl text-gray-900">
                        <span className="bg-gradient-to-r from-[#00B3A4] to-[#05326D] bg-clip-text text-transparent">67%</span> das faltas acontecem na segunda consulta
                    </h2>
                    <p className="text-lg text-gray-700">
                        E é aqui que a <Link href="/" className="text-primary font-semibold hover:underline">VitalLink</Link> entra: para garantir que seus pacientes nunca mais esqueçam da sua clínica.
                    </p>
                    <Button asChild size="lg" className="bg-gradient-to-r from-[#00B3A4] to-[#05326D] text-white font-semibold hover:shadow-lg hover:brightness-110 transition-all duration-300">
                        <Link href="/signup">
                           Quero aumentar meus retornos
                        </Link>
                    </Button>
                </div>

                {/* Right Column */}
                <div className="space-y-8">
                    {stats.map((stat, index) => (
                        <div key={index} className="border-l-2 border-primary pl-6">
                           <p className="text-4xl md:text-5xl font-bold text-primary">{stat.value}</p>
                           <p className="mt-2 text-gray-700">{stat.description}</p>
                           <p className="mt-3 text-xs text-gray-500 italic">{stat.source}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
