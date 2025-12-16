"use client";

import Image from "next/image";

export function HowItWorksSection() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-28 bg-gray-50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
          <div className="inline-block rounded-lg bg-gray-100 px-3 py-1 text-sm">
            Como Funciona
          </div>
          <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
            Comece a usar em 3 passos simples
          </h2>
          <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
            Elimine a complexidade. Com o Vitallink, você está a poucos cliques de transformar a comunicação com seus pacientes.
          </p>
        </div>
        <div className="mx-auto grid max-w-5xl items-start gap-10 sm:grid-cols-2 md:grid-cols-3">
          
          <div className="relative flex flex-col items-center text-center p-4">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#00B3A4] to-[#05326D] text-white rounded-full w-12 h-12 flex items-center justify-center text-lg font-bold z-10">1</div>
            <Image
                alt="Ilustração de duas peças de quebra-cabeça se conectando"
                className="w-full h-48 object-contain mb-4 mt-6"
                height="200"
                src="https://firebasestorage.googleapis.com/v0/b/vitallink-c0b90.firebasestorage.app/o/puzzle.png?alt=media&token=fd541669-1666-4e40-8b0b-b0c617fd2096"
                width="200"
            />
            <h3 className="text-xl font-bold mb-2">Conecte sua Agenda</h3>
            <p className="text-sm text-gray-500">
              Integre sua ferramenta de agendamento atual com apenas alguns cliques. Sem necessidade de programação.
            </p>
          </div>
          
          <div className="relative flex flex-col items-center text-center p-4">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#00B3A4] to-[#05326D] text-white rounded-full w-12 h-12 flex items-center justify-center text-lg font-bold z-10">2</div>
            <Image
                alt="Ilustração de uma pessoa criando uma mensagem personalizada"
                className="w-full h-48 object-contain mb-4 mt-6"
                height="200"
                src="https://firebasestorage.googleapis.com/v0/b/vitallink-c0b90.firebasestorage.app/o/create_message.png?alt=media&token=b5503688-c7a6-48a1-828f-11894171d167"
                width="200"
            />
            <h3 className="text-xl font-bold mb-2">Personalize a Mensagem</h3>
            <p className="text-sm text-gray-500">
              Use nosso modelo de alta conversão ou crie uma mensagem com o tom e a cara da sua clínica.
            </p>
          </div>
          
          <div className="relative flex flex-col items-center text-center p-4">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#00B3A4] to-[#05326D] text-white rounded-full w-12 h-12 flex items-center justify-center text-lg font-bold z-10">3</div>
            <Image
                alt="Ilustração de pessoas felizes recebendo mensagens automaticas"
                className="w-full h-48 object-contain mb-4 mt-6"
                height="200"
                src="https://firebasestorage.googleapis.com/v0/b/vitallink-c0b90.firebasestorage.app/o/Happy_with_messages.png?alt=media&token=2261418f-b155-4bfb-9095-132832a7de37"
                width="200"
            />
            <h3 className="text-xl font-bold mb-2">Deixe a Mágica Acontecer</h3>
            <p className="text-sm text-gray-500">
              O Vitallink envia os lembretes automaticamente e você acompanha os pacientes retornando à sua clínica.
            </p>
          </div>
          
        </div>
      </div>
    </section>
  );
}
