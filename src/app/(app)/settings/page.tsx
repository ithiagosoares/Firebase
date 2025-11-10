"use client"

import { useState, useEffect } from "react"
import { Upload, ExternalLink, MessageCircle, Save, LogIn, LogOut, CheckCircle, Loader2, Star, Check, QrCode, Workflow } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { doc, type User } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { getFunctions, httpsCallable } from "firebase/functions"

import { useUser, useFirestore, useMemoFirebase } from "@/firebase/provider"
import { useDoc } from "@/firebase/firestore/use-doc"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { updateProfile } from "firebase/auth"

export default function SettingsPage() {
  const { toast } = useToast()
  const { user: authUser, auth } = useUser()
  const firestore = useFirestore()
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  // User Profile State
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [profilePicPreview, setProfilePicPreview] = useState("https://firebasestorage.googleapis.com/v0/b/studio-296644579-18969.firebasestorage.app/o/perfil_usuario.svg?alt=media&token=bef5fdca-7321-4928-a649-c45def482e59")
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Company State
  const [clinicName, setClinicName] = useState("Clínica VitalLink")
  const [address, setAddress] = useState("Rua das Flores, 123, São Paulo, SP")
  const [cnpj, setCnpj] = useState("12.345.678/0001-90")
  const [contactEmail, setContactEmail] = useState("contato@vitallink.com")
  const [dpoContact, setDpoContact] = useState("dpo@vitallink.com")
  const [allowConsentExport, setAllowConsentExport] = useState(true)
  const [retentionPeriod, setRetentionPeriod] = useState("5")
  
  // WhatsApp State
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isQrLoading, setIsQrLoading] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<string>('disconnected');

  // n8n State
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState('');
  const [isN8nConnected, setIsN8nConnected] = useState(false);


  const userDocRef = useMemoFirebase(() => {
    if (!authUser) return null;
    return doc(firestore, "users", authUser.uid);
  }, [firestore, authUser]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<User>(userDocRef);

  useEffect(() => {
    // This effect handles data from Firebase Authentication (email, photo)
    if (authUser) {
      if (authUser.photoURL) {
        setProfilePicPreview(authUser.photoURL);
      }
      if (authUser.email) {
        setEmail(authUser.email);
      }
    }
  }, [authUser]);

  useEffect(() => {
    // This effect handles data from the Firestore document (name, n8nUrl)
    if (userData) {
      if (userData.name) {
        const nameParts = userData.name.split(' ');
        setFirstName(nameParts[0] || "");
        setLastName(nameParts.slice(1).join(' ') || "");
      }
      
      const n8nUrl = (userData as any).n8nWebhookUrl;
      if(n8nUrl) {
        setN8nWebhookUrl(n8nUrl);
        setIsN8nConnected(true);
      } else {
        setIsN8nConnected(false);
      }
    }
  }, [userData]);


  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setProfilePicFile(file);
      setProfilePicPreview(URL.createObjectURL(file))
    }
  }

  const handleSaveProfile = async () => {
    if (!userDocRef || !auth || !auth.currentUser) return;
    
    setIsSubmitting("profile");
    
    try {
        let downloadURL = auth.currentUser.photoURL;

        if (profilePicFile) {
            const storage = getStorage();
            const storageRef = ref(storage, `profile-pictures/${auth.currentUser.uid}`);
            
            const snapshot = await uploadBytes(storageRef, profilePicFile);
            downloadURL = await getDownloadURL(snapshot.ref);

            await updateProfile(auth.currentUser, { photoURL: downloadURL });
        }

        const name = `${firstName} ${lastName}`.trim();
        await setDocumentNonBlocking(userDocRef, { name, email }, { merge: true });
        
        toast({
            title: "Perfil atualizado!",
            description: `As alterações do seu perfil foram salvas com sucesso.`
        });
    } catch (error) {
        console.error("Error saving profile:", error);
        toast({
            variant: "destructive",
            title: "Erro ao salvar",
            description: "Não foi possível salvar as alterações do perfil."
        });
    } finally {
        setIsSubmitting(null);
        setProfilePicFile(null);
    }
  }
  
  const handleGenerateQrCode = async () => {
    setIsQrLoading(true);
    setQrCode(null);
    setSessionStatus('loading');
    toast({
        title: "Gerando QR Code...",
        description: "Aguarde um momento, estamos iniciando a sessão do WhatsApp."
    });

    try {
        const backendUrl = "https://whatsapp-backend-final-production.up.railway.app";
        const response = await fetch(`${backendUrl}/start-session`, {
            method: 'POST',
             headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: authUser?.uid })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Falha ao iniciar a sessão.');
        }

        const data = await response.json();

        if (data.qr) {
            setQrCode(data.qr);
            setSessionStatus('qr_ready');
            toast({
                title: "QR Code Gerado!",
                description: "Escaneie o código com o seu celular.",
            });
        } else if (data.message === 'Client is already ready.') {
             setSessionStatus('connected');
             setQrCode(null);
             toast({
                title: "Já Conectado!",
                description: "A sessão do WhatsApp já está ativa.",
            });
        }

    } catch (error) {
        console.error("Error generating QR code:", error);
        setSessionStatus('disconnected');
        toast({
            variant: "destructive",
            title: "Erro ao Gerar QR Code",
            description: (error as Error).message || "Não foi possível conectar ao backend.",
        });
    } finally {
        setIsQrLoading(false);
    }
};

  const handleN8nConnect = () => {
    if (!userDocRef || !n8nWebhookUrl) {
        toast({
            variant: "destructive",
            title: "URL Ausente",
            description: "Por favor, insira a URL do webhook do n8n."
        });
        return;
    }
    setDocumentNonBlocking(userDocRef, { n8nWebhookUrl: n8nWebhookUrl }, { merge: true });
    toast({
      title: "Conexão Bem-Sucedida!",
      description: "Sua conta agora está pronta para enviar mensagens via n8n.",
    });
  };

  const handleN8nDisconnect = () => {
    if (!userDocRef) return;
    setDocumentNonBlocking(userDocRef, { n8nWebhookUrl: "" }, { merge: true });
    setN8nWebhookUrl("");
    toast({
      variant: "default",
      title: "Desconectado!",
      description: "Sua integração com o n8n foi removida.",
    });
  };

  const plans = [
    {
      id: "trial",
      name: "Trial",
      price: "Grátis",
      priceDescription: "Para testar sem compromisso",
      features: [
        "Teste a automação de lembretes na prática",
        "Veja o impacto direto na redução de faltas",
        "Sem necessidade de cartão",
        "Comece em poucos minutos",
      ],
      isCurrent: (userData as any)?.plan === "Trial" || !(userData as any)?.plan,
      actionText: "Plano atual",
    },
    {
      id: "professional",
      name: "Profissional",
      price: "R$ 99",
      priceDescription: "/mês",
      highlight: "Mais escolhido pelas clínicas",
      priceId: "price_1PbTrwRpH5Xziv3c2yT7f4gU",
      features: [
        "Reduza faltas com lembretes automáticos inteligentes",
        "Pacientes confirmando e reagendando muito mais rápido",
        "Monitoramento da agenda em tempo real",
        "Menos trabalho manual para a recepção",
        "Suporte dedicado por e-mail",
      ],
      messageCount: "📩 200 mensagens/mês",
      isCurrent: (userData as any)?.plan === "Profissional",
      actionText: "Assinar agora",
    },
    {
      id: "team",
      name: "Equipe",
      price: "R$ 199",
      priceDescription: "/mês",
      highlight: "Para clínicas em crescimento",
      priceId: "price_1PbTsjRpH5Xziv3c6r8qF8wJ",
      features: [
        "Tudo do plano Profissional",
        "Relatórios completos do desempenho da equipe",
        "Suporte prioritário e acompanhamento próximo",
      ],
      messageCount: "📩 500 mensagens/mês",
      isCurrent: (userData as any)?.plan === "Equipe",
      actionText: "Fazer Upgrade",
    },
  ];

  const handlePlanAction = async (planId: string, priceId?: string) => {
    if (!authUser || !priceId) {
      toast({
        variant: "destructive",
        title: "Ação não disponível",
        description: "Não é possível assinar este plano no momento."
      });
      return;
    }
  
    setIsSubmitting(planId);
  
    try {
      const functions = getFunctions(undefined, 'southamerica-east1');
      const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
      
      const response = await createCheckoutSession({
        priceId: priceId,
        userId: authUser.uid,
      });

      const { url } = response.data as { url: string };
  
      if (url) {
        const width = 600;
        const height = 800;
        const left = (window.innerWidth / 2) - (width / 2);
        const top = (window.innerHeight / 2) - (height / 2);
        
        window.open(url, 'stripe-checkout', `width=${width},height=${height},top=${top},left=${left}`);
      } else {
        throw new Error("URL de checkout não recebida.");
      }
  
    } catch (error) {
      console.error("Erro ao criar sessão de checkout:", error);
      toast({
        variant: "destructive",
        title: "Erro ao iniciar pagamento",
        description: "Não foi possível redirecionar para o checkout. Tente novamente."
      });
    } finally {
      setIsSubmitting(null);
    }
  };


  return (
    <>
      <PageHeader title="Configurações" />
      <Tabs defaultValue="account" className="w-full">
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-7 max-w-4xl">
          <TabsTrigger value="account">Conta</TabsTrigger>
          <TabsTrigger value="company">Empresa</TabsTrigger>
          <TabsTrigger value="whatsapp" data-tour-id="whatsapp-tab">WhatsApp API</TabsTrigger>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
          <TabsTrigger value="plans">Planos</TabsTrigger>
          <TabsTrigger value="payment">Pagamento</TabsTrigger>
          <TabsTrigger value="policy">LGPD</TabsTrigger>
        </TabsList>
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Perfil</CardTitle>
              <CardDescription>
                Atualize as informações da sua conta e seu e-mail.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Foto de Perfil</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profilePicPreview} alt="User profile" />
                    <AvatarFallback>{firstName.charAt(0)}{lastName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <Button asChild variant="outline">
                    <label htmlFor="profile-pic-upload" className="cursor-pointer">
                      <Upload className="mr-2 h-4 w-4" />
                      Alterar Foto
                    </label>
                  </Button>
                  <input id="profile-pic-upload" type="file" className="hidden" accept="image/*" onChange={handleProfilePicChange} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-name">Nome</Label>
                  <Input id="first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Sobrenome</Label>
                  <Input id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <Input id="password" type="password" placeholder="Deixe em branco para não alterar" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveProfile} disabled={isSubmitting === 'profile'}>
                {isSubmitting === 'profile' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isSubmitting === 'profile' ? "Salvando..." : "Salvar Alterações"}
                </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Dados da Empresa</CardTitle>
              <CardDescription>Gerencie as informações da sua clínica ou consultório.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="clinic-name">Nome da Clínica</Label>
                    <Input id="clinic-name" value={clinicName} onChange={(e) => setClinicName(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="address">Endereço</Label>
                    <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ/CPF</Label>
                    <Input id="cnpj" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="contact-email">E-mail de Contato</Label>
                        <Input id="contact-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="dpo-contact">Contato do DPO</Label>
                        <Input id="dpo-contact" type="email" value={dpoContact} onChange={(e) => setDpoContact(e.target.value)} />
                    </div>
                </div>
                <div className="space-y-4 border-t pt-6">
                    <h3 className="text-lg font-medium">Privacidade</h3>
                     <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="allow-export">Permitir exportação de logs de consentimento</Label>
                            <p className="text-xs text-muted-foreground">Permite que administradores exportem relatórios de consentimento.</p>
                        </div>
                        <Switch id="allow-export" checked={allowConsentExport} onCheckedChange={setAllowConsentExport} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="retention-period">Período de retenção de dados</Label>
                        <Select value={retentionPeriod} onValueChange={setRetentionPeriod}>
                            <SelectTrigger id="retention-period" className="max-w-xs">
                                <SelectValue placeholder="Selecione um período" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">1 ano</SelectItem>
                                <SelectItem value="2">2 anos</SelectItem>
                                <SelectItem value="5">5 anos</SelectItem>
                                <SelectItem value="10">10 anos</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">A VitalLink salva os logs de consentimento por {retentionPeriod} anos, a menos que uma exclusão seja solicitada.</p>
                    </div>
                     <Link href="/privacy" className="inline-flex items-center text-sm font-medium text-primary hover:underline">
                        Ver nossa Política de Privacidade <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => toast({ title: "Em desenvolvimento", description: "Esta funcionalidade ainda não foi implementada."})}>Salvar Alterações</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <CardTitle>Conexão com WhatsApp</CardTitle>
              <CardDescription>
                Gere um QR Code para conectar seu número do WhatsApp e começar a enviar mensagens.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 flex flex-col items-center">
              
              <div className="w-full max-w-sm flex flex-col items-center justify-center space-y-4 p-8 border rounded-lg bg-muted/20 min-h-[300px]">
                {sessionStatus === 'loading' && (
                  <>
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-muted-foreground">Iniciando sessão...</p>
                  </>
                )}
                {sessionStatus === 'qr_ready' && qrCode && (
                  <>
                    <p className="text-center text-muted-foreground">Escaneie este código no seu app do WhatsApp em <strong>Aparelhos Conectados</strong>.</p>
                    <Image src={qrCode} alt="WhatsApp QR Code" width={250} height={250} className="rounded-lg border" />
                  </>
                )}
                 {sessionStatus === 'connected' && (
                  <>
                    <CheckCircle className="h-16 w-16 text-green-500" />
                    <p className="font-semibold text-lg text-center">WhatsApp Conectado!</p>
                    <p className="text-muted-foreground text-center text-sm">Sua sessão está ativa. Você já pode enviar mensagens.</p>
                  </>
                )}
                 {sessionStatus === 'disconnected' && (
                  <>
                    <QrCode className="h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground text-center">Clique no botão abaixo para gerar o QR Code de conexão.</p>
                  </>
                )}
              </div>

            </CardContent>
            <CardFooter className="flex justify-center">
               <Button onClick={handleGenerateQrCode} disabled={isQrLoading || sessionStatus === 'connected'}>
                {isQrLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {sessionStatus === 'connected' ? 'Já Conectado' : 'Gerar QR Code'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="integrations">
            <Card>
                <CardHeader>
                    <CardTitle>Integração com n8n</CardTitle>
                    <CardDescription>Conecte seus fluxos de trabalho do VitalLink ao n8n para automações poderosas.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isN8nConnected ? (
                        <Alert variant="default" className="bg-green-50 border-green-200 text-green-900">
                             <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertTitle className="font-bold text-green-800">Conectado ao n8n</AlertTitle>
                            <AlertDescription>
                                Seus fluxos de trabalho agora estão enviando dados para o seu webhook do n8n.
                                <Input value={n8nWebhookUrl} readOnly className="mt-2 bg-green-100/50 border-green-300" />
                            </AlertDescription>
                        </Alert>
                    ) : (
                         <Alert>
                            <Workflow className="h-4 w-4" />
                            <AlertTitle>Como conectar?</AlertTitle>
                            <AlertDescription>
                                1. Crie um novo workflow no n8n.<br/>
                                2. Adicione um nó de "Webhook".<br/>
                                3. Copie a "Test URL" do webhook e cole no campo abaixo.
                            </AlertDescription>
                        </Alert>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="n8n-webhook">URL do Webhook do n8n</Label>
                        <Input 
                            id="n8n-webhook"
                            placeholder="https://seu-n8n.com/webhook-test/..."
                            value={n8nWebhookUrl}
                            onChange={(e) => setN8nWebhookUrl(e.target.value)}
                            disabled={isN8nConnected}
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    {isN8nConnected ? (
                        <Button variant="destructive" onClick={handleN8nDisconnect}>Desconectar</Button>
                    ) : (
                        <Button onClick={handleN8nConnect}>Conectar ao n8n</Button>
                    )}
                </CardFooter>
            </Card>
        </TabsContent>
        <TabsContent value="plans">
            <Card>
                <CardHeader className="text-center">
                    <CardTitle>Planos e Assinatura</CardTitle>
                    <CardDescription>Atualize e ative todos os recursos agora mesmo. Cancelamento a qualquer momento.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                    {plans.map((plan) => (
                        <Card key={plan.id} className={cn("flex flex-col", (plan.id === 'professional') && "border-primary border-2 shadow-lg")}>
                            { plan.highlight && 
                                <div className="w-full bg-primary text-primary-foreground text-center py-1.5 px-4 font-semibold text-sm">
                                    {plan.highlight}
                                </div>
                            }
                            <CardHeader className="text-center">
                                <CardTitle>{plan.name}</CardTitle>
                                <CardDescription className="h-12">
                                    <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                                    <span className="text-muted-foreground"> {plan.priceDescription}</span>
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-3">
                                { plan.messageCount &&
                                    <p className="font-bold text-lg text-center text-primary">{plan.messageCount}</p>
                                }
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter className="mt-auto">
                                <Button 
                                    className="w-full"
                                    variant={plan.isCurrent ? 'outline' : 'default'}
                                    disabled={plan.isCurrent || isSubmitting === plan.id}
                                    onClick={() => handlePlanAction(plan.id, plan.priceId)}
                                >
                                    {isSubmitting === plan.id ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Aguarde...</>
                                    ) : plan.isCurrent ? (
                                       'Plano Atual'
                                    ) : (plan.actionText || 'Entrar em Contato')}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="payment">
            <Card>
                <CardHeader>
                    <CardTitle>Informações de Pagamento</CardTitle>
                    <CardDescription>Gerencie seus métodos de pagamento e histórico de faturas.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Método de Pagamento</Label>
                        <div className="border rounded-lg p-4 flex justify-between items-center">
                            <p>Nenhum método de pagamento cadastrado.</p>
                            <Button variant="outline" disabled>Gerenciar no Portal</Button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Histórico de Faturas</Label>
                        <div className="border rounded-lg p-8 text-center text-muted-foreground">
                            <p>Nenhuma fatura encontrada.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="policy">
            <Card>
                <CardHeader>
                    <CardTitle>Política de Dados e LGPD</CardTitle>
                    <CardDescription>Informações sobre como seus dados são tratados.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                    <p>Nós levamos a sua privacidade a sério. Todos os dados dos pacientes são criptografados e armazenados de forma segura.</p>
                    <p>Você tem o direito de solicitar a exportação ou exclusão de seus dados a qualquer momento, em conformidade com a Lei Geral de Proteção de Dados (LGPD).</p>
                    <div className="flex gap-4 pt-4">
                        <Button variant="outline">Exportar Meus Dados</Button>
                        <Button variant="destructive">Excluir Minha Conta</Button>
                    </div>
                </CardContent>
                 <CardFooter>
                    <a href="#" className="text-sm text-primary hover:underline">Leia nossa Política de Privacidade completa</a>
                </CardFooter>
            </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}
