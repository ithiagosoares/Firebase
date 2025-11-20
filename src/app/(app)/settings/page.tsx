'use client'

import { useState, useEffect, useLayoutEffect } from "react"
import { usePathname, useRouter } from "next/navigation";
import { Upload, ExternalLink, Save, Loader2, CheckCircle, Workflow } from "lucide-react"
import Link from "next/link"

// Tipos locais
import { type User } from "@/lib/types";

// Componentes da UI
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { WhatsappIntegration } from "@/components/whatsapp-integration";
import { Badge } from "@/components/ui/badge";

// Hooks
import { useToast } from "@/hooks/use-toast"
import { useDoc } from "@/firebase/firestore/use-doc"
import { useUser, useAuth, useFirestore, useMemoFirebase } from "@/firebase/provider"

// Utilitários e Funções do Firebase
import { doc } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { getFunctions, httpsCallable } from "firebase/functions"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { updateProfile } from "firebase/auth"


export default function SettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('account');

  // Efeito para ler o hash da URL na montagem do componente
  useLayoutEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
        setActiveTab(hash);
    }
  }, []);

  // Função para mudar a aba e atualizar a URL
  const handleTabChange = (value: string) => {
      setActiveTab(value);
      router.replace(`/settings#${value}`, { scroll: false });
  };
  
  // Hooks de autenticação e dados corrigidos
  const { user: authUser } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  
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
  
  // n8n State
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState('');
  const [isN8nConnected, setIsN8nConnected] = useState(false);

  const userDocRef = useMemoFirebase(() => {
    if (!authUser) return null;
    return doc(firestore, "users", authUser.uid);
  }, [firestore, authUser]);

  const { data: userData } = useDoc<User>(userDocRef);

  useEffect(() => {
    if (authUser) {
      if (authUser.photoURL) setProfilePicPreview(authUser.photoURL);
      if (authUser.email) setEmail(authUser.email);
    }
  }, [authUser]);

  useEffect(() => {
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
    if (!userDocRef || !auth.currentUser) return;
    
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
        
        toast({ title: "Perfil atualizado!", description: `As alterações do seu perfil foram salvas com sucesso.` });
    } catch (error) {
        console.error("Error saving profile:", error);
        toast({ variant: "destructive", title: "Erro ao salvar", description: "Não foi possível salvar as alterações do perfil." });
    } finally {
        setIsSubmitting(null);
        setProfilePicFile(null);
    }
  }
  
  const handleN8nConnect = () => {
    if (!userDocRef || !n8nWebhookUrl) {
        toast({ variant: "destructive", title: "URL Ausente", description: "Por favor, insira a URL do webhook do n8n." });
        return;
    }
    setDocumentNonBlocking(userDocRef, { n8nWebhookUrl: n8nWebhookUrl }, { merge: true });
    toast({ title: "Conexão Bem-Sucedida!", description: "Sua conta agora está pronta para enviar mensagens via n8n." });
  };

  const handleN8nDisconnect = () => {
    if (!userDocRef) return;
    setDocumentNonBlocking(userDocRef, { n8nWebhookUrl: "" }, { merge: true });
    setN8nWebhookUrl("");
    toast({ variant: "default", title: "Desconectado!", description: "Sua integração com o n8n foi removida." });
  };

  const plans = [
    { id: "trial", name: "Trial", price: "Grátis", priceDescription: "Para testar", features: ["Funcionalidade 1", "Funcionalidade 2"], isCurrent: (userData as any)?.plan === "Trial" || !(userData as any)?.plan, actionText: "Plano atual" },
    { id: "professional", name: "Profissional", price: "R$ 99", priceDescription: "/mês", highlight: "Mais escolhido", priceId: "price_1PbTrwRpH5Xziv3c2yT7f4gU", features: ["Tudo do Trial", "Funcionalidade 3"], isCurrent: (userData as any)?.plan === "Profissional", actionText: "Assinar agora" },
    { id: "team", name: "Equipe", price: "R$ 199", priceDescription: "/mês", priceId: "price_1PbTsjRpH5Xziv3c6r8qF8wJ", features: ["Tudo do Profissional", "Suporte prioritário"], isCurrent: (userData as any)?.plan === "Equipe", actionText: "Fazer Upgrade" },
  ];

  const handlePlanAction = async (planId: string, priceId?: string) => {
    if (!authUser || !priceId) {
      toast({ variant: "destructive", title: "Ação não disponível", description: "Não é possível assinar este plano no momento." });
      return;
    }
  
    setIsSubmitting(planId);
  
    try {
      const functions = getFunctions(undefined, 'southamerica-east1');
      const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
      
      const response = await createCheckoutSession({ priceId: priceId, userId: authUser.uid });

      const { url } = response.data as { url: string };
  
      if (url) {
        window.open(url, 'stripe-checkout', `width=600,height=800,top=${(window.innerHeight / 2) - 400},left=${(window.innerWidth / 2) - 300}`);
      } else {
        throw new Error("URL de checkout não recebida.");
      }
  
    } catch (error) {
      console.error("Erro ao criar sessão de checkout:", error);
      toast({ variant: "destructive", title: "Erro ao iniciar pagamento", description: "Não foi possível redirecionar para o checkout." });
    } finally {
      setIsSubmitting(null);
    }
  };

  return (
    <>
      <PageHeader title="Configurações" />
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="w-full overflow-x-auto">
          <TabsList className="inline-flex w-max space-x-2">
            <TabsTrigger value="account">Conta</TabsTrigger>
            <TabsTrigger value="company">Empresa</TabsTrigger>
            <TabsTrigger value="whatsapp" data-tour-id="whatsapp-tab">WhatsApp Web</TabsTrigger>
            <TabsTrigger value="integrations">Integrações</TabsTrigger>
            <TabsTrigger value="plans">Planos</TabsTrigger>
            <TabsTrigger value="payment">Pagamento</TabsTrigger>
            <TabsTrigger value="policy">LGPD</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="account">
          <Card>
            <CardHeader><CardTitle>Perfil</CardTitle><CardDescription>Atualize as informações da sua conta.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Foto de Perfil</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20"><AvatarImage src={profilePicPreview} alt="User profile" /><AvatarFallback>{firstName.charAt(0)}{lastName.charAt(0)}</AvatarFallback></Avatar>
                  <Button asChild variant="outline"><label htmlFor="profile-pic-upload" className="cursor-pointer"><Upload className="mr-2 h-4 w-4" />Alterar Foto</label></Button>
                  <input id="profile-pic-upload" type="file" className="hidden" accept="image/*" onChange={handleProfilePicChange} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="first-name">Nome</Label><Input id="first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="last-name">Sobrenome</Label><Input id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="password">Nova Senha</Label><Input id="password" type="password" placeholder="Deixe em branco para não alterar" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
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
              <CardTitle>Configurações da Empresa</CardTitle>
              <CardDescription>Gerencie as informações da sua clínica ou consultório.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clinic-name">Nome da Clínica</Label>
                <Input id="clinic-name" value={clinicName} onChange={(e) => setClinicName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input id="cnpj" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">E-mail de Contato</Label>
                  <Input id="contact-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button disabled>Salvar Alterações</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="whatsapp">
          <WhatsappIntegration />
        </TabsContent>

        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle>Integrações</CardTitle>
              <CardDescription>Conecte o VitalLink com outras ferramentas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start justify-between p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Workflow className="h-6 w-6" />
                    <h3 className="text-lg font-semibold">n8n (Automações)</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Conecte ao seu webhook do n8n para automatizar o envio de mensagens via WhatsApp.
                    <Link href="#" className="ml-1 text-primary hover:underline">Saber mais.</Link>
                  </p>
                  <div className="flex items-center gap-2">
                    <Input 
                      placeholder="https://seu-n8n.com/webhook/123" 
                      className="max-w-md" 
                      value={n8nWebhookUrl}
                      onChange={(e) => setN8nWebhookUrl(e.target.value)}
                      disabled={isN8nConnected}
                    />
                    {!isN8nConnected ? (
                      <Button onClick={handleN8nConnect}>Conectar</Button>
                    ) : (
                      <Button variant="destructive" onClick={handleN8nDisconnect}>Desconectar</Button>
                    )}
                  </div>
                </div>
                {isN8nConnected && <CheckCircle className="h-5 w-5 text-green-500" />}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans">
          <Card>
            <CardHeader>
              <CardTitle>Planos e Assinatura</CardTitle>
              <CardDescription>Escolha o plano que melhor se adapta às suas necessidades.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <Card key={plan.id} className={cn("flex flex-col", plan.highlight && "border-primary")}>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      {plan.name}
                      {plan.highlight && <Badge variant="secondary">{plan.highlight}</Badge>}
                    </CardTitle>
                    <p className="text-2xl font-bold">{plan.price} <span className="text-sm font-normal text-muted-foreground">{plan.priceDescription}</span></p>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" />{feature}</li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      onClick={() => handlePlanAction(plan.id, plan.priceId)}
                      disabled={plan.isCurrent || isSubmitting === plan.id}
                    >
                      {isSubmitting === plan.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {plan.isCurrent ? "Plano Atual" : "Escolher Plano"}
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
            <CardContent>
              <p className="text-sm text-muted-foreground">Em breve você poderá gerenciar suas informações de pagamento aqui.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policy">
          <Card>
            <CardHeader>
              <CardTitle>Privacidade e LGPD</CardTitle>
              <CardDescription>Ajuste as configurações de privacidade e conformidade.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="dpo-contact">Contato do DPO (Encarregado de Dados)</Label>
                <Input id="dpo-contact" value={dpoContact} onChange={(e) => setDpoContact(e.target.value)} />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label htmlFor="allow-export" className="font-medium">Permitir exportação de consentimentos</Label>
                  <p className="text-sm text-muted-foreground">Permite que você exporte um registro de todos os consentimentos obtidos.</p>
                </div>
                <Switch id="allow-export" checked={allowConsentExport} onCheckedChange={setAllowConsentExport} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="retention-period">Período de Retenção de Dados</Label>
                <Select value={retentionPeriod} onValueChange={setRetentionPeriod}>
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 ano</SelectItem>
                    <SelectItem value="2">2 anos</SelectItem>
                    <SelectItem value="5">5 anos (Padrão)</SelectItem>
                    <SelectItem value="10">10 anos</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Define por quanto tempo os dados dos pacientes serão mantidos na plataforma.</p>
              </div>
               <Alert variant="default">
                  <ExternalLink className="h-4 w-4" />
                  <AlertTitle>Seus Direitos</AlertTitle>
                  <AlertDescription>
                    Você tem o direito de acessar, corrigir e excluir seus dados. Para mais informações, consulte nossa {" "}
                    <Link href="/privacy" className="font-semibold hover:underline">Política de Privacidade</Link> e {" "}
                    <Link href="/terms" className="font-semibold hover:underline">Termos de Serviço</Link>.
                  </AlertDescription>
                </Alert>
            </CardContent>
            <CardFooter>
              <Button disabled>Salvar Alterações</Button>
            </CardFooter>
          </Card>
        </TabsContent>

      </Tabs>
    </>
  )
}
