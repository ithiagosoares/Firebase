"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useUser, useFirestore, useMemoFirebase } from "@/firebase/provider"
import { useCollection } from "@/firebase/firestore/use-collection"
import { useDoc } from "@/firebase/firestore/use-doc"
import { collection, doc } from "firebase/firestore"
import { type User, type ScheduledMessage } from "@/lib/types"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const planLimits = {
  Trial: 10,
  Profissional: 200,
  Equipe: 500,
}

export function PlanStatus() {
  const { user: authUser } = useUser()
  const firestore = useFirestore()

  const userDocRef = useMemoFirebase(() => {
    if (!authUser) return null
    return doc(firestore, "users", authUser.uid)
  }, [firestore, authUser])

  const { data: userData, isLoading: isUserDataLoading } = useDoc<User>(userDocRef)

  const messagesCollection = useMemoFirebase(() => {
    if (!authUser) return null
    return collection(firestore, `users/${authUser.uid}/scheduledMessages`)
  }, [firestore, authUser])
  
  const { data: messages, isLoading: isLoadingMessages } = useCollection<ScheduledMessage>(messagesCollection)

  const { currentPlan, remainingMessages, messageLimit } = useMemo(() => {
    const plan = (userData as any)?.plan || "Trial"
    const limit = planLimits[plan as keyof typeof planLimits] || 10
    const sent = messages?.filter(m => m.status === 'Enviado').length || 0
    const remaining = limit - sent;
    return {
      currentPlan: plan,
      remainingMessages: remaining,
      messageLimit: limit,
    }
  }, [userData, messages])

  const isLoading = isUserDataLoading || isLoadingMessages

  if (isLoading) {
    return <Skeleton className="h-8 w-48 rounded-lg" />
  }
  
  const isLowOnMessages = remainingMessages / messageLimit <= 0.2;

  return (
    <Link href="/settings">
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
          isLowOnMessages 
            ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
            : "bg-accent text-accent-foreground hover:bg-accent/80"
        )}
      >
        <span>Plano {currentPlan}:</span>
        <span className={cn(isLowOnMessages ? "text-destructive font-bold" : "text-muted-foreground")}>
          {remainingMessages} restantes
        </span>
      </div>
    </Link>
  )
}
