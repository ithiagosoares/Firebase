'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { useToast } from '../hooks/use-toast';
import { Loader2 } from 'lucide-react';

// URL correta para o backend do WhatsApp rodando no Cloud Run
const WPP_BACKEND_URL = 'https://vitallink-whatsapp-814805864825.southamerica-east1.run.app';

export function WhatsappIntegration() {
  const [connectionStatus, setConnectionStatus] = useState('Desconhecido');
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Função para buscar o QR code ou o status
  const checkSessionStatus = async () => {
    setIsLoading(true);
    setQrCodeBase64(null); // Limpa o QR code antigo

    try {
      // O backend espera um POST para /start-session com um userId.
      const response = await axios.post(`${WPP_BACKEND_URL}/start-session`, {
        userId: 'vitallink-frontend' // Usando um ID fixo para esta integração
      });

      if (response.data.qr) {
        setConnectionStatus('Aguardando leitura do QR Code');
        setQrCodeBase64(response.data.qr);
        toast({ title: 'QR Code Gerado', description: 'Escaneie o código para conectar.' });
      } else if (response.data.message === 'Client is already connected!') {
        setConnectionStatus('Conectado');
        toast({ title: 'Sucesso', description: 'A conexão com o WhatsApp já está ativa.' });
      } else {
        setConnectionStatus('Desconectado');
      }
    } catch (error) {
      console.error('Falha ao conectar com o backend do WhatsApp:', error);
      setConnectionStatus('Erro de conexão com o serviço');
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível conectar ao serviço de mensagens.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Integração com WhatsApp</CardTitle>
        <CardDescription>
          Conecte sua conta do WhatsApp para automatizar o envio de mensagens para seus pacientes.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${connectionStatus === 'Conectado' ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <p>Status: <strong>{connectionStatus}</strong></p>
        </div>

        {qrCodeBase64 && (
          <div className="flex flex-col items-center gap-2 p-4 border rounded-md">
            <p className="text-sm text-center">Escaneie o código abaixo com o app do WhatsApp no seu celular para conectar.</p>
            {/* Corrigindo o src da imagem para usar o formato correto de data URL */}
            <img src={qrCodeBase64} alt="WhatsApp QR Code" className="w-48 h-48" />
          </div>
        )}

        <Button onClick={checkSessionStatus} disabled={isLoading}>
          {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Buscando sessão...</> : 'Verificar Conexão / Gerar QR Code'}
        </Button>
      </CardContent>
    </Card>
  );
}
