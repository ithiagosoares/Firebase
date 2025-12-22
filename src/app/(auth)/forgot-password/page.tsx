
"use client"

import Link from "next/link"
import { useState } from "react"
import { sendPasswordResetEmail } from "firebase/auth"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/firebase/provider"
import { FirebaseError } from "firebase/app"
import { AppLogo } from "@/components/app-logo"
import { MailCheck } from "lucide-react"

export default function ForgotPasswordPage() {
  const auth = useAuth()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsSubmitting(true)
    try {
      await sendPasswordResetEmail(auth, email)
      setSubmitted(true) // Show the confirmation message
    } catch (error) {
      let description = "Ocorreu um erro desconhecido."
      if (error instanceof FirebaseError) {
        if (error.code === "auth/user-not-found") {
          description = "Nenhum usuário encontrado com este e-mail."
        } else {
          description = "Não foi possível enviar o e-mail. Tente novamente."
        }
      }
      toast({
        variant: "destructive",
        title: "Erro",
        description: description,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
           <MailCheck className="h-12 w-12 text-green-500 mb-4" />
          <CardTitle className="text-2xl font-bold">Verifique seu E-mail</CardTitle>
          <CardDescription className="pt-2">
            Um e-mail foi enviado para <strong>{email}</strong> com as instruções para redefinir sua senha. Verifique sua caixa de entrada e spam.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Button asChild className="w-full">
                <Link href="/login">Voltar para o Login</Link>
            </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <AppLogo />
        <CardTitle className="text-2xl font-bold">Recuperar Senha</CardTitle>
        <CardDescription>
          Digite seu e-mail para receber o link de recuperação.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Enviando..." : "Enviar Link de Recuperação"}
          </Button>
        </form>
         <div className="mt-4 text-center text-sm">
          Lembrou a senha?{" "}
          <Link href="/login" className="underline">
            Fazer Login
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
