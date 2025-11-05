"use client"

import Link from "next/link"
import { Home } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AppLogo } from "@/components/app-logo"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-center p-4">
      <div className="absolute top-8 left-8">
        <AppLogo />
      </div>
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight">Página Não Encontrada</h2>
      <p className="mt-2 text-lg text-muted-foreground">
        Oops! A página que você está procurando não existe.
      </p>
      <Button asChild className="mt-8">
        <Link href="/dashboard">
          <Home className="mr-2 h-4 w-4" />
          Voltar para o Dashboard
        </Link>
      </Button>
    </div>
  )
}
