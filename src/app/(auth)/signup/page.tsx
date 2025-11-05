"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { doc } from "firebase/firestore"
import { createUserWithEmailAndPassword, UserCredential } from "firebase/auth"

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
import { FirebaseError } from "firebase/app"
import { AppLogo } from "@/components/app-logo";

import { useAuth, useUser, useFirestore } from "@/firebase/provider"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"

export default function SignupPage() {
  const router = useRouter()
  const auth = useAuth()
  const firestore = useFirestore()
  const { user, isUserLoading } = useUser()
  const { toast } = useToast()

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (user) {
      router.push("/dashboard")
    }
  }, [user, router])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, email, password)

      if (userCredential && userCredential.user) {
        const userRef = doc(firestore, "users", userCredential.user.uid);
        const newUser = {
          id: userCredential.user.uid,
          name: `${firstName} ${lastName}`,
          email: email,
          onboardingCompleted: false,
        };
        // This is a non-blocking call. We don't need to wait for it to complete.
        setDocumentNonBlocking(userRef, newUser, { merge: true });
      }

    } catch (error: any) {
       let description = "Ocorreu um erro desconhecido. Tente novamente."
       if (error instanceof FirebaseError) {
          switch (error.code) {
            case 'auth/email-already-in-use':
              description = 'Este e-mail já está em uso por outra conta.';
              break;
            case 'auth/weak-password':
              description = 'A senha é muito fraca. Por favor, use pelo menos 6 caracteres.';
              break;
            case 'auth/invalid-email':
              description = 'O formato do e-mail é inválido.';
              break;
            default:
              description = 'Ocorreu um erro ao tentar criar a conta.';
          }
       }
       toast({
        variant: "destructive",
        title: "Erro de Cadastro",
        description: description,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        Carregando...
      </div>
    )
  }


  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <AppLogo />
        <CardTitle className="text-2xl font-bold">Cadastre-se</CardTitle>
        <CardDescription>
          Crie sua conta para começar a otimizar sua comunicação.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignup} className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="first-name">Nome</Label>
              <Input id="first-name" placeholder="João" required value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={isSubmitting} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="last-name">Sobrenome</Label>
              <Input id="last-name" placeholder="Silva" required value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={isSubmitting} />
            </div>
          </div>
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
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} disabled={isSubmitting} />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Criando conta..." : "Criar conta"}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          Já tem uma conta?{" "}
          <Link href="/login" className="underline">
            Faça login
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
