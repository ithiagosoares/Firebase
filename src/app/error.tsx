"use client" 

import { useEffect } from "react"
import Link from "next/link"
import { RefreshCw, TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AppLogo } from "@/components/app-logo"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Opcional: Logar o erro em um serviço de monitoramento
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-center p-4">
       <div className="absolute top-8 left-8">
        <AppLogo className="h-10 w-auto" />
      </div>
      <div className="flex items-center gap-4 text-destructive">
        <TriangleAlert className="h-16 w-16" />
        <h1 className="text-6xl font-bold">500</h1>
      </div>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight">Estamos com problemas</h2>
      <p className="mt-2 max-w-md text-lg text-muted-foreground">
        Parece que algo deu errado do nosso lado. Tente novamente em alguns minutos.
      </p>
      <Button
        onClick={() => reset()}
        className="mt-8"
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        Tentar Novamente
      </Button>
    </div>
  )
}
