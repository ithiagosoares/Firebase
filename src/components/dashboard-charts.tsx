"use client"

import { useMemo } from "react"
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, MessageSquare } from "lucide-react"
import { type ScheduledMessage, type Patient } from "@/lib/types"
import { subMonths, format, startOfMonth } from "date-fns"

const ChartEmptyState = ({ message, icon: Icon }: { message: string, icon: React.ElementType }) => (
  <div className="flex flex-col items-center justify-center h-full w-full text-muted-foreground gap-4 py-16">
    <Icon className="h-12 w-12 opacity-50" />
    <p className="text-center">{message}</p>
  </div>
);


export function SentMessagesChart({ messages, isLoading }: { messages: ScheduledMessage[], isLoading: boolean }) {
  const monthlyMessagesData = useMemo(() => {
    if (!messages) return [];
    
    const now = new Date();
    const data: { month: string, sent: number, failed: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = subMonths(now, i);
      const monthKey = format(date, 'yyyy-MM');
      const monthName = format(date, 'MMM');

      data.push({
        month: monthName,
        sent: 0,
        failed: 0,
      });
    }

    messages.forEach(message => {
        try {
            const messageDate = message.scheduledTime.toDate();
            const monthName = format(messageDate, 'MMM');
            
            const monthData = data.find(d => d.month === monthName);

            if (monthData) {
                if (message.status === 'Enviado') {
                    monthData.sent++;
                } else if (message.status === 'Falhou') {
                    monthData.failed++;
                }
            }
        } catch (e) {
            // Ignore invalid date formats in mock or old data
        }
    });

    return data;
  }, [messages])
  
  if (isLoading) {
    return (
      <Card>
          <CardHeader>
              <div className="h-5 bg-muted rounded-md w-1/2 mb-2" />
              <div className="h-4 bg-muted rounded-md w-3/4" />
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
              <div className="w-full h-full bg-muted rounded-lg" />
          </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mensagens Enviadas</CardTitle>
        <CardDescription>Um resumo das mensagens enviadas e falhadas nos últimos 6 meses.</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        {messages.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyMessagesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                }}
              />
              <Bar dataKey="sent" fill="hsl(var(--primary))" name="Enviadas" radius={[4, 4, 0, 0]} />
              <Bar dataKey="failed" fill="hsl(var(--destructive))" name="Falharam" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmptyState message="Nenhuma mensagem enviada ainda. As estatísticas aparecerão aqui." icon={MessageSquare} />
        )}
      </CardContent>
    </Card>
  )
}

export function NewPatientsChart({ patients, isLoading }: { patients: Patient[], isLoading: boolean }) {
    const newPatientsData = useMemo(() => {
        if (!patients) return [];

        const now = new Date();
        const data: { month: string, count: number }[] = [];

        for (let i = 5; i >= 0; i--) {
            const date = subMonths(now, i);
            const monthName = format(date, 'MMM');
            data.push({ month: monthName, count: 0 });
        }

        patients.forEach(patient => {
            // This is a proxy for creation date. In a real app, you'd have a createdAt field.
            // We'll use lastAppointment for this example as it is more likely to exist.
             try {
                const createdDate = patient.lastAppointment || patient.nextAppointment;
                if (createdDate) {
                    const joinDate = createdDate.toDate();
                     const monthName = format(joinDate, 'MMM');
                     const monthData = data.find(d => d.month === monthName);
                     if(monthData) {
                        monthData.count++;
                     }
                }
            } catch (e) {
                // Ignore invalid date formats
            }
        });

        return data;
    }, [patients]);
    
  if (isLoading) {
    return (
      <Card>
          <CardHeader>
              <div className="h-5 bg-muted rounded-md w-1/2 mb-2" />
              <div className="h-4 bg-muted rounded-md w-3/4" />
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
              <div className="w-full h-full bg-muted rounded-lg" />
          </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Novos Pacientes</CardTitle>
        <CardDescription>Crescimento do número de pacientes cadastrados.</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        {patients.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={newPatientsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                }}
              />
              <Line type="monotone" dataKey="count" name="Novos Pacientes" stroke="hsl(var(--primary))" strokeWidth={2} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
           <ChartEmptyState message="Nenhum paciente novo registrado. Comece a adicionar pacientes para ver o gráfico." icon={Users} />
        )}
      </CardContent>
    </Card>
  )
}
