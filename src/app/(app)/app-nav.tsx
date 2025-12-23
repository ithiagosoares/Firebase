'use client'

import {
  Home,
  Users,
  MessageSquare,
  Calendar,
  Send,
  Settings,
  LifeBuoy,
  LogOut,
  GitFork as Workflow,
} from 'lucide-react';
import NavItem from "@/app/(app)/nav-item";
import { Separator } from '@/components/ui/separator';

const navItems = [
  { href: "/dashboard", icon: Home, label: "Início" },
  { href: "/calendar", icon: Calendar, label: "Calendário" },
  { href: "/patients", icon: Users, label: "Pacientes" },
  { href: "/templates", icon: MessageSquare, label: "Templates" },
  { href: "/workflows", icon: Workflow, label: "Workflows" },
  { href: "/outbox", icon: Send, label: "Outbox" },
];

const footerItems = [
  { href: "/support", icon: LifeBuoy, label: "Suporte" },
  { href: "/settings", icon: Settings, label: "Configurações" },
];

export function AppNav({ onLogout }: { onLogout: () => void }) {
  return (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {navItems.map((item) => (
        <NavItem key={item.href} {...item} />
      ))}
      <Separator className="my-4" />
      {footerItems.map((item) => (
        <NavItem key={item.href} {...item} />
      ))}
       <button
        onClick={onLogout}
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
      >
        <LogOut className="h-4 w-4" />
        Sair
      </button>
    </nav>
  );
}
