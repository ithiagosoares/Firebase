'use client'

import React, { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Zap, CheckCircle } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase/provider';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

const META_APP_ID = '821688910682652';

export function WhatsappIntegration() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading');

  const checkIntegrationStatus = useCallback(async () => {
    if (!user || !firestore) return;
    try {
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists() && userDoc.data().whatsappSession) {
        setIntegrationStatus('connected');
      } else {
        setIntegrationStatus('disconnected');
      }
    } catch (error) {
      console.error("Erro ao verificar status da integração:", error);
      setIntegrationStatus('disconnected');
    }
  }, [user, firestore]);

  useEffect(() => {
    checkIntegrationStatus();
  }, [checkIntegrationStatus]);

  useEffect(() => {
    if (document.getElementById('facebook-jssdk')) {
      setIsSdkLoaded(true);
      return;
    }

    window.fbAsyncInit = function () {
      window.FB.init({
        appId: META_APP_ID,
        cookie: true,
        xfbml: true,
        version: 'v19.0'
      });
      setIsSdkLoaded(true);
    };

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

  }, []);

// Dentro de whatsapp-integration.tsx

// Dentro de src/components/whatsapp-integration.tsx

  const handleLogin = () => {
    // 1. Verificações iniciais
    if (!isSdkLoaded || !user) {
      toast({ title: "Aguarde", description: "Carregando integração com a Meta..." });
      return;
    }

    setIsLoading(true);

    // 2. Timeout de segurança (Crucial para não travar o botão se o user fechar o popup)
    const loginTimeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        // Não mostramos erro aqui para não assustar, as vezes é só demora da rede
      }
    }, 60000); // 1 minuto de tolerância

    // 3. Chamada de Login SEM config_id, mas COM scopes manuais
    window.FB.login(async function(response: any) {
      clearTimeout(loginTimeout); // Cancelamos o timeout pois houve resposta

      if (response.authResponse) {
        // Tenta pegar o código de várias formas possíveis que o SDK retorna
        const code = response.code || response.authResponse.code; 

        if (code) {
            try {
                // Chama nosso backend para trocar o CODE pelo TOKEN permanente
                const res = await fetch('/api/whatsapp/exchange-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, userId: user.uid })
                });

                if (res.ok) {
                    const data = await res.json();
                    toast({ 
                        title: "Sucesso!", 
                        description: `WhatsApp conectado: ${data.phoneNumber || 'Número salvo'}` 
                    });
                    setIntegrationStatus('connected');
                } else {
                    throw new Error("Falha na troca de token no servidor");
                }
            } catch (error) {
                console.error("Erro no backend:", error);
                toast({ variant: "destructive", title: "Erro de Conexão", description: "Falha ao salvar os dados. Tente novamente." });
            }
        } else {
            console.error("Code não recebido. Resposta bruta:", response);
            // Se não veio code, pode ter vindo apenas o token temporário, o que não serve para System User
            toast({ variant: "destructive", title: "Erro de Permissão", description: "Não recebemos o código de autorização necessário." });
        }

      } else {
        console.log('Usuário cancelou o login ou fechou a janela.');
        toast({ variant: "default", title: "Cancelado", description: "O processo foi cancelado." });
      }
      
      setIsLoading(false); // Destrava o botão
    }, {
      // --- AQUI ESTÁ A MUDANÇA MÁGICA ---
      // Em vez de config_id, usamos os scopes manuais:
      scope: 'email,public_profile,whatsapp_business_management,whatsapp_business_messaging',
      
      // Mantemos isso para dizer que queremos um CODE (para trocar no backend), não um token solto
      response_type: 'code', 
      override_default_response_type: true,
      
      // Isso é OBRIGATÓRIO para abrir o fluxo de "Cadastro Incorporado" (Embedded Signup)
      extras: {
        setup: {
          ...({})
        }
      }
    });
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Integração com WhatsApp</CardTitle>
        <CardDescription>
          Conecte sua conta do WhatsApp Business para automatizar o envio de mensagens, lembretes e consentimentos diretamente da plataforma.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center space-y-4 p-8">
        <Image 
          src="https://firebasestorage.googleapis.com/v0/b/vitallink-c0b90.firebasestorage.app/o/VitalLink%20connection%20wpp.webp?alt=media&token=b8334b82-b46c-4f73-9da8-e914da671b60" 
          alt="Ilustração da Integração VitalLink com o WhatsApp" 
          className="w-full max-w-sm mx-auto"
          width={400}
          height={400}
          priority
        />
        
        {integrationStatus === 'loading' && (
          <Button disabled className="w-full max-w-xs">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Verificando Status...
          </Button>
        )}

        {integrationStatus === 'disconnected' && (
          <Button onClick={handleLogin} disabled={!isSdkLoaded || isLoading} className="w-full max-w-xs bg-green-600 hover:bg-green-700">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
            {isLoading ? 'Conectando...' : 'Conectar com WhatsApp'}
          </Button>
        )}

        {integrationStatus === 'connected' && (
           <div className="p-4 bg-green-50 border border-green-200 rounded-md w-full max-w-xs text-center">
             <CheckCircle className="mx-auto h-8 w-8 text-green-600 mb-2" />
             <p className="font-semibold text-green-800">WhatsApp Conectado</p>
             <p className="text-sm text-green-700">Sua conta está ativa e pronta para enviar mensagens.</p>
           </div>
        )}

        <p className="text-xs text-muted-foreground text-center max-w-md">
          Ao conectar, você concorda com os <a href="https://www.whatsapp.com/legal/business-policy/" target="_blank" rel="noopener noreferrer" className="underline">Termos de Serviço do WhatsApp Business</a>. 
          Uma janela pop-up da Meta será aberta para autenticação.
        </p>
      </CardContent>
    </Card>
  );
}