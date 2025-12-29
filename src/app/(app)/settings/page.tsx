'use client'

import { useState, useEffect, useLayoutEffect } from "react"
import { usePathname, useRouter } from "next/navigation";
import { Upload, ExternalLink, Save, Loader2, CheckCircle, KeyRound, Mail } from "lucide-react"
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

export default function SettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('account');

  useLayoutEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
        setActiveTab(hash);
    }
  }, []);

  const handleTabChange = (value: string) => {
      setActiveTab(value);
      router.replace(`/settings#${value}`, { scroll: false });
  };
  
  const { user: authUser } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  
  // State para os formulários
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [isSubmittingCompany, setIsSubmittingCompany] = useState(false);
  const [isSubmittingPolicy, setIsSubmittingPolicy] = useState(false);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  // User Profile State
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [profilePicPreview, setProfilePicPreview] = useState("https://firebasestorage.googleapis.com/v0/b/studio-296644579-18969.firebasestorage.app/o/perfil_usuario.svg?alt=media&token=bef5fdca-7321-4928-a649-c45def482e59")
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);

  // Email/Password Change State
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");

  // Company State
  const [clinicName, setClinicName] = useState("")
  const [address, setAddress] = useState("")
  const [cnpj, setCnpj] = useState("")
  const [contactEmail, setContactEmail] = useState("")

  // Policy State
  const [dpoContact, setDpoContact] = useState("")
  const [allowConsentExport, setAllowConsentExport] = useState(true)
  const [retentionPeriod, setRetentionPeriod] = useState("5")

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

  const plans = [
    {
      id: "Free", name: "Free", price: "R$ 0", priceDescription: "", paymentLink: "",
      features: ["Até 5 conversas/mês", "Funcionalidades básicas"],
      isCurrent: userData?.plan === "Free", actionText: "Plano Atual"
    },
    {
      id: "Essencial", name: "Essencial", price: "R$ 79", priceDescription: "/mês", paymentLink: "https://buy.stripe.com/test_eVa9CEb6A9M2gPKeUV",
      features: ["Até 150 conversas/mês", "Fluxos de automação", "Templates de mensagens", "Suporte via e-mail"],
      isCurrent: userData?.plan === "Essencial", actionText: "Gerenciar Assinatura",
      actionExternal: true
    },
    {
      id: "Profissional", name: "Profissional", price: "R$ 149", priceDescription: "/mês", highlight: "Mais escolhido", paymentLink: "https://buy.stripe.com/test_28o52s0ie2bA0i45kn",
      features: ["Até 300 conversas/mês", "Tudo do Plano Essencial", "Relatórios de envio", "Suporte prioritário"],
      isCurrent: userData?.plan === "Profissional", actionText: "Gerenciar Assinatura",
      actionExternal: true
    },
    {
      id: "Premium", name: "Premium", price: "R$ 299", priceDescription: "/mês", paymentLink: "https://buy.stripe.com/test_9AQg0C2qmbQ61m8aF1",
      features: ["Até 750 conversas/mês", "Tudo do Plano Profissional", "API de integração (Em Breve)", "Gerente de conta dedicado"],
      isCurrent: userData?.plan === "Premium", actionText: "Gerenciar Assinatura",
      actionExternal: true
    },
  ];

  const freePlan = plans.find((plan) => plan.id === "Free");
  const paidPlans = plans.filter((plan) => plan.id !== "Free");

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
          <Card>
            <CardHeader><CardTitle>Perfil</CardTitle><CardDescription>Atualize suas informações pessoais e sua foto.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Foto de Perfil</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20"><AvatarImage src={profilePicPreview} alt="User profile" /><AvatarFallback>{firstName.charAt(0)}{lastName.charAt(0)}</AvatarFallback></Avatar>
                  <Button asChild variant="outline"><label htmlFor="profile-pic-upload" className="cursor-pointer"><Upload className="mr-2 h-4 w-4" />Alterar Foto</label></Button>
                  <input id="profile-pic-upload" type="file" className="hidden" accept="image/*" onChange={handleProfilePicChange} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="first-name">Nome</Label><Input id="first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="last-name">Sobrenome</Label><Input id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail de Acesso</Label>
                <Input id="email" type="email" value={email} readOnly />
                <p className="text-xs text-muted-foreground">Para alterar seu e-mail de acesso, utilize a seção de Segurança abaixo.</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveProfile} disabled={isSubmittingProfile}>
                {isSubmittingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} 
                {isSubmittingProfile ? "Salvando..." : "Salvar Perfil"}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Segurança</CardTitle>
              <CardDescription>Gerencie suas credenciais de acesso.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-base font-medium">Alterar E-mail de Acesso</h3>
                <div className="space-y-2">
                  <Label htmlFor="new-email">Novo E-mail</Label>
                  <Input id="new-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="seu.novo@email.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="current-password">Sua Senha Atual</Label>
                  <Input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" />
                   <p className="text-xs text-muted-foreground">Por segurança, precisamos da sua senha para confirmar a alteração.</p>
                </div>
                <Button onClick={handleEmailUpdate} disabled={isUpdatingEmail}>
                    {isUpdatingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />} 
                    {isUpdatingEmail ? "Salvando..." : "Salvar Novo E-mail"}
                </Button>
              </div>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-base font-medium">Alterar Senha</h3>
                <p className="text-sm text-muted-foreground">Será enviado um link para seu e-mail de acesso para que você possa criar uma nova senha.</p>
                <Button variant="outline" onClick={handlePasswordReset} disabled={isSendingResetEmail}>
                    {isSendingResetEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                    {isSendingResetEmail ? "Enviando..." : "Enviar Link para Alterar Senha"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company">
          <Card>
            <CardHeader><CardTitle>Dados da Empresa</CardTitle><CardDescription>Informações sobre sua clínica ou empresa.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2"><Label htmlFor="clinicName">Nome da Clínica/Empresa</Label><Input id="clinicName" value={clinicName} onChange={(e) => setClinicName(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="address">Endereço</Label><Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="cnpj">CNPJ</Label><Input id="cnpj" value={cnpj} onChange={(e) => setCnpj(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="contactEmail">E-mail de Contato</Label><Input id="contactEmail" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSaveCompany} disabled={isSubmittingCompany}>
                    {isSubmittingCompany ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} 
                    {isSubmittingCompany ? "Salvando..." : "Salvar Dados da Empresa"}
                </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp">
          <WhatsappIntegration />
        </TabsContent>
        
        <TabsContent value="plans" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paidPlans.map((plan) => (
                    <Card key={plan.id} className={cn("flex flex-col", plan.highlight && "border-primary shadow-lg")}>
                        <CardHeader className="flex-1">
                            <div className="flex justify-between items-center">
                                <CardTitle>{plan.name}</CardTitle>
                                {plan.highlight && <Badge variant="default">{plan.highlight}</Badge>}
                            </div>
                            <div className="flex items-baseline">
                                <span className="text-4xl font-bold tracking-tighter">{plan.price}</span>
                                {plan.priceDescription && <span className="ml-1 text-sm text-muted-foreground">{plan.priceDescription}</span>}
                            </div>
                            <Separator className="my-4"/>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                {plan.features.map((feature, index) => <li key={index} className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500"/>{feature}</li>)}
                            </ul>
                        </CardHeader>
                        <CardFooter>
                            <Button asChild className="w-full" disabled={plan.isCurrent} variant={plan.isCurrent ? 'secondary' : 'default'}>
                                <Link href={plan.isCurrent ? '#' : plan.paymentLink} target={plan.actionExternal ? '_blank' : '_self'}>
                                    {plan.actionText}
                                    {plan.actionExternal && <ExternalLink className="ml-2 h-4 w-4"/>}
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            <Separator />

            {freePlan && (
              <Card>
                <CardHeader>
                  <CardTitle>{freePlan.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {freePlan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button variant="secondary" disabled>
                    {freePlan.actionText}
                  </Button>
                </CardContent>
              </Card>
            )}
        </TabsContent>

        <TabsContent value="payment">
            <Card>
                <CardHeader>
                    <CardTitle>Gerenciamento de Pagamentos</CardTitle>
                    <CardDescription>Visualize seu plano atual, histórico de faturas e altere sua forma de pagamento através do nosso portal seguro.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert>
                      <AlertTitle>Plano Atual: {userData?.plan || 'N/A'}</AlertTitle>
                      <AlertDescription>Para gerenciar sua assinatura, visualizar faturas ou alterar seu método de pagamento, acesse nosso portal de pagamentos.</AlertDescription>
                    </Alert>
                </CardContent>
                <CardFooter>
                    <Button asChild>
                        <Link href="https://billing.stripe.com/p/login/test_7sI9CEd6A6A06k0288" target="_blank"><ExternalLink className="mr-2 h-4 w-4"/> Acessar Portal de Pagamento</Link>
                    </Button>
                </CardFooter>
            </Card>
        </TabsContent>

        <TabsContent value="policy">
          <Card>
            <CardHeader>
                <CardTitle>Política de Dados e LGPD</CardTitle>
                <CardDescription>Configure como os dados dos seus pacientes e consentimentos são gerenciados.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="dpoContact">E-mail do Encarregado de Proteção de Dados (DPO)</Label>
                    <Input id="dpoContact" type="email" value={dpoContact} onChange={(e) => setDpoContact(e.target.value)} placeholder="dpo@suaclinica.com" />
                    <p className="text-xs text-muted-foreground">Este e-mail será usado para comunicações oficiais sobre privacidade de dados.</p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="retentionPeriod">Período de Retenção de Dados de Pacientes (em anos)</Label>
                    <Select value={retentionPeriod} onValueChange={setRetentionPeriod}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">1 ano</SelectItem>
                            <SelectItem value="2">2 anos</SelectItem>
                            <SelectItem value="5">5 anos</SelectItem>
                            <SelectItem value="10">10 anos</SelectItem>
                            <SelectItem value="20">20 anos (Padrão legal)</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Tempo que os registros dos pacientes serão mantidos antes da anonimização/exclusão, se não houver atividade.</p>
                </div>
                <div className="flex items-center space-x-2">
                    <Switch id="allow-consent-export" checked={allowConsentExport} onCheckedChange={setAllowConsentExport} />
                    <Label htmlFor="allow-consent-export">Permitir a exportação de termos de consentimento</Label>
                </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleSavePolicy} disabled={isSubmittingPolicy}>
                    {isSubmittingPolicy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} 
                    {isSubmittingPolicy ? "Salvando..." : "Salvar Política"}
                </Button>
            </CardFooter>
          </Card>
        </TabsContent>

      </Tabs>
    </>
  )
}
