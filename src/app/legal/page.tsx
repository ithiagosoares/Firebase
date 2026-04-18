import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Informações Legais | VitalLink",
  description: "Dados legais e razão social da empresa responsável pela plataforma VitalLink.",
  robots: { index: true, follow: true },
};

export default function LegalPage() {
  return (
    <main className="min-h-screen bg-white text-gray-800 font-sans">
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-3xl font-bold mb-8">Informações Legais</h1>

        <section className="space-y-4 text-base leading-relaxed">
          <div>
            <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold mb-1">Razão Social</p>
            <p className="text-lg font-medium">65.544.455 THIAGO DOS SANTOS SOARES</p>
          </div>

          <div>
            <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold mb-1">Plataforma</p>
            <p>VitalLink</p>
          </div>

          <div>
            <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold mb-1">Site</p>
            <p>vitallink.clinic</p>
          </div>
        </section>

        <div className="mt-12 border-t pt-6">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
            ← Voltar ao início
          </Link>
        </div>
      </div>
    </main>
  );
}
