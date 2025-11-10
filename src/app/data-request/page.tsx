
"use client";

import { useState } from "react";
import { LandingHeader } from "@/components/landing/landing-header";
import { Footer } from "@/components/landing/footer";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

export default function DataRequestPage() {
  const { toast } = useToast();
  const [requestType, setRequestType] = useState("access");
  const [email, setEmail] = useState("");
  const [details, setDetails] = useState("");
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Em um aplicativo real, isso enviaria os dados para um backend para processamento.
    console.log({ requestType, email, details });
    
    toast({
        title: "Solicitação Enviada",
        description: "Sua solicitação foi recebida. Entraremos em contato pelo e-mail fornecido em breve."
    });
    
    setEmail("");
    setDetails("");
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-800 font-sans">
      <LandingHeader />
      <main className="flex-1 py-12 md:py-20">
        <div className="container mx-auto px-4 md:px-6 max-w-2xl">
          <PageHeader title="Solicitação de Dados (LGPD)" />
          <Card>
            <form onSubmit={handleSubmit}>
                <CardHeader>
                    <CardTitle>Exerça Seus Direitos</CardTitle>
                    <CardDescription>
                        Use este formulário para solicitar acesso ou exclusão de seus dados pessoais, conforme garantido pela Lei Geral de Proteção de Dados (LGPD).
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-3">
                        <Label>Tipo de Solicitação</Label>
                        <RadioGroup defaultValue="access" value={requestType} onValueChange={setRequestType}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="access" id="r1" />
                                <Label htmlFor="r1">Acesso aos meus dados</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="deletion" id="r2" />
                                <Label htmlFor="r2">Exclusão dos meus dados (conta)</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">E-mail de Cadastro</Label>
                        <Input 
                            id="email" 
                            type="email"
                            placeholder="seu@email.com" 
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="details">Detalhes Adicionais (Opcional)</Label>
                        <Textarea 
                            id="details" 
                            placeholder="Forneça qualquer informação adicional que possa nos ajudar a localizar seus dados."
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" className="w-full">Enviar Solicitação</Button>
                </CardFooter>
            </form>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
