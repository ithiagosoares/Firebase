"use client";

import { useState, useEffect } from "react";
import {
  Upload,
  ExternalLink,
  Save,
  Loader2,
  CheckCircle,
  Workflow,
} from "lucide-react";
import Link from "next/link";

// Tipos locais
import { type User } from "@/lib/types";

// Componentes da UI
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { WhatsappIntegration } from "@/components/whatsapp-integration";

// Hooks
import { useToast } from "@/hooks/use-toast";
import { useDoc } from "@/firebase/firestore/use-doc";
import {
  useUser,
  useAuth,
  useFirestore,
  useMemoFirebase,
} from "@/firebase/provider";

// Utilitários e Funções do Firebase
import { doc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { getFunctions, httpsCallable } from "firebase/functions";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";

export default function SettingsPage() {
  const { toast } = useToast();

  // Hooks de autenticação e dados corrigidos
  const { user: authUser } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();

  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  // User Profile State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [profilePicPreview, setProfilePicPreview] = useState(
    "https://firebasestorage.googleapis.com/v0/b/studio-296644579-18969.firebasestorage.app/o/perfil_usuario.svg?alt=media&token=bef5fdca-7321-4928-a649-c45def482e59"
  );
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [newPassword, setNewPassword] = useState("");

  // Company State
  const [clinicName, setClinicName] = useState("Clínica VitalLink");
  const [address, setAddress] = useState("Rua das Flores, 123, São Paulo, SP");
  const [cnpj, setCnpj] = useState("12.345.678/0001-90");
  const [contactEmail, setContactEmail] = useState("contato@vitallink.com");
  const [dpoContact, setDpoContact] = useState("dpo@vitallink.com");
  const [allowConsentExport, setAllowConsentExport] = useState(true);
  const [retentionPeriod, setRetentionPeriod] = useState("5");

  // n8n State
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState("");
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
        const nameParts = userData.name.split(" ");
        setFirstName(nameParts[0] || "");
        setLastName(nameParts.slice(1).join(" ") || "");
      }

      const n8nUrl = (userData as any).n8nWebhookUrl;
      if (n8nUrl) {
        setN8nWebhookUrl(n8nUrl);
        setIsN8nConnected(true);
      } else {
        setIsN8nConnected(false);
      }
    }
  }, [userData]);

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePicFile(file);
      setProfilePicPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async () => {
    if (!userDocRef || !auth.currentUser) return;

    setIsSubmitting("profile");

    try {
      let downloadURL = auth.currentUser.photoURL;

      if (profilePicFile) {
        const storage = getStorage();
        const storageRef = ref(
          storage,
          `profile-pictures/${auth.currentUser.uid}`
        );

        const snapshot = await uploadBytes(storageRef, profilePicFile);
        downloadURL = await getDownloadURL(snapshot.ref);

        await updateProfile(auth.currentUser, { photoURL: downloadURL });
      }

      const name = `${firstName} ${lastName}`.trim();
      await setDocumentNonBlocking(
        userDocRef,
        { name, email },
        { merge: true }
      );

      toast({
        title: "Perfil atualizado!",
        description: `As alterações do seu perfil foram salvas com sucesso.`,
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações do perfil.",
      });
    } finally {
      setIsSubmitting(null);
      setProfilePicFile(null);
    }
  };

  const handleN8nConnect = () => {
    if (!userDocRef || !n8nWebhookUrl) {
      toast({
        variant: "destructive",
        title: "URL Ausente",
        description: "Por favor, insira a URL do webhook do n8n.",
      });
      return;
    }
    setDocumentNonBlocking(
      userDocRef,
      { n8nWebhookUrl: n8nWebhookUrl },
      { merge: true }
    );
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
      priceDescription: "Para testar",
      features: ["Funcionalidade 1", "Funcionalidade 2"],
      isCurrent:
        (userData as any)?.plan === "Trial" || !(userData as any)?.plan,
      actionText: "Plano atual",
    },
    {
      id: "professional",
      name: "Profissional",
      price: "R$ 99",
      priceDescription: "/mês",
      highlight: "Mais escolhido",
      priceId: "price_1PbTrwRpH5Xziv3c2yT7f4gU",
      features: ["Tudo do Trial", "Funcionalidade 3"],
      isCurrent: (userData as any)?.plan === "Profissional",
      actionText: "Assinar agora",
    },
    {
      id: "team",
      name: "Equipe",
      price: "R$ 199",
      priceDescription: "/mês",
      priceId: "price_1PbTsjRpH5Xziv3c6r8qF8wJ",
      features: ["Tudo do Profissional", "Suporte prioritário"],
      isCurrent: (userData as any)?.plan === "Equipe",
      actionText: "Fazer Upgrade",
    },
  ];

  const handlePlanAction = async (planId: string, priceId?: string) => {
    if (!authUser || !priceId) {
      toast({
        variant: "destructive",
        title: "Ação não disponível",
        description: "Não é possível assinar este plano no momento.",
      });
      return;
    }

    setIsSubmitting(planId);

    try {
      const functions = getFunctions(undefined, "southamerica-east1");
      const createCheckoutSession = httpsCallable(
        functions,
        "createCheckoutSession"
      );

      const response = await createCheckoutSession({
        priceId: priceId,
        userId: authUser.uid,
      });

      const { url } = response.data as { url: string };

      if (url) {
        window.open(
          url,
          "stripe-checkout",
          `width=600,height=800,top=${window.innerHeight / 2 - 400},left=${
            window.innerWidth / 2 - 300
          }`
        );
      } else {
        throw new Error("URL de checkout não recebida.");
      }
    } catch (error) {
      console.error("Erro ao criar sessão de checkout:", error);
      toast({
        variant: "destructive",
        title: "Erro ao iniciar pagamento",
        description: "Não foi possível redirecionar para o checkout.",
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
          <TabsTrigger value="whatsapp" data-tour-id="whatsapp-tab">
            WhatsApp API
          </TabsTrigger>
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
                Atualize as informações da sua conta.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Foto de Perfil</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profilePicPreview} alt="User profile" />
                    <AvatarFallback>
                      {firstName.charAt(0)}
                      {lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <Button asChild variant="outline">
                    <label
                      htmlFor="profile-pic-upload"
                      className="cursor-pointer"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Alterar Foto
                    </label>
                  </Button>
                  <input
                    id="profile-pic-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleProfilePicChange}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-name">Nome</Label>
                  <Input
                    id="first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Sobrenome</Label>
                  <Input
                    id="last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Deixe em branco para não alterar"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleSaveProfile}
                disabled={isSubmitting === "profile"}
              >
                {isSubmitting === "profile" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {isSubmitting === "profile"
                  ? "Salvando..."
                  : "Salvar Alterações"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="company">_conteúdo_</TabsContent>

        <TabsContent value="whatsapp">
          <WhatsappIntegration />
        </TabsContent>

        <TabsContent value="integrations">_conteúdo_</TabsContent>

        <TabsContent value="plans">_conteúdo_</TabsContent>

        <TabsContent value="payment">_conteúdo_</TabsContent>

        <TabsContent value="policy">_conteúdo_</TabsContent>
      </Tabs>
    </>
  );
}
