"use client"

import Link from "next/link"
import { AppLogo } from "@/components/app-logo"

export function Footer() {
  const rapidLinks = [
    { href: "#features", label: "Sobre" },
    { href: "mailto:suporte@vitallink.clinic", label: "Contato" },
    { href: "/blog", label: "Blog" },
  ];

  const policyLinks = [
    { href: "/privacy", label: "Política de Privacidade" },
    { href: "/terms", label: "Termos de Uso" },
  ];
  
  const legalLinks = [
    { href: "/data-request", label: "Solicitar Dados (LGPD)" },
  ]

  return (
    <footer className="bg-gray-800 text-white py-12">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4 md:col-span-1">
            <AppLogo />
            <p className="text-sm text-gray-400 max-w-xs">
              Garantimos que pacientes não esqueçam consultas preventivas e retornos {'->'} mais agenda cheia, mais receita recorrente.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-gray-200">Links rápidos</h4>
            <nav className="grid gap-2">
              {rapidLinks.map(link => (
                <Link key={link.label} href={link.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-gray-200">Políticas</h4>
            <nav className="grid gap-2">
              {policyLinks.map(link => (
                <Link key={link.label} href={link.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
           <div>
            <h4 className="font-semibold mb-4 text-gray-200">Legal</h4>
            <nav className="grid gap-2">
              {legalLinks.map(link => (
                <Link key={link.label} href={link.href} className="text-sm text-gray-400 hover:text-white transition-colors">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} VitalLink. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
