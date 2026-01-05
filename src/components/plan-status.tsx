'use client'

import { useMemo } from "react"
import Link from "next/link"
import { useUser, useFirestore, useMemoFirebase } from "@/firebase/provider"
import { useDoc } from "@/firebase/firestore/use-doc"
import { doc } from "firebase/firestore"
import { type User } from "@/lib/types"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// Mapeia o ID do plano para a quantidade total de créditos
const planCreditLimits = {
  Free: 5,
  Essencial: 150,
  Profissional: 300,
  Premium: 750,
}

export function PlanStatus() {
  const { user: authUser } = useUser()
  const firestore = useFirestore()

  const userDocRef = useMemoFirebase(() => {
    if (!authUser) return null
    return doc(firestore, "users", authUser.uid)
  }, [firestore, authUser])

  // O hook useDoc já escuta as atualizações em tempo real
  const { data: userData, isLoading } = useDoc<User>(userDocRef)

  const { currentPlan, remainingCredits, creditLimit } = useMemo(() => {
    // Usa os dados do Firestore como fonte da verdade
    const plan = userData?.plan || "Free"
    const remaining = userData?.credits?.remaining ?? 0
    const limit = planCreditLimits[plan as keyof typeof planCreditLimits] || 5
    
    return {
      currentPlan: plan,
      remainingCredits: remaining,
      creditLimit: limit,
    }
  }, [userData])

  if (isLoading) {
    return <Skeleton className="h-8 w-48 rounded-lg" />
  }
  
  // Alerta de créditos baixos quando estiver com 20% ou menos
  const isLowOnCredits = creditLimit > 0 && (remainingCredits / creditLimit) <= 0.2;

  return (
    <Link href="/settings#plans">
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
          isLowOnCredits 
            ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
            : "bg-accent text-accent-foreground hover:bg-accent/80"
        )}
      >
        <span>Plano {currentPlan}:</span>
        <span className={cn("font-bold", isLowOnCredits ? "text-destructive" : "text-primary")}>
          {remainingCredits} créditos
        </span>
      </div>
    </Link>
  )
}
