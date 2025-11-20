"use client"

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import Link from "next/link";

export function HeroSection() {
  const trustPoints = [
    "Cancelamento simples",
    "Dados 100% seguros",
    "Sem risco, teste grátis",
  ];

  return (
    <section className="w-full py-8 md:py-12 lg:py-16 bg-white overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          <div className="flex flex-col justify-center space-y-4 text-center lg:text-left lg:pl-12 xl:pl-20">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl lg:text-5xl/[1.2] text-gray-900 mx-auto lg:mx-0 max-w-lg">
              Encha sua agenda com <span className="bg-gradient-to-r from-[#00B3A4] to-[#05326D] bg-clip-text text-transparent">lembretes automáticos</span> no WhatsApp.
            </h1>
            <p className="max-w-[600px] text-gray-600 md:text-xl mx-auto lg:mx-0">
              Recupere até <span className="bg-gradient-to-r from-[#00B3A4] to-[#05326D] bg-clip-text text-transparent font-medium">20% do faturamento</span> que você perde com faltas e desmarcações de pacientes.
            </p>

            <div className="flex flex-col gap-4 items-center lg:items-start">
              <Button asChild size="lg" className="bg-gradient-to-r from-[#00B3A4] to-[#05326D] text-white font-semibold hover:shadow-lg hover:brightness-110 transition-all duration-300">
                <Link href="/signup">
                  Quero aumentar meus retornos
                </Link>
              </Button>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-2 mt-2 text-sm text-gray-600">
                  {trustPoints.map((point) => (
                  <div key={point} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>{point}</span>
                  </div>
                  ))}
              </div>
            </div>
          </div>
          
          <div className="relative flex items-center justify-center mt-8 lg:mt-0">
            <Image
                alt="Ilustração de uma dentista feliz com sua agenda cheia"
                className="relative mx-auto w-full max-w-md"
                height="500"
                src="https://firebasestorage.googleapis.com/v0/b/studio-296644579-18969.firebasestorage.app/o/Girl_calendar.png?alt=media&token=64cf70e0-f98d-4fe7-93d8-8a92ef9aa9b8"
                width="500"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
