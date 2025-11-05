"use client"

import { cn } from "@/lib/utils"
import { AppLogoIcon } from "./app-logo-icon"

export function AppLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
       <AppLogoIcon className="h-8 w-auto" />
    </div>
  )
}
