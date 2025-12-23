
"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { type User } from "@/lib/types";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";

type OnboardingWrapperProps = {
  userDocRef: any; 
  isUserDataLoading: boolean;
  userData: User | null;
};

export function OnboardingWrapper({ userDocRef, isUserDataLoading, userData }: OnboardingWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [showOnboarding, setShowOnboarding] = useState(false);
  const isTourActive = useMemo(() => searchParams.get('tour') === 'true', [searchParams]);

  // Effect to show the onboarding checklist
  useEffect(() => {
    if (isTourActive) {
      setShowOnboarding(true);
      return;
    }
    if (!isUserDataLoading && userData) {
      if (!userData.onboardingCompleted) {
        setShowOnboarding(true);
      }
    }
  }, [isUserDataLoading, userData, isTourActive]);

  // Effect to set default plan data if it's missing
  useEffect(() => {
    if (userDocRef && !isUserDataLoading && userData) {
      // If plan data is missing, set a default Free plan.
      if (userData.plan === undefined) {
        console.log("User plan is missing, setting default Free plan.");
        setDocumentNonBlocking(userDocRef, { 
          plan: 'Free', // Set default plan
          credits: { remaining: 5 } // Set default credits
        }, { merge: true });
      }
    }
  }, [userDocRef, isUserDataLoading, userData]);


  const handleOnboardingComplete = () => {
    if (userDocRef && !userData?.onboardingCompleted) {
      setDocumentNonBlocking(userDocRef, { onboardingCompleted: true }, { merge: true });
    }
    if (isTourActive) {
        // Remove the query param from URL without reloading the page
        router.replace(pathname, { scroll: false });
    }
    setShowOnboarding(false);
  }

  if (showOnboarding) {
    return <OnboardingChecklist userData={userData} userDocRef={userDocRef} onClose={handleOnboardingComplete} />;
  }

  return null;
}
