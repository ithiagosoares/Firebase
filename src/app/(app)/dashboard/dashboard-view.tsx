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
import { collection, query, orderBy } from "firebase/firestore"
import { type Patient, type ScheduledMessage } from "@/lib/types"

export default function DashboardView() {
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()

  // Buscamos TODOS os pacientes
  // Nota: Não usamos orderBy('createdAt') aqui para garantir que pacientes importados
  // sem data (CSV antigo) ainda sejam contados no card de "Total".
  const patientsCollection = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/patients`);
  }, [firestore, user]);
  
  const { data: patients, isLoading: isLoadingPatients } = useCollection<Patient>(patientsCollection);
  
  // Query de mensagens
  const messagesCollection = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, `users/${user.uid}/scheduledMessages`), orderBy('scheduledAt', 'desc'));
  }, [firestore, user]);
  
  const { data: messages, isLoading: isLoadingMessages } = useCollection<ScheduledMessage>(messagesCollection);

  const stats = useMemo(() => {
    const sentMessages = messages?.filter(m => m.status === 'Enviado').length || 0;
    const failedMessages = messages?.filter(m => m.status === 'Falhou').length || 0;
    const pendingMessages = messages?.filter(m => m.status === 'Agendado').length || 0;

    return [
      {
        title: "Total de Pacientes",
        value: patients?.length ?? 0,
        icon: Users,
        change: "Base total de contatos",
      },
      {
        title: "Mensagens Enviadas",
        value: sentMessages,
        icon: MessageSquare,
        change: "Total acumulado",
      },
      {
        title: "Agendadas",
        value: pendingMessages,
        icon: Calendar,
        change: "Próximos envios",
      },
      {
        title: "Falhas de Envio",
        value: failedMessages,
        icon: AlertCircle,
        change: "Total acumulado",
      },
    ]
  }, [patients, messages]);

  // Filtra pacientes para garantir que o GRÁFICO não quebre se faltar data
  // Pacientes importados via CSV precisam ter o campo createdAt para aparecerem na linha do tempo
  const chartPatients = useMemo(() => {
    if (!patients) return [];
    return patients
        .filter(p => p.createdAt) // Só manda pro gráfico quem tem data
        .sort((a, b) => {
             // Ordenação segura em memória
             const dateA = a.createdAt?.seconds || 0;
             const dateB = b.createdAt?.seconds || 0;
             return dateA - dateB;
        });
  }, [patients]);


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
          <Card key={link.title} className="flex flex-col hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <link.icon className="h-5 w-5 text-primary" />
                {link.title}
              </CardTitle>
              <CardDescription>{link.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex items-end">
              <Button asChild className="w-full" variant="outline">
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
        {/* Passamos chartPatients (filtrados) para evitar erros no gráfico */}
        <SentMessagesChart messages={messages || []} isLoading={isLoading} />
        <NewPatientsChart patients={chartPatients} isLoading={isLoading} />
      </div>
    </>
  )
}