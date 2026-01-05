'use client'

import { useState, useEffect, useLayoutEffect } from "react"
import { usePathname, useRouter } from "next/navigation";
import { Upload, ExternalLink, Save, Loader2, CheckCircle, KeyRound, Mail, Zap, CalendarClock, FileText } from "lucide-react"
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

// Hooks
import { useToast } from "@/hooks/use-toast"
import { useDoc } from "@/firebase/firestore/use-doc"
import { useUser, useAuth, useFirestore, useMemoFirebase } from "@/firebase/provider"

// Utilitários e Funções do Firebase
import { doc } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { updateProfile, sendPasswordResetEmail, EmailAuthProvider, reauthenticateWithCredential, updateEmail } from "firebase/auth"

// Tipagem para o histórico de faturamento
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

  useLayoutEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && ['account', 'company', 'whatsapp', 'plans', 'payment', 'policy'].includes(hash)) {
        setActiveTab(hash);
    }
  }, []);

  const handleTabChange = (value: string) => {
      setActiveTab(value);
      router.replace(`/settings#${value}`, { scroll: false });
  };

  // Efeito para buscar histórico de pagamento
  useEffect(() => {
    const fetchBillingHistory = async () => {
      if (!userData?.stripeCustomerId) {
        // Não faz nada se o cliente não tiver um ID da Stripe (ex: plano Free sem nunca ter assinado)
        return;
      }
      
      setIsFetchingHistory(true);
      setFetchError(null);
      try {
        const res = await fetch('/api/stripe/billing-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stripeCustomerId: userData.stripeCustomerId }),
        });

        if (!res.ok) {
          throw new Error("Falha ao buscar o histórico de pagamentos.");
        }

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

  const handleSubscribe = async (priceId: string, planId: string) => {
    if (!authUser) {
        toast({ variant: "destructive", title: "Erro de Autenticação", description: "Você precisa estar logado para assinar um plano." });
        return;
    }
    setIsRedirecting(planId);
    try {
        const res = await fetch('/api/stripe/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priceId: priceId, userId: authUser.uid }),
        });
        if (!res.ok) {
            const { error } = await res.json();
            throw new Error(error || 'Falha ao iniciar o processo de pagamento.');
        }
        const { url } = await res.json();
        if (url) {
            window.location.href = url;
        } else {
            throw new Error('A URL de redirecionamento não foi recebida.');
        }
    } catch (error: any) {
        console.error("Error creating checkout session:", error);
        toast({ variant: "destructive", title: "Erro ao Assinar", description: error.message || "Não foi possível redirecionar para o pagamento. Tente novamente." });
        setIsRedirecting(null);
    }
  };

  const plans = [
    { id: "Free", name: "Free", price: "R$ 0", priceDescription: "", features: ["Até 5 conversas/mês", "Funcionalidades básicas"], isCurrent: userData?.plan === "Free", priceId: null },
    { id: "Essencial", name: "Essencial", price: "R$ 79", priceDescription: "/mês", priceId: "price_1Sl73SEEZjNwuQwB7GmKavAu", features: ["Até 150 conversas/mês", "Fluxos de automação", "Templates de mensagens", "Suporte via e-mail"], isCurrent: userData?.plan === "Essencial" },
    { id: "Profissional", name: "Profissional", price: "R$ 149", priceDescription: "/mês", highlight: "Mais escolhido", priceId: "price_1Sl73CEEZjNwuQwB1vSGMOED", features: ["Até 300 conversas/mês", "Tudo do Plano Essencial", "Relatórios de envio", "Suporte prioritário"], isCurrent: userData?.plan === "Profissional" },
    { id: "Premium", name: "Premium", price: "R$ 299", priceDescription: "/mês", priceId: "price_1Sl73fEEZjNwuQwBaAdKiJp4", features: ["Até 750 conversas/mês", "Tudo do Plano Profissional", "API de integração (Em Breve)", "Gerente de conta dedicado"], isCurrent: userData?.plan === "Premium" },
  ];

  return (
    <>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="w-full overflow-x-auto">
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
            {/* ... Conteúdo da aba Conta ... */}
        </TabsContent>

        <TabsContent value="company">
            {/* ... Conteúdo da aba Empresa ... */}
        </TabsContent>

        <TabsContent value="whatsapp">
          <WhatsappIntegration />
        </TabsContent>
        
        <TabsContent value="plans" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {plans.map((plan) => (
                    <Card key={plan.id} className={cn("flex flex-col", plan.highlight && "border-primary shadow-lg")}>
                        <CardHeader className="flex-1">
                            <div className="flex justify-between items-center"><CardTitle>{plan.name}</CardTitle>{plan.highlight && <Badge variant="default">{plan.highlight}</Badge>}</div>
                            <div className="flex items-baseline"><span className="text-4xl font-bold tracking-tighter">{plan.price}</span>{plan.priceDescription && <span className="ml-1 text-sm text-muted-foreground">{plan.priceDescription}</span>}</div>
                            <Separator className="my-4"/>
                            <ul className="space-y-2 text-sm text-muted-foreground">{plan.features.map((feature, index) => <li key={index} className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500"/>{feature}</li>)}</ul>
                        </CardHeader>
                        <CardFooter>
                            {plan.isCurrent ? <Button variant="outline" className="w-full" disabled>Plano Atual</Button> : plan.priceId ? <Button className="w-full" disabled={!!isRedirecting} onClick={() => handleSubscribe(plan.priceId!, plan.id)}>{isRedirecting === plan.id ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirecionando...</> : <><Zap className="mr-2 h-4 w-4"/> Fazer Upgrade</>}</Button> : <Button variant="secondary" className="w-full" disabled>Plano Atual</Button>}
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
                                            <TableCell><Badge variant={item.status === 'paid' ? 'success' : 'secondary'}>{item.status}</Badge></TableCell>
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
                    <Button asChild>
                        <Link href="https://billing.stripe.com/p/login/test_7sI9CEd6A6A06k0288" target="_blank"><ExternalLink className="mr-2 h-4 w-4"/> Acessar Portal de Pagamento</Link>
                    </Button>
                </CardFooter>
            </Card>
        </TabsContent>

        <TabsContent value="policy">
           {/* ... Conteúdo da aba LGPD ... */}
        </TabsContent>

      </Tabs>
    </>
  )
}
