'use client'

import { useMemo } from "react"
import { NewPatientsChart, SentMessagesChart } from "@/components/dashboard-charts"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MessageSquare, Users, AlertCircle, Calendar, PlusCircle, FileText, Loader2 } from "lucide-react"
import Link from "next/link"
import { useUser, useFirestore, useMemoFirebase } from "@/firebase/provider"
import { useCollection } from "@/firebase/firestore/use-collection"
import { collection } from "firebase/firestore"
import { type Patient, type ScheduledMessage } from "@/lib/types"

export default function DashboardView() {
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()

  const patientsCollection = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/patients`);
  }, [firestore, user]);
  const { data: patients, isLoading: isLoadingPatients } = useCollection<Patient>(patientsCollection);
  
  const messagesCollection = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/scheduledMessages`);
  }, [firestore, user]);
  const { data: messages, isLoading: isLoadingMessages } = useCollection<ScheduledMessage>(messagesCollection);

  const stats = useMemo(() => {
    const sentMessages = messages?.filter(m => m.status === 'Enviado').length || 0;
    const failedMessages = messages?.filter(m => m.status === 'Falhou').length || 0;

    return [
      {
        title: "Total de Pacientes",
        value: patients?.length ?? 0,
        icon: Users,
        change: "Pacientes cadastrados",
      },
      {
        title: "Mensagens Enviadas",
        value: sentMessages,
        icon: MessageSquare,
        change: "No último mês",
      },
      {
        title: "Consultas Marcadas",
        value: "N/A",
        icon: Calendar,
        change: "Em breve",
      },
      {
        title: "Falhas de Envio",
        value: failedMessages,
        icon: AlertCircle,
        change: "No último mês",
      },
    ]
  }, [patients, messages]);


  const quickLinks = [
    { title: "Adicionar Paciente", icon: PlusCircle, href: "/patients", description: "Cadastre um novo paciente." },
    { title: "Agendar Consulta", icon: Calendar, href: "/calendar", description: "Marque uma nova consulta." },
    { title: "Criar Template", icon: FileText, href: "/templates", description: "Crie um novo modelo de mensagem." },
  ]
  
  const isLoading = isUserLoading || isLoadingPatients || isLoadingMessages;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {quickLinks.map((link) => (
          <Card key={link.title} className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <link.icon className="h-5 w-5 text-primary" />
                {link.title}
              </CardTitle>
              <CardDescription>{link.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex items-end">
              <Button asChild className="w-full">
                <Link href={link.href}>Acessar</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      
       {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array(4).fill(0).map((_, index) => (
                <Card key={index}>
                    <CardHeader>
                        <div className="h-4 bg-muted rounded-md w-3/4" />
                    </CardHeader>
                    <CardContent>
                        <div className="h-8 bg-muted rounded-md w-1/2 mb-2" />
                        <div className="h-3 bg-muted rounded-md w-full" />
                    </CardContent>
                </Card>
            ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
            <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.change}</p>
                </CardContent>
            </Card>
            ))}
        </div>
      )}


      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 mt-8">
        <SentMessagesChart messages={messages || []} isLoading={isLoading} />
        <NewPatientsChart patients={patients || []} isLoading={isLoading} />
      </div>
    </>
  )
}
