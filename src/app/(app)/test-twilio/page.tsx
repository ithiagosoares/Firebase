
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function TestTwilioPage() {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleTestConnection = async () => {
        setIsLoading(true);
        toast({ title: "Iniciando conexão...", description: "Comunicando com o servidor para criar a sessão da Twilio." });

        try {
            const response = await fetch('/api/twilio/embedded-signup', {
                method: 'POST',
            });

            if (!response.ok) {
                const errorData = await response.json();
                // CORREÇÃO: Prioriza a mensagem de erro detalhada (details) vinda do backend.
                throw new Error(errorData.details || errorData.error || `Erro do servidor: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.signupUrl) {
                toast({ title: "Sucesso!", description: "Redirecionando para a Twilio agora." });
                window.location.href = data.signupUrl;
            } else {
                throw new Error("A URL de signup não foi recebida do servidor.");
            }

        } catch (error: any) {
            console.error("Falha ao testar a conexão com a Twilio:", error);
            toast({
                title: "Erro na Conexão",
                description: error.message || "Não foi possível iniciar o processo de conexão.",
                variant: "destructive",
            });
            setIsLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center h-full">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Página de Teste de Conexão</CardTitle>
                    <CardDescription>
                        Use esta página para verificar se o fluxo de &quot;Embedded Signup&quot; da Twilio está funcionando corretamente.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="mb-4 text-sm text-muted-foreground">
                        Ao clicar no botão, você iniciará o processo:
                        <br />1. O servidor criará uma subconta na Twilio.
                        <br />2. Você será redirecionado para a Twilio para conectar um número.
                        <br />3. Ao concluir, a Twilio chamará nosso endpoint de callback para finalizar.
                    </p>
                    <Button onClick={handleTestConnection} disabled={isLoading} className="w-full">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isLoading ? "Processando..." : "Testar Conexão Twilio"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
