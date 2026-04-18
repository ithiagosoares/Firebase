"use client";

import { CtaSection } from "@/components/landing/cta-section";
import { FaqSection } from "@/components/landing/faq-section";
import { Footer } from "@/components/landing/footer";
import { HeroSection } from "@/components/landing/hero-section";
import { LandingHeader } from "@/components/landing/landing-header";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { ProblemSection } from "@/components/landing/problem-section";
import { SocialProofSection } from "@/components/landing/social-proof-section";
import { SolutionSection } from "@/components/landing/solution-section";


export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-gray-800 font-sans">
      <LandingHeader />
      <main className="flex-1">
        <HeroSection />
        <ProblemSection />
        <HowItWorksSection />
        <SolutionSection />
        <SocialProofSection />
        <FaqSection />
        <CtaSection />
      </main>
      <section className="py-4 text-center bg-white">
        <p className="text-xs text-gray-400">
          Razão Social: 65.544.455 THIAGO DOS SANTOS SOARES
        </p>
      </section>
      <Footer />
    </div>
  );
}

// Forcing cache invalidation with a trivial change
