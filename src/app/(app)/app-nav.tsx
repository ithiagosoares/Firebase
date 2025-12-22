
'use client'

import { Home, Users, MessageSquare, Calendar, Bot } from 'lucide-react';
import NavItem from "@/app/(app)/nav-item";

const navItems = [
  { href: "/dashboard", icon: Home, label: "Início", tourId: "step-dashboard" },
  { href: "/patients", icon: Users, label: "Pacientes", tourId: "step-patients" },
  { href: "/templates", icon: MessageSquare, label: "Templates", tourId: "step-templates" },
  { href: "/schedule", icon: Calendar, label: "Agendamentos", tourId: "step-schedule" },
  { href: "/ai-assistant", icon: Bot, label: "Assistente IA", tourId: "step-ai-assistant" },
];

export function AppNav() {
  return (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {navItems.map((item) => (
        <NavItem key={item.href} {...item} />
      ))}
    </nav>
  );
}
