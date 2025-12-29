'use client'

import { Suspense, useState, useEffect, useRef } from 'react';
import Link from "next/link";
import { usePathname, useRouter } from 'next/navigation';
import { doc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { AppNav } from "@/app/(app)/app-nav";
import { OnboardingWrapper } from "@/app/(app)/onboarding-wrapper";
import { AppLogo } from "@/components/app-logo";
import { EmailVerificationBanner } from "@/components/email-verification-banner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth, useFirebase, useMemoFirebase } from "@/firebase/provider";
import { useDoc } from "@/firebase/firestore/use-doc";
import { Loader2, Gem } from "lucide-react";
import { type User } from "@/lib/types";

const PlanUsageDisplay = ({ userData }: { userData: User | null }) => {
  if (!userData?.plan || userData.credits === undefined) return null;
  
  const planName = userData.plan.charAt(0).toUpperCase() + userData.plan.slice(1);

  return (
    <div className="px-4 lg:px-6 py-4">
        <div className="rounded-lg border bg-background p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
                <Gem className="h-4 w-4 text-primary" />
                <span>Plano {planName}</span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
                Você tem <strong>{userData.credits.remaining}</strong> créditos restantes.
            </div>
        </div>
    </div>
  );
};

const getTitleFromPathname = (path: string) => {
  if (path.startsWith('/settings')) return 'Configurações';
  if (path.startsWith('/outbox')) return 'Caixa de Saída';
  if (path.startsWith('/contacts')) return 'Contatos';
  if (path.startsWith('/dashboard')) return 'Dashboard';
  if (path.startsWith('/whatsapp')) return 'WhatsApp';
  if (path.startsWith('/support')) return 'Suporte';
  if (path.startsWith('/patients')) return 'Pacientes';
  if (path.startsWith('/templates')) return 'Templates';
  if (path.startsWith('/workflows')) return 'Fluxo de Automação';
  if (path.startsWith('/calendar')) return 'Calendário';
  return '';
};

export default function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const { firestore, user } = useFirebase();
  const auth = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const pageTitle = getTitleFromPathname(pathname);

  const userDocRef = useMemoFirebase(() => { 
    if (!user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<User>(userDocRef);

  const handleLogout = () => {
    signOut(auth).then(() => {
      router.push('/');
    });
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("");
  };

  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const mainContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mainContent = mainContentRef.current;
    if (!mainContent) return;

    const handleScroll = () => {
        const currentScrollY = mainContent.scrollTop;
        if (currentScrollY > lastScrollY && currentScrollY > 60) {
            setIsHeaderVisible(false);
        } else {
            setIsHeaderVisible(true);
        }
        setLastScrollY(currentScrollY < 0 ? 0 : currentScrollY);
    };

    mainContent.addEventListener('scroll', handleScroll);
    return () => {
        mainContent.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollY]);

  return (
    <>
      <OnboardingWrapper 
        userDocRef={userDocRef}
        isUserDataLoading={isUserDataLoading}
        userData={userData}
      />
      <div className="grid h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <div className="hidden border-r bg-muted md:block">
          <div className="flex h-full flex-col justify-between">
            <div>
              <div className="flex h-14 shrink-0 items-center px-4 lg:h-[60px] lg:px-6 pt-5">
                <AppLogo />
              </div>
              <div className="py-4">
                <Suspense fallback={<div className="flex justify-center items-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
                  <AppNav onLogout={handleLogout} />
                </Suspense>
              </div>
            </div>
            <PlanUsageDisplay userData={userData} />
          </div>
        </div>
        
        <div ref={mainContentRef} className="flex flex-col overflow-y-auto">
          <EmailVerificationBanner />
          <header className={`flex h-14 items-center gap-4 bg-background px-4 md:px-6 lg:h-[60px] pt-5 sticky top-0 z-10 transition-transform duration-300 ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
            <h1 className="flex-1 text-xl font-semibold md:text-2xl">{pageTitle}</h1>
            {user && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-right">{user.displayName}</span>
                <Avatar>
                  {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName ?? ""} />}
                  <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                </Avatar>
              </div>
            )}
          </header>
          
          <main className="flex flex-1 flex-col bg-background">
            <div className="p-4 md:p-6">
              <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                {children}
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
