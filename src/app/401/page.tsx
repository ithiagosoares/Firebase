"use client"

import Link from "next/link"
import { LogIn, ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AppLogo } from "@/components/app-logo"

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-center p-4">
      <div className="absolute top-8 left-8">
        <AppLogo />
      </div>
      <div className="flex items-center gap-4 text-primary">
        <ShieldAlert className="h-16 w-16" />
        <h1 className="text-6xl font-bold">401</h1>
      </div>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight">Acesso Não Autorizado</h2>
      <p className="mt-2 max-w-md text-lg text-muted-foreground">
        Você não tem permissão para visualizar esta página. Por favor, faça login para continuar.
      </p>
      <Button asChild className="mt-8">
        <Link href="/login">
          <LogIn className="mr-2 h-4 w-4" />
          Ir para o Login
        </Link>
      </Button>
    </div>
  )
}
