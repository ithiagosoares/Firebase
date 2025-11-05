
"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Sheet,
    SheetContent,
    SheetTrigger,
    SheetTitle,
    SheetDescription,
    SheetHeader,
} from "@/components/ui/sheet"
import {
  Calendar,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Send,
  Settings,
  Users,
  Workflow,
  Shield, 
  Menu
} from "lucide-react"

import { doc } from "firebase/firestore"
import { type User } from "@/lib/types"

import { AppLogo } from "@/components/app-logo"
import NavItem from "./nav-item"
import { useEffect, useState, useMemo, Suspense } from "react"
import { Loader2 } from "lucide-react"
import { PlanStatus } from "@/components/plan-status"
import { OnboardingWrapper } from "./onboarding-wrapper"

import { useAuth, useUser, useFirestore, useMemoFirebase } from "@/firebase/provider"
import { useDoc } from "@/firebase/firestore/use-doc"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user: authUser, isUserLoading: isAuthUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!authUser) return null;
    return doc(firestore, "users", authUser.uid);
  }, [firestore, authUser]);

  const { data: userData, isLoading: isUserDataLoading } = useDoc<User>(userDocRef);

  useEffect(() => {
    if (!isAuthUserLoading && !authUser) {
      router.push("/login");
    }
  }, [isAuthUserLoading, authUser, router]);


  const handleLogout = () => {
    auth.signOut();
  };
  
  const navItems = [
    {
      href: "/dashboard",
      icon: LayoutDashboard,
      label: "Dashboard",
      tourId: "dashboard-nav",
    },
    {
      href: "/calendar",
      icon: Calendar,
      label: "Calendário",
    },
    {
      href: "/patients",
      icon: Users,
      label: "Pacientes",
      tourId: "patients-nav",
    },
    {
      href: "/templates",
      icon: FileText,
      label: "Templates",
      tourId: "templates-nav",
    },
    {
      href: "/workflows",
      icon: Workflow,
      label: "Fluxos",
      tourId: "workflows-nav",
    },
    {
      href: "/outbox",
      icon: Send,
      label: "Caixa de Saída",
      tourId: "outbox-nav",
    },
    {
      href: "/consent-audit",
      icon: Shield,
      label: "Auditoria",
    }
  ]

  const isLoading = isAuthUserLoading || isUserDataLoading;

  if (isLoading || !authUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const DesktopSidebar = () => (
    <div className="hidden border-r bg-card lg:block">
        <div className="flex h-full max-h-screen flex-col">
          <div className="flex h-16 items-center border-b px-6 shrink-0">
            <Link href="/dashboard">
              <AppLogo />
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            <nav className="grid items-start px-4 text-sm font-medium">
              {navItems.map((item) => (
                <NavItem key={item.href} {...item} />
              ))}
            </nav>
          </div>
          <div className="p-4 border-t mt-auto shrink-0">
            <nav className="grid gap-1">
                <NavItem href="/settings" icon={Settings} label="Configurações" tourId="settings-nav" />
                <NavItem href="/support" icon={LifeBuoy} label="Suporte" />
            </nav>
          </div>
        </div>
    </div>
  )
  
    const MobileSidebar = () => (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Toggle Navigation</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
                 <SheetHeader>
                    <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
                    <SheetDescription className="sr-only">
                        Navegue pelas seções principais do aplicativo.
                    </SheetDescription>
                </SheetHeader>
                <div className="flex h-16 items-center border-b px-6 shrink-0">
                    <Link href="/dashboard">
                        <AppLogo />
                    </Link>
                </div>
                 <div className="flex-1 overflow-y-auto py-2">
                    <nav className="grid items-start px-4 text-sm font-medium">
                        {navItems.map((item) => (
                            <NavItem key={item.href} {...item} />
                        ))}
                    </nav>
                </div>
                <div className="p-4 border-t mt-auto shrink-0">
                    <nav className="grid gap-1">
                        <NavItem href="/settings" icon={Settings} label="Configurações" tourId="settings-nav" />
                        <NavItem href="/support" icon={LifeBuoy} label="Suporte" />
                    </nav>
                </div>
            </SheetContent>
        </Sheet>
    )

  return (
    <div className="grid h-screen w-full lg:grid-cols-[280px_1fr]">
      <Suspense fallback={null}>
        <OnboardingWrapper 
          userDocRef={userDocRef}
          isUserDataLoading={isUserDataLoading}
          userData={userData}
        />
      </Suspense>
      <DesktopSidebar />
      <div className="flex flex-col h-screen">
        <header className="flex h-16 items-center gap-4 border-b bg-card px-6 shrink-0">
          <MobileSidebar />
          <div className="w-full flex-1" /> {/* Spacer */}
          <PlanStatus />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={authUser?.photoURL || "https://firebasestorage.googleapis.com/v0/b/studio-296644579-18969.firebasestorage.app/o/perfil_usuario.svg?alt=media&token=bef5fdca-7321-4928-a649-c45def482e59"} alt="@user" />
                  <AvatarFallback>{authUser?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/settings')}>Configurações</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/support')}>Suporte</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
