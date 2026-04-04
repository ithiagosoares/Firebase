"use client";

import { Mail, MapPin, Clock } from "lucide-react";

export function ContactInfo() {
  return (
    <div className="w-full max-w-lg mx-auto flex flex-col space-y-8 md:pl-8">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
          Informações de Contato
        </h2>
        <p className="text-gray-500">
          Nossa equipe está pronta para responder todas as suas dúvidas. O tempo de resposta habitual é de algumas horas.
        </p>
      </div>

      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="bg-gray-100 p-3 rounded-full text-[#05326D]">
            <Mail className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">E-mail</h3>
            <p className="text-gray-500 mt-1">Envie-nos um e-mail a qualquer hora e responderemos em breve.</p>
            <a 
              href="mailto:contact@vitallink.clinic" 
              className="text-[#00B3A4] font-medium hover:underline mt-2 inline-block"
            >
              contact@vitallink.clinic
            </a>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="bg-gray-100 p-3 rounded-full text-[#05326D]">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">Atendimento</h3>
            <p className="text-gray-500 mt-1">Segunda a Sexta, das 09h às 18h (BRT).</p>
          </div>
        </div>

      </div>
    </div>
  );
}
