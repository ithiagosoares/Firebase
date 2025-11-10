"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export default function NavItem({ href, icon: Icon, label, tourId }: { href: string, icon: React.ElementType, label: string, tourId?: string }) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      className={cn("flex items-center gap-3 rounded-lg px-3 py-2 transition-all", 
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:text-primary"
      )}
      data-tour-id={tourId}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  )
}
