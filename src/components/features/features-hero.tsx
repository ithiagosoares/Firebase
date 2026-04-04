"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function FeaturesHero() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-28 bg-white">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-6 text-center max-w-3xl mx-auto">
          <div className="inline-block rounded-lg bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
            Funcionalidades
          </div>
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl text-gray-900 leading-tight">
            Automatize sua comunicação e aumente o retorno dos seus pacientes
          </h1>
          <p className="text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
            Envie lembretes automáticos via WhatsApp e elimine faltas sem esforço. Foque no atendimento, deixe a comunicação com a gente.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-gradient-to-r from-[#00B3A4] to-[#05326D] text-white hover:brightness-110 hover:scale-[1.02] h-11 px-8 py-2"
            >
              Começar agora
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
