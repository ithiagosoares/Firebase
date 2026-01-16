'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { HelpCircle } from "lucide-react"
import { useUser, useFirestore, useMemoFirebase } from "@/firebase/provider"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { doc } from "firebase/firestore"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

const faqs = [
    {
      question: "Como conecto meu celular para enviar mensagens?",
      answer: "Vá para a tela de Configurações, clique na aba 'WhatsApp Web' e leia o QR Code com o seu celular usando o aplicativo do WhatsApp."
    },
    {
      question: "Posso usar variáveis nos templates?",
      answer: "Sim! Você pode usar variáveis como {{NOME_CLIENTE}} e {{DATA_CONSULTA}} no conteúdo do seu template. Elas serão substituídas automaticamente."
    },
    {
      question: "Onde vejo as mensagens que foram enviadas?",
      answer: "A tela 'Caixa de Saída' mostra um histórico de todas as mensagens agendadas, enviadas e que falharam."
    },
    {
      question: "Por que minha mensagem falhou?",
      answer: "Uma falha pode ocorrer por vários motivos: o número de telefone do destinatário pode estar incorreto, sua conexão com o WhatsApp pode ter sido perdida, ou pode haver um problema com o provedor de serviços. Verifique sempre os detalhes na 'Caixa de Saída' e, se o problema persistir, confirme suas configurações."
    }
]

export default function SupportPage() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(() => {
    if (!authUser) return null;
    return doc(firestore, "users", authUser.uid);
  }, [firestore, authUser]);

  const handleResetTour = async () => {
    if (!userDocRef) return;

    try {
      // Reseta o progresso do onboarding no Firestore
      // CORREÇÃO: Nome do campo ajustado para 'onboardingCompleted' para bater com o Wrapper
      await setDocumentNonBlocking(userDocRef, {
        onboardingCompleted: false, 
        onboardingProgress: []
      }, { merge: true });

      // Mostra uma notificação de sucesso
      toast({ 
        title: "Tour Reiniciado!", 
        description: "O guia de início rápido aparecerá agora. Estamos redirecionando você para o Dashboard."
      });

      // Redireciona para o dashboard para começar o tour
      // CORREÇÃO: Adicionado o parâmetro '?tour=true' e usado replace
      router.replace('/dashboard?tour=true');

    } catch (error) {
      console.error("Erro ao reiniciar o tour:", error);
      toast({ 
        variant: "destructive",
        title: "Erro", 
        description: "Não foi possível reiniciar o tour. Tente novamente."
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-2 gap-8 items-start">
        <div>
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Ajuda Interativa</CardTitle>
                    <CardDescription>Não sabe por onde começar? Refaça nosso tour introdutório a qualquer momento.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleResetTour}>
                        <HelpCircle className="mr-2 h-4 w-4" />
                        Refazer Tour Guiado
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Entre em Contato</CardTitle>
                    <CardDescription>Não encontrou sua resposta? Nos envie uma mensagem.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="subject">Assunto</Label>
                        <Input id="subject" placeholder="Ex: Dúvida sobre faturamento" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="message">Sua Mensagem</Label>
                        <Textarea id="message" placeholder="Descreva seu problema ou dúvida aqui..." className="min-h-32" />
                    </div>
                </CardContent>
                <CardContent>
                    <Button className="w-full">Enviar Mensagem</Button>
                </CardContent>
            </Card>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Dúvidas Frequentes (FAQ)</CardTitle>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                    {faqs.map((faq, index) => (
                          <AccordionItem key={index} value={`item-${index}`}>
                            <AccordionTrigger>{faq.question}</AccordionTrigger>
                            <AccordionContent>
                                {faq.answer}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
        </Card>
      </div>
    </div>
  )
}