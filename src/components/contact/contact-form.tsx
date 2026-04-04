"use client";

import Link from "next/link";
import { Send } from "lucide-react";

export function ContactForm() {
  return (
    <div className="w-full max-w-lg mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium text-gray-900">
            Nome completo
          </label>
          <input
            id="name"
            type="text"
            placeholder="Dr. João Silva"
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#00B3A4] focus:ring-2 focus:ring-[#00B3A4]/20 outline-none transition-all text-gray-900 bg-gray-50/50"
            required
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-gray-900">
            E-mail profissional
          </label>
          <input
            id="email"
            type="email"
            placeholder="joao@clinicadental.com.br"
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#00B3A4] focus:ring-2 focus:ring-[#00B3A4]/20 outline-none transition-all text-gray-900 bg-gray-50/50"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="company" className="text-sm font-medium text-gray-900">
            Empresa / Clínica <span className="text-gray-400 font-normal">(Opcional)</span>
          </label>
          <input
            id="company"
            type="text"
            placeholder="Clínica Dental Silva"
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#00B3A4] focus:ring-2 focus:ring-[#00B3A4]/20 outline-none transition-all text-gray-900 bg-gray-50/50"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="message" className="text-sm font-medium text-gray-900">
            Como podemos ajudar?
          </label>
          <textarea
            id="message"
            rows={4}
            placeholder="Descreva sua necessidade ou dúvida..."
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#00B3A4] focus:ring-2 focus:ring-[#00B3A4]/20 outline-none transition-all text-gray-900 bg-gray-50/50 resize-y"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full flex items-center justify-center rounded-lg text-sm font-medium transition-all bg-gradient-to-r from-[#00B3A4] to-[#05326D] text-white hover:brightness-110 hover:scale-[1.02] h-12 px-8 py-3 shadow-md shadow-[#05326D]/10 focus:outline-none focus:ring-2 focus:ring-[#05326D] focus:ring-offset-2"
        >
          Enviar mensagem
          <Send className="ml-2 h-4 w-4" />
        </button>
      </form>

      <p className="mt-6 text-xs text-center text-gray-500 leading-relaxed">
        Seus dados são utilizados apenas para contato. <br />Veja nossa{' '}
        <Link 
          href="https://vitallink.clinic/privacy" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[#05326D] hover:underline"
        >
          Política de Privacidade
        </Link>.
      </p>
    </div>
  );
}
