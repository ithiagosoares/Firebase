
'use client'

import { doc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import NavItem from "@/app/(app)/nav-item";
import { OnboardingWrapper } from "@/app/(app)/onboarding-wrapper";
import { AppLogo } from "@/components/app-logo";
import { EmailVerificationBanner } from "@/components/email-verification-banner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, useFirebase, useMemoFirebase } from "@/firebase/provider";
import { useDoc } from "@/firebase/firestore/use-doc";
import { LogOut, Settings, User as UserIcon, Home, Users, MessageSquare, Calendar, Bot } from "lucide-react";
import Link from "next/link";
import { type User } from "@/lib/types";

const navItems = [
  { href: "/dashboard", icon: Home, label: "Início", tourId: "step-dashboard" },
  { href: "/patients", icon: Users, label: "Pacientes", tourId: "step-patients" },
  { href: "/templates", icon: MessageSquare, label: "Templates", tourId: "step-templates" },
  { href: "/schedule", icon: Calendar, label: "Agendamentos", tourId: "step-schedule" },
  { href: "/ai-assistant", icon: Bot, label: "Assistente IA", tourId: "step-ai-assistant" },
];

const UserMenu = () => {
  const { user } = useFirebase();
  const auth = useAuth(); // Corrigido: Usar o hook de autenticação

  const handleLogout = () => {
    signOut(auth); // Corrigido: Chamar signOut do Firebase
  };

  if (!user) return null;

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="cursor-pointer">
          {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName ?? ""} />}
          <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Perfil</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="mr-2 h-4 w-4" />
            <span>Configurações</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { firestore, user } = useFirebase();

  const userDocRef = useMemoFirebase(() => { 
    if (!user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<User>(userDocRef);

  return (
    <>
      <OnboardingWrapper 
        userDocRef={userDocRef}
        isUserDataLoading={isUserDataLoading}
        userData={userData}
      />
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <div className="hidden border-r bg-muted/40 md:block">
          <div className="flex h-full max-h-screen flex-col gap-2">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
              <AppLogo />
            </div>
            <div className="flex-1">
              <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                {navItems.map((item) => (
                  <NavItem key={item.href} {...item} />
                ))}
              </nav>
            </div>
          </div>
        </div>
        <div className="flex flex-col">
          <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
            <div className="w-full flex-1"></div>
            <UserMenu />
          </header>

          <EmailVerificationBanner />
          
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
