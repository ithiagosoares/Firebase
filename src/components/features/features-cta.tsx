"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function FeaturesCta() {
  return (
    <section className="w-full py-20 px-4 text-center">
      <div className="container mx-auto max-w-4xl bg-gradient-to-r from-[#00B3A4] to-[#05326D] rounded-3xl p-10 md:p-16 text-white shadow-xl shadow-[#05326D]/10">
        <h2 className="text-3xl md:text-4xl font-bold mb-6 tracking-tighter">
          Pronto para revolucionar sua clínica?
        </h2>
        <p className="text-white/80 md:text-xl mb-8 max-w-2xl mx-auto">
          Junte-se a dezenas de clínicas que já reduziram suas faltas em mais de 70% usando a automação inteligente do VitalLink.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-all bg-white text-[#05326D] hover:bg-gray-50 hover:scale-[1.02] h-12 px-8 py-3 shadow-sm"
        >
          Comece agora gratuitamente
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
