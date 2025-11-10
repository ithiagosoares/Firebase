"use client";

import Link from "next/link";
import { AppLogo } from "@/components/app-logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function LandingHeader() {
  const [isMenuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: "#features", label: "Funcionalidades" },
    { href: "#testimonials", label: "Depoimentos" },
    { href: "/support", label: "Suporte" },
  ];

  const NavItems = ({ inSheet = false }: { inSheet?: boolean }) => (
    <>
      {navLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "font-medium text-gray-600 hover:text-gray-900 transition-colors",
            inSheet ? "text-lg" : "text-sm"
          )}
          onClick={() => isMenuOpen && setMenuOpen(false)}
        >
          {link.label}
        </Link>
      ))}
    </>
  );

  return (
    <header className="px-4 lg:px-6 h-20 flex items-center shadow-sm bg-white/70 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between">
        <Link href="/">
          <AppLogo />
        </Link>
        <nav className="hidden lg:flex items-center gap-8">
          <NavItems />
        </nav>
        <div className="hidden lg:flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button
            asChild
            className="bg-gradient-to-r from-[#00B3A4] to-[#05326D] text-white font-semibold hover:shadow-lg hover:brightness-110 transition-all duration-300"
          >
            <Link href="/signup">Quero aumentar meus retornos</Link>
          </Button>
        </div>

        {/* Mobile Menu */}
        <Sheet open={isMenuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="lg:hidden">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Abrir menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
            <div className="flex flex-col gap-6 p-6 h-full">
                <Link href="/" onClick={() => setMenuOpen(false)}>
                  <AppLogo />
                </Link>
                <nav className="grid gap-4 mt-4">
                    <NavItems inSheet />
                </nav>
                <div className="flex flex-col gap-4 mt-auto">
                    <Button variant="ghost" asChild>
                        <Link href="/login" onClick={() => setMenuOpen(false)}>Login</Link>
                    </Button>
                    <Button
                        asChild
                        className="bg-gradient-to-r from-[#00B3A4] to-[#05326D] text-white font-semibold hover:shadow-lg hover:brightness-110 transition-all duration-300"
                    >
                        <Link href="/signup" onClick={() => setMenuOpen(false)}>Quero aumentar meus retornos</Link>
                    </Button>
                </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
