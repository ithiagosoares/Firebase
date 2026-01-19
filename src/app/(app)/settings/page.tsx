'use client'

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation";
import { Upload, ExternalLink, Loader2, CheckCircle, KeyRound, Mail, Zap, CalendarClock, FileText, User as UserIcon, Building2, ShieldCheck, AlertTriangle } from "lucide-react"
import Link from "next/link"

// Tipos locais
import { type User } from "@/lib/types";

// Componentes da UI
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { WhatsappIntegration } from "@/components/whatsapp-integration";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Hooks
import { useToast } from "@/hooks/use-toast"
import { useDoc } from "@/firebase/firestore/use-doc"
import { useUser, useAuth, useFirestore, useMemoFirebase } from "@/firebase/provider"

// Utilitários e Funções
import { doc, arrayUnion } from "firebase/firestore" 
import { cn } from "@/lib/utils"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { updateProfile, sendPasswordResetEmail, EmailAuthProvider, reauthenticateWithCredential, updateEmail } from "firebase/auth"

// --- IMPORTAÇÃO DA SERVER ACTION (Adicionado createCheckoutSession) ---
import { createCustomerPortalSession, createCheckoutSession } from "@/app/actions/stripe"

interface BillingHistoryItem {
    id: string;
    date: number;
    amount: number;
    plan: string;
    status: string | null;
    invoiceUrl: string | null;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('account');
  
  // Transition para Server Actions
  const [isPortalLoading, startPortalTransition] = useTransition();
  // --- CORREÇÃO: Definindo a transição de checkout que faltava ---
  const [isCheckoutLoading, startCheckoutTransition] = useTransition();

  const { user: authUser } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  
  // States gerais
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [isSubmittingCompany, setIsSubmittingCompany] = useState(false);
  const [isSubmittingPolicy, setIsSubmittingPolicy] = useState(false);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState<string | null>(null);

  // States de Cancelamento
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // States do formulário de perfil
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [profilePicPreview, setProfilePicPreview] = useState("https://firebasestorage.googleapis.com/v0/b/studio-296644579-18969.firebasestorage.app/o/perfil_usuario.svg?alt=media&token=bef5fdca-7321-4928-a649-c45def482e59")
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);

  // States de segurança
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");

  // States da empresa
  const [clinicName, setClinicName] = useState("")
  const [address, setAddress] = useState("")
  const [cnpj, setCnpj] = useState("")
  const [contactEmail, setContactEmail] = useState("")

  // States da política de LGPD
  const [dpoContact, setDpoContact] = useState("")
  const [allowConsentExport, setAllowConsentExport] = useState(true)
  const [retentionPeriod, setRetentionPeriod] = useState("5")

  // States da aba de Pagamento
  const [billingHistory, setBillingHistory] = useState<BillingHistoryItem[]>([]);
  const [nextBillingDate, setNextBillingDate] = useState<number | null>(null);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const userDocRef = useMemoFirebase(() => {
    if (!authUser) return null;
    return doc(firestore, "users", authUser.uid);
  }, [firestore, authUser]);

  const { data: userData } = useDoc<User>(userDocRef);

  useEffect(() => {
    const handleHashChange = () => {
        const hash = window.location.hash.replace('#', '');
        if (hash && ['account', 'company', 'whatsapp', 'plans', 'payment', 'policy'].includes(hash)) {
            setActiveTab(hash);
        }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleTabChange = (value: string) => {
      setActiveTab(value);
      router.replace(`/settings#${value}`, { scroll: false });

      if (value === 'whatsapp' && userDocRef) {
        setDocumentNonBlocking(userDocRef, {
            onboardingProgress: arrayUnion('visited-settings', 'visited-whatsapp-tab')
        }, { merge: true });
      }
  };

  // --- Função para Acessar Portal (Server Action) ---
  const handleOpenPortal = () => {
    if (!authUser) return;
    
    startPortalTransition(async () => {
        try {
            await createCustomerPortalSession(authUser.uid);
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Erro",
                description: "Não foi possível abrir o portal de pagamento. Verifique se você já possui um histórico de assinaturas."
            });
        }
    });
  };

  useEffect(() => {
    const fetchBillingHistory = async () => {
      if (!userData?.stripeCustomerId) return;
      
      setIsFetchingHistory(true);
      setFetchError(null);
      try {
        const res = await fetch('/api/stripe/billing-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stripeCustomerId: userData.stripeCustomerId }),
        });

        if (!res.ok) throw new Error("Falha ao buscar o histórico de pagamentos.");

        const data = await res.json();
        setBillingHistory(data.billingHistory || []);
        setNextBillingDate(data.nextBillingDate || null);

      } catch (error: any) {
        setFetchError(error.message || "Ocorreu um erro ao carregar seus dados de pagamento.");
      } finally {
        setIsFetchingHistory(false);
      }
    };

    if (activeTab === 'payment') {
      fetchBillingHistory();
    }
  }, [activeTab, userData?.stripeCustomerId]);

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
      setClinicName(userData.clinicName || "");
      setAddress(userData.address || "");
      setCnpj(userData.cnpj || "");
      setContactEmail(userData.contactEmail || "");
      setDpoContact(userData.dpoContact || "");
      setAllowConsentExport(userData.allowConsentExport !== false);
      setRetentionPeriod(String(userData.retentionPeriod || 5));
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
    setIsSubmittingProfile(true);
    try {
        let downloadURL = auth.currentUser.photoURL;
        if (profilePicFile) {
            const storage = getStorage();
            const storageRef = ref(storage, `profile-pictures/${auth.currentUser.uid}`);
            const snapshot = await uploadBytes(storageRef, profilePicFile);
            downloadURL = await getDownloadURL(snapshot.ref);
        }
        const name = `${firstName} ${lastName}`.trim();
        await updateProfile(auth.currentUser, { photoURL: downloadURL, displayName: name });
        await setDocumentNonBlocking(userDocRef, { name }, { merge: true });
        toast({ title: "Perfil atualizado!", description: `As alterações do seu perfil foram salvas com sucesso.` });
    } catch (error) {
        console.error("Error saving profile:", error);
        toast({ variant: "destructive", title: "Erro ao salvar", description: "Não foi possível salvar as alterações do perfil." });
    } finally {
        setIsSubmittingProfile(false);
        setProfilePicFile(null);
    }
  }

  const handleSaveCompany = async () => {
    if (!userDocRef) return;
    setIsSubmittingCompany(true);
    try {
        await setDocumentNonBlocking(userDocRef, { clinicName, address, cnpj, contactEmail }, { merge: true });
        toast({ title: "Dados da Empresa atualizados!" });
    } catch (error) {
        console.error("Error saving company data:", error);
        toast({ variant: "destructive", title: "Erro ao salvar", description: "Não foi possível salvar os dados da empresa." });
    } finally {
        setIsSubmittingCompany(false);
    }
  }

  const handleSavePolicy = async () => {
    if (!userDocRef) return;
    setIsSubmittingPolicy(true);
    try {
        await setDocumentNonBlocking(userDocRef, { dpoContact, allowConsentExport, retentionPeriod: parseInt(retentionPeriod, 10) }, { merge: true });
        toast({ title: "Política de LGPD atualizada!" });
    } catch (error) {
        console.error("Error saving policy data:", error);
        toast({ variant: "destructive", title: "Erro ao salvar", description: "Não foi possível salvar a política de LGPD." });
    } finally {
        setIsSubmittingPolicy(false);
    }
  }

  const handleEmailUpdate = async () => {
    if (!auth.currentUser || !newEmail || !currentPassword) {
      toast({ variant: "destructive", title: "Campos obrigatórios", description: "Preencha o novo e-mail e a senha atual." });
      return;
    }
    setIsUpdatingEmail(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email!, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updateEmail(auth.currentUser, newEmail);
      await setDocumentNonBlocking(userDocRef!, { email: newEmail }, { merge: true });
      toast({
        title: "Verificação necessária!",
        description: "Enviamos um link de confirmação para o seu novo e-mail. A alteração será concluída após a verificação.",
      });
      setNewEmail("");
      setCurrentPassword("");
    } catch (error: any) {
        console.error("Error updating email:", error);
        let description = "Ocorreu um erro inesperado. Tente novamente.";
        if (error.code === 'auth/wrong-password') {
            description = "A senha atual está incorreta. Verifique e tente novamente.";
        } else if (error.code === 'auth/email-already-in-use') {
            description = "Este e-mail já está sendo utilizado por outra conta.";
        } else if (error.code === 'auth/invalid-email') {
            description = "O novo e-mail fornecido é inválido.";
        }
        toast({ variant: "destructive", title: "Erro ao alterar e-mail", description });
    } finally {
        setIsUpdatingEmail(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!auth || !authUser?.email) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível identificar o usuário para redefinir a senha." });
      return;
    }
    setIsSendingResetEmail(true);
    try {
      await sendPasswordResetEmail(auth, authUser.email);
      toast({ title: "E-mail enviado!", description: "Enviamos um link para redefinição de senha para o seu e-mail." });
    } catch (error) {
      console.error("Error sending password reset email:", error);
      toast({ variant: "destructive", title: "Erro ao enviar", description: "Não foi possível enviar o e-mail de redefinição de senha." });
    } finally {
      setIsSendingResetEmail(false);
    }
  }

  // --- FUNÇÃO CORRIGIDA: Usa Server Action para Checkout ---
  const handleSubscribe = (priceId: string, planId: string) => {
    if (!authUser) {
        toast({ variant: "destructive", title: "Erro de Autenticação", description: "Você precisa estar logado para assinar um plano." });
        return;
    }
    
    // Define qual botão específico está carregando (para feedback visual)
    setIsRedirecting(planId);

    // Usa a transição do React para chamar a Server Action
    startCheckoutTransition(async () => {
        try {
            await createCheckoutSession(authUser.uid, priceId);
        } catch (error: any) {
            console.error("Error creating checkout session:", error);
            toast({ variant: "destructive", title: "Erro ao Assinar", description: "Não foi possível redirecionar para o pagamento. Tente novamente." });
            setIsRedirecting(null);
        }
    });
  };

  const handleCancelSubscription = async () => {
    if (!authUser) return;
    setIsCancelling(true);
    try {
        const res = await fetch('/api/stripe/cancel-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: authUser.uid }),
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Falha ao cancelar assinatura.");
        }

        toast({ 
            title: "Assinatura Cancelada", 
            description: "Sua assinatura não será renovada no próximo ciclo." 
        });
        setShowCancelDialog(false);
        window.location.reload(); 

    } catch (error: any) {
        console.error("Erro ao cancelar:", error);
        toast({ 
            variant: "destructive", 
            title: "Erro ao cancelar", 
            description: error.message || "Tente novamente mais tarde ou contate o suporte." 
        });
    } finally {
        setIsCancelling(false);
    }
  };

  const plans = [
    { id: "Free", name: "Free", price: "R$ 0", priceDescription: "", features: ["Até 5 conversas/mês", "Funcionalidades básicas"], isCurrent: userData?.plan === "Free" || !userData?.plan, priceId: null },
    { id: "Essencial", name: "Essencial", price: "R$ 79", priceDescription: "/mês", priceId: "price_1SaEtIEEZjNwuQwBmR30ax57", features: ["Até 150 conversas/mês", "Fluxos de automação", "Templates de mensagens", "Suporte via e-mail"], isCurrent: userData?.plan === "Essencial" },
    { id: "Profissional", name: "Profissional", price: "R$ 149", priceDescription: "/mês", highlight: "Mais escolhido", priceId: "price_1SZaPNEEZjNwuQwBIP1smLIm", features: ["Até 300 conversas/mês", "Tudo do Plano Essencial", "Relatórios de envio", "Suporte prioritário"], isCurrent: userData?.plan === "Profissional" },
    { id: "Premium", name: "Premium", price: "R$ 299", priceDescription: "/mês", priceId: "price_1SaEyPEEZjNwuQwBGrutOkgy", features: ["Até 750 conversas/mês", "Tudo do Plano Profissional", "API de integração (Em Breve)", "Gerente de conta dedicado"], isCurrent: userData?.plan === "Premium" },
  ];

  return (
    <>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="w-full overflow-x-auto pb-2">
          <TabsList className="inline-flex w-max space-x-2">
            <TabsTrigger value="account">Conta</TabsTrigger>
            <TabsTrigger value="company">Empresa</TabsTrigger>
            <TabsTrigger value="whatsapp" data-tour-id="whatsapp-tab">WhatsApp</TabsTrigger>
            <TabsTrigger value="plans">Planos</TabsTrigger>
            <TabsTrigger value="payment">Pagamento</TabsTrigger>
            <TabsTrigger value="policy">LGPD</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="account" className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><UserIcon className="h-5 w-5"/> Informações Pessoais</CardTitle>
                    <CardDescription>Atualize sua foto e detalhes pessoais.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="relative group">
                            <Avatar className="h-24 w-24 border-2 border-primary/10">
                                <AvatarImage src={profilePicPreview} className="object-cover" />
                                <AvatarFallback>{firstName?.charAt(0)}{lastName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <Label htmlFor="picture-upload" className="absolute bottom-0 right-0 bg-primary text-white p-1.5 rounded-full cursor-pointer hover:bg-primary/90 transition-colors shadow-md">
                                <Upload className="h-4 w-4" />
                                <Input id="picture-upload" type="file" className="hidden" accept="image/*" onChange={handleProfilePicChange} />
                            </Label>
                        </div>
                        <div className="flex-1 w-full space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName">Nome</Label>
                                    <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Seu nome" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName">Sobrenome</Label>
                                    <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Seu sobrenome" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-muted-foreground">E-mail (Login)</Label>
                                <Input id="email" value={email} disabled className="bg-muted" />
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                    <Button onClick={handleSaveProfile} disabled={isSubmittingProfile}>
                        {isSubmittingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Alterações
                    </Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5"/> Segurança e Login</CardTitle>
                    <CardDescription>Gerencie sua senha e e-mail de acesso.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-6">
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium">Alterar E-mail</h3>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="newEmail">Novo E-mail</Label>
                                    <Input id="newEmail" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="novo@email.com" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="currentPass">Senha Atual (para confirmar)</Label>
                                    <Input id="currentPass" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="******" />
                                </div>
                            </div>
                            <Button variant="outline" onClick={handleEmailUpdate} disabled={isUpdatingEmail || !newEmail || !currentPassword}>
                                {isUpdatingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Atualizar E-mail
                            </Button>
                        </div>
                        
                        <Separator />
                        
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h3 className="text-sm font-medium">Redefinir Senha</h3>
                                <p className="text-sm text-muted-foreground">Você receberá um e-mail com instruções para criar uma nova senha.</p>
                            </div>
                            <Button variant="outline" onClick={handlePasswordReset} disabled={isSendingResetEmail}>
                                {isSendingResetEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                                Enviar E-mail de Redefinição
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="company">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5"/> Dados da Clínica</CardTitle>
                    <CardDescription>Estas informações podem aparecer em rodapés de mensagens ou faturas.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="clinicName">Nome da Clínica / Empresa</Label>
                            <Input id="clinicName" value={clinicName} onChange={(e) => setClinicName(e.target.value)} placeholder="Ex: Clínica Vital" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cnpj">CNPJ / CPF</Label>
                            <Input id="cnpj" value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address">Endereço Completo</Label>
                        <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, Número, Bairro, Cidade - UF" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="contactEmail">E-mail de Contato Público</Label>
                        <Input id="contactEmail" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="contato@clinicavital.com" />
                    </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                    <Button onClick={handleSaveCompany} disabled={isSubmittingCompany}>
                        {isSubmittingCompany && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Dados da Empresa
                    </Button>
                </CardFooter>
            </Card>
        </TabsContent>

        <TabsContent value="whatsapp">
          <WhatsappIntegration />
        </TabsContent>
        
        <TabsContent value="plans" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {plans.map((plan) => (
                    <Card key={plan.id} className={cn("flex flex-col", plan.highlight && "border-primary shadow-lg relative")}>
                        {plan.highlight && (
                            <div className="absolute -top-3 left-0 right-0 flex justify-center">
                                <Badge variant="default" className="shadow-sm">{plan.highlight}</Badge>
                            </div>
                        )}

                        <CardHeader className="flex-1">
                            <div className="flex justify-between items-center"><CardTitle>{plan.name}</CardTitle></div>
                            <div className="flex items-baseline"><span className="text-4xl font-bold tracking-tighter">{plan.price}</span>{plan.priceDescription && <span className="ml-1 text-sm text-muted-foreground">{plan.priceDescription}</span>}</div>
                            <Separator className="my-4"/>
                            <ul className="space-y-2 text-sm text-muted-foreground">{plan.features.map((feature, index) => <li key={index} className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500"/>{feature}</li>)}</ul>
                        </CardHeader>
                        
                        <CardFooter className="flex flex-col gap-2">
                            {plan.isCurrent ? (
                                <>
                                    <Button 
                                        variant="outline" 
                                        className="w-full bg-muted/50 cursor-default hover:bg-muted/50" 
                                    >
                                        Plano Atual
                                    </Button>
                                    
                                    {plan.id !== "Free" && (
                                        <Button 
                                            variant="link" 
                                            className="text-red-500 h-auto p-0 text-xs hover:text-red-700"
                                            onClick={() => setShowCancelDialog(true)}
                                        >
                                            Cancelar assinatura
                                        </Button>
                                    )}
                                </>
                            ) : plan.priceId ? (
                                <Button 
                                    className="w-full"
                                    disabled={!!isRedirecting}
                                    onClick={() => handleSubscribe(plan.priceId!, plan.id)}
                                >
                                    {isRedirecting === plan.id ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirecionando...</>
                                    ) : (
                                        <><Zap className="mr-2 h-4 w-4"/> Fazer Upgrade</>
                                    )}
                                </Button>
                            ) : (
                                <Button variant="secondary" className="w-full" disabled>
                                    Não disponível
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </TabsContent>

        <TabsContent value="payment">
            <Card>
                <CardHeader>
                    <CardTitle>Gerenciamento de Pagamentos</CardTitle>
                    <CardDescription>Visualize seu plano atual, histórico de faturas e altere sua forma de pagamento.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Alert>
                        <AlertTitle className="flex items-center gap-2"><Zap className="h-4 w-4"/>Plano Atual: {userData?.plan || 'N/A'}</AlertTitle>
                        {nextBillingDate && (
                            <AlertDescription className="flex items-center gap-2 mt-2">
                                <CalendarClock className="h-4 w-4" />
                                Próxima cobrança em: {new Date(nextBillingDate * 1000).toLocaleDateString('pt-BR')}
                            </AlertDescription>
                        )}
                    </Alert>

                    <Separator/>

                    <div>
                        <h3 className="text-lg font-medium mb-4">Histórico de Faturas</h3>
                        {isFetchingHistory ? (
                            <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                        ) : fetchError ? (
                            <Alert variant="destructive"><AlertTitle>Erro</AlertTitle><AlertDescription>{fetchError}</AlertDescription></Alert>
                        ) : billingHistory.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Plano</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Valor</TableHead>
                                        <TableHead className="text-right">Fatura</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {billingHistory.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>{new Date(item.date * 1000).toLocaleDateString('pt-BR')}</TableCell>
                                            <TableCell>{item.plan}</TableCell>
                                            <TableCell>
                                                <Badge variant={item.status === 'paid' ? 'default' : 'secondary'} className={item.status === 'paid' ? 'bg-green-600 hover:bg-green-700' : ''}>
                                                    {item.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">{(item.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                            <TableCell className="text-right">
                                                {item.invoiceUrl && <Button asChild variant="outline" size="sm"><Link href={item.invoiceUrl} target="_blank"><FileText className="h-4 w-4"/></Link></Button>}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <p className="text-sm text-muted-foreground">Nenhum histórico de pagamento encontrado.</p>
                        )}
                    </div>
                </CardContent>
                <CardFooter>
                    {/* --- BOTÃO ATUALIZADO PARA USAR A NOVA SERVER ACTION --- */}
                    <Button 
                        onClick={handleOpenPortal} 
                        disabled={isPortalLoading}
                    >
                        {isPortalLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ExternalLink className="mr-2 h-4 w-4"/>}
                        Acessar Portal de Pagamento
                    </Button>
                </CardFooter>
            </Card>
        </TabsContent>

        <TabsContent value="policy">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5"/> Privacidade e LGPD</CardTitle>
                    <CardDescription>Defina como os dados dos pacientes são gerenciados.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="dpoContact">Contato do DPO (Encarregado de Dados)</Label>
                        <Input id="dpoContact" value={dpoContact} onChange={(e) => setDpoContact(e.target.value)} placeholder="dpo@suaclinica.com" />
                        <p className="text-xs text-muted-foreground">Este e-mail será exibido para pacientes que solicitarem informações sobre seus dados.</p>
                    </div>

                    <div className="flex items-center justify-between space-x-2 border p-4 rounded-md">
                        <div className="space-y-0.5">
                            <Label className="text-base">Exportação de Consentimento</Label>
                            <p className="text-sm text-muted-foreground">Permitir que pacientes solicitem cópia automática dos termos aceitos.</p>
                        </div>
                        <Switch checked={allowConsentExport} onCheckedChange={setAllowConsentExport} />
                    </div>

                    <div className="space-y-2">
                        <Label>Período de Retenção de Logs</Label>
                        <Select value={retentionPeriod} onValueChange={setRetentionPeriod}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o período" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">1 Ano</SelectItem>
                                <SelectItem value="2">2 Anos</SelectItem>
                                <SelectItem value="5">5 Anos (Recomendado)</SelectItem>
                                <SelectItem value="10">10 Anos</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Tempo que os registros de consentimento e logs de auditoria serão mantidos.</p>
                    </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                    <Button onClick={handleSavePolicy} disabled={isSubmittingPolicy}>
                        {isSubmittingPolicy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Atualizar Política
                    </Button>
                </CardFooter>
            </Card>
        </TabsContent>

      </Tabs>

      {/* === DIÁLOGO DE CONFIRMAÇÃO DE CANCELAMENTO === */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" /> Cancelar Assinatura?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar sua assinatura? <br/>
              Você perderá acesso aos recursos Premium ao final do ciclo de cobrança atual. Esta ação não pode ser desfeita imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Voltar</AlertDialogCancel>
            <AlertDialogAction 
                onClick={(e) => {
                    e.preventDefault(); // Impede o fechamento automático para tratar o loading
                    handleCancelSubscription();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isCancelling}
            >
              {isCancelling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Sim, Cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}