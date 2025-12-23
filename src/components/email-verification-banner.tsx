
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

  if (!user || user.emailVerified) {
    return null
  }

  if (emailSent) {
    return (
      <Alert className="bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-300 rounded-none border-x-0 border-t-0 py-2 flex items-center justify-center">
         <AlertCircle className="h-4 w-4 !text-green-600 dark:!text-green-400 mr-2" />
        <AlertDescription>
          <strong>Confirmação enviada!</strong> Por favor, verifique sua caixa de entrada para concluir o processo. A página será atualizada automaticamente.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className="bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200 rounded-none border-x-0 border-t-0 flex flex-col md:flex-row items-center justify-center py-2 gap-2 md:gap-4">
      <div className="flex items-center">
        <Rocket className="h-5 w-5 mr-2 text-amber-600 dark:text-amber-400" />
        <AlertDescription>
          Seu e-mail ainda não foi verificado. Por favor, confirme seu e-mail para ter acesso a todas as funcionalidades.
        </AlertDescription>
      </div>
      <Button
        variant="link"
        className="text-amber-900 dark:text-amber-200 hover:text-amber-700 dark:hover:text-amber-400 font-bold h-auto p-0"
        onClick={handleSendVerificationEmail}
        disabled={isSending}
      >
        {isSending ? "Enviando..." : "Reenviar e-mail de verificação"}
      </Button>
    </Alert>
  )
}
