
"use client"

import { useState } from "react"
import { useFirebase } from "@/firebase/provider"
import { sendEmailVerification } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Rocket, MailCheck, AlertCircle } from "lucide-react"

export function EmailVerificationBanner() {
  const { user } = useFirebase()
  const { toast } = useToast()
  const [isSending, setIsSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleSendVerificationEmail = async () => {
    if (!user) return

    setIsSending(true)
    try {
      await sendEmailVerification(user)
      setEmailSent(true)
      toast({
        title: "E-mail enviado!",
        description: "Verifique sua caixa de entrada (e a pasta de spam) para o link de verificação.",
      })
    } catch (error) {
      console.error("Erro ao enviar e-mail de verificação:", error)
      toast({
        title: "Ocorreu um erro",
        description: "Não foi possível enviar o e-mail de verificação. Tente novamente mais tarde.",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  // Não mostrar nada se o usuário não estiver carregado, se não existir, ou se já estiver verificado.
  if (!user || user.emailVerified) {
    return null
  }

  if (emailSent) {
    return (
      <Alert className="bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-300 rounded-none border-x-0 border-t-0">
         <AlertCircle className="h-4 w-4 !text-green-600 dark:!text-green-400" />
        <AlertDescription>
          <strong>Confirmação enviada!</strong> Por favor, verifique sua caixa de entrada para concluir o processo. A página será atualizada automaticamente.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className="bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200 rounded-none border-x-0 border-t-0 flex items-center justify-between">
      <div className="flex items-center">
        <Rocket className="h-5 w-5 mr-3 text-amber-600 dark:text-amber-400" />
        <AlertDescription>
          Seu e-mail ainda não foi verificado. Por favor, confirme seu e-mail para ter acesso a todas as funcionalidades.
        </AlertDescription>
      </div>
      <Button
        variant="link"
        className="text-amber-900 dark:text-amber-200 hover:text-amber-700 dark:hover:text-amber-400 font-bold"
        onClick={handleSendVerificationEmail}
        disabled={isSending}
      >
        {isSending ? "Enviando..." : "Reenviar e-mail de verificação"}
      </Button>
    </Alert>
  )
}
