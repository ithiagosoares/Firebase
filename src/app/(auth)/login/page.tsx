"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { signInWithEmailAndPassword } from "firebase/auth"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { FirebaseError } from "firebase/app"
import { AppLogo } from "@/components/app-logo";
import { useAuth, useUser } from "@/firebase/provider"

export default function LoginPage() {
  const router = useRouter()
  const auth = useAuth()
  const { user, isUserLoading } = useUser()
  const { toast } = useToast()
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (user) {
      router.push("/dashboard")
    }
  }, [user, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    signInWithEmailAndPassword(auth, email, password)
      .catch((error: any) => {
        let description = "Ocorreu um erro desconhecido. Tente novamente."
        if (error instanceof FirebaseError) {
          switch (error.code) {
            case 'auth/invalid-credential':
            case 'auth/user-not-found':
            case 'auth/wrong-password':
              description = 'E-mail ou senha inválidos. Por favor, verifique suas credenciais.';
              break;
            case 'auth/too-many-requests':
              description = 'Acesso bloqueado temporariamente devido a muitas tentativas. Tente novamente mais tarde.';
              break;
            default:
              description = 'Ocorreu um erro ao tentar fazer login. Por favor, tente novamente.';
          }
        }
        toast({
          variant: "destructive",
          title: "Erro de Login",
          description: description,
        })
      })
      .finally(() => {
        setIsSubmitting(false)
      })
  }
  
  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        Carregando...
      </div>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <AppLogo />
        <CardTitle className="text-2xl font-bold">Login</CardTitle>
        <CardDescription>
          Digite seu e-mail abaixo para fazer login em sua conta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="grid gap-4">
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
          <div className="grid gap-2">
            <div className="flex items-center">
              <Label htmlFor="password">Senha</Label>
              <Link
                href="/forgot-password"
                className="ml-auto inline-block text-sm underline"
              >
                Esqueceu sua senha?
              </Link>
            </div>
            <Input 
              id="password" 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="remember-me" disabled={isSubmitting} />
            <Label htmlFor="remember-me" className="text-sm font-normal">Lembrar de mim</Label>
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Entrando..." : "Entrar"}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          Não tem uma conta?{" "}
          <Link href="/signup" className="underline">
            Cadastre-se
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}