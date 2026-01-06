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
      console.error("Erro ao verificar status:", error);
      setIntegrationStatus('disconnected');
    }
  }, [user, firestore]);

  useEffect(() => {
    checkIntegrationStatus();
  }, [checkIntegrationStatus]);

  // Carrega o SDK
  useEffect(() => {
    if (window.FB) {
      setIsSdkLoaded(true);
      return;
    }

    window.fbAsyncInit = function () {
      window.FB.init({
        appId: META_APP_ID,
        cookie: true,
        xfbml: true,
        version: 'v20.0'
      });
      setIsSdkLoaded(true);
    };

    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, []);

  // Função separada para processar o resultado (Aqui pode ser Async)
  const processFacebookResponse = async (response: any) => {
    if (!user) return;

    if (response.authResponse) {
        const code = response.code || response.authResponse.code; 
        
        if (code) {
            try {
                // Troca o código pelo token na nossa API
                const res = await fetch('/api/whatsapp/exchange-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, userId: user.uid })
                });

                if (res.ok) {
                    const data = await res.json();
                    toast({ 
                        title: "Conectado!", 
                        description: `WhatsApp vinculado: ${data.phoneNumber || 'Sucesso'}` 
                    });
                    setIntegrationStatus('connected');
                } else {
                    const errText = await res.text();
                    console.error("Erro API:", errText);
                    throw new Error("Falha ao salvar dados no servidor.");
                }
            } catch (error) {
                console.error("Erro processamento:", error);
                toast({ variant: "destructive", title: "Erro", description: "Falha na conexão com o servidor." });
            }
        } else {
             console.error("Code não recebido:", response);
             toast({ variant: "destructive", title: "Erro", description: "A Meta não retornou o código de autorização." });
        }
    } else {
        console.log('Login cancelado.');
    }
    
    // Sempre desativa o loading no final
    setIsLoading(false);
  };

  const handleLogin = () => {
    if (!isSdkLoaded || !user) {
      toast({ title: "Aguarde", description: "Carregando integração..." });
      return;
    }

    setIsLoading(true);

    // Timeout de segurança
    const loginTimeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
      }
    }, 120000); 

    // O PULO DO GATO: Esta função NÃO pode ser async
    window.FB.login(function(response: any) {
      clearTimeout(loginTimeout);
      // Chamamos a função async separadamente
      processFacebookResponse(response);
    }, {
      scope: 'email,public_profile,whatsapp_business_management,whatsapp_business_messaging',
      response_type: 'code', 
      override_default_response_type: true,
      extras: {
        setup: {}
      }
    });
  };
   
  return (
    <Card>
      <CardHeader>
        <CardTitle>Integração com WhatsApp</CardTitle>
        <CardDescription>Conecte sua conta do WhatsApp Business.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center space-y-4 p-8">
        <Image 
          src="https://firebasestorage.googleapis.com/v0/b/vitallink-c0b90.firebasestorage.app/o/VitalLink%20connection%20wpp.webp?alt=media&token=b8334b82-b46c-4f73-9da8-e914da671b60" 
          alt="WhatsApp Integration" 
          className="w-full max-w-sm mx-auto"
          width={400} height={400}
        />
        
        {integrationStatus === 'loading' && (
          <Button disabled className="w-full max-w-xs"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...</Button>
        )}

        {integrationStatus === 'disconnected' && (
          <Button onClick={handleLogin} disabled={!isSdkLoaded || isLoading} className="w-full max-w-xs bg-green-600 hover:bg-green-700">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
            {isLoading ? 'Aguardando Meta...' : 'Conectar com WhatsApp'}
          </Button>
        )}

        {integrationStatus === 'connected' && (
           <div className="p-4 bg-green-50 border border-green-200 rounded-md w-full max-w-xs text-center">
             <CheckCircle className="mx-auto h-8 w-8 text-green-600 mb-2" />
             <p className="font-semibold text-green-800">Conectado</p>
           </div>
        )}
      </CardContent>
    </Card>
  );
}