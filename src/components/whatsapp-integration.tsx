
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { useToast } from '../hooks/use-toast';
import { Loader2, CheckCircle, Link as LinkIcon } from 'lucide-react';
import { useUser } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc, getFirestore } from 'firebase/firestore';

// Componente que lida com a integração oficial da Twilio
export function WhatsappIntegration() {
  const { user: authUser } = useUser();
  const firestore = getFirestore();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);

  // Referência ao documento da clínica no Firestore
  const clinicDocRef = authUser ? doc(firestore, 'clinics', authUser.uid) : null;
  const { data: clinicData } = useDoc<{ isTwilioConnected?: boolean }>(clinicDocRef);

  const isConnected = clinicData?.isTwilioConnected === true;

  // Função para iniciar o fluxo de conexão da Twilio
  const handleConnect = async () => {
    setIsLoading(true);
    toast({ title: "Iniciando conexão...", description: "Você será redirecionado para a Twilio." });

    try {
      const response = await fetch('/api/twilio/embedded-signup', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.url) {
        // Abre a URL de consentimento da Twilio em uma nova aba/popup
        window.open(data.url, 'twilioConnect', 'width=800,height=600');
      } else {
        throw new Error(data.error || 'Falha ao obter URL da Twilio.');
      }
    } catch (error: any) {
      console.error('Falha ao iniciar a conexão com a Twilio:', error);
      toast({
        variant: 'destructive',
        title: 'Erro de Conexão',
        description: error.message || 'Não foi possível iniciar o processo de conexão.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Integração com WhatsApp Oficial</CardTitle>
        <CardDescription>
          Conecte sua conta do WhatsApp Business para enviar mensagens de forma automatizada e segura através da API oficial.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center gap-4 p-6">
        {isConnected ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <h3 className="text-lg font-semibold">Conexão Ativa</h3>
            <p className="text-sm text-muted-foreground">Sua conta do WhatsApp Business está conectada com sucesso.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
             <LinkIcon className="h-10 w-10 text-muted-foreground" />
             <h3 className="text-lg font-semibold">Nenhuma conexão encontrada</h3>
             <p className="text-sm text-muted-foreground max-w-md">Clique no botão abaixo para ser guiado pelo processo de conexão segura da Twilio e habilitar o envio de mensagens.</p>
            <Button onClick={handleConnect} disabled={isLoading} size="lg" className="mt-4">
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Aguardando...</>
              ) : (
                'Conectar com WhatsApp'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
