"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { useToast } from "../hooks/use-toast";
import { Loader2 } from "lucide-react";

// A URL da nossa Cloud Function que atua como um proxy seguro.
const WPP_FUNCTION_URL =
  "https://southamerica-east1-studio-296644579-18969.cloudfunctions.net/wpp";

export function WhatsappIntegration() {
  const [connectionStatus, setConnectionStatus] = useState("Desconhecido");
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(
    null
  );
  const { toast } = useToast();

  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  };

  const checkSessionStatus = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);

    try {
      // Chamada corrigida para a Cloud Function
      const response = await axios.post(WPP_FUNCTION_URL);

      if (response.data.qr) {
        setConnectionStatus("Aguardando leitura do QR Code");
        setQrCodeBase64(response.data.qr);
        if (!pollingInterval) {
          const interval = setInterval(() => checkSessionStatus(false), 5000);
          setPollingInterval(interval);
        }
      } else if (response.data.message === "WhatsApp já conectado") {
        setConnectionStatus("Conectado");
        setQrCodeBase64(null);
        stopPolling();
        toast({
          title: "Sucesso",
          description: "A conexão com o WhatsApp está ativa.",
        });
      } else {
        setConnectionStatus("Desconectado");
        setQrCodeBase64(null);
        stopPolling();
      }
    } catch (error) {
      console.error("Falha ao verificar status da sessão:", error);
      setConnectionStatus("Erro de conexão com o serviço");
      setQrCodeBase64(null);
      stopPolling();
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível conectar ao serviço de mensagens.",
      });
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSessionStatus();
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Integração com WhatsApp</CardTitle>
        <CardDescription>
          Conecte sua conta do WhatsApp para automatizar o envio de mensagens
          para seus pacientes.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-2">
          <span
            className={`h-3 w-3 rounded-full ${
              connectionStatus === "Conectado" ? "bg-green-500" : "bg-red-500"
            }`}
          ></span>
          <p>
            Status: <strong>{connectionStatus}</strong>
          </p>
        </div>

        {qrCodeBase64 && (
          <div className="flex flex-col items-center gap-2 p-4 border rounded-md">
            <p className="text-sm text-center">
              Escaneie o código abaixo com o app do WhatsApp no seu celular para
              conectar.
            </p>
            <img
              src={`data:image/png;base64,${qrCodeBase64}`}
              alt="WhatsApp QR Code"
              className="w-48 h-48"
            />
          </div>
        )}

        <Button onClick={() => checkSessionStatus()} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verificando...
            </>
          ) : (
            "Verificar Conexão / Gerar QR Code"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
