"use client";

import { CtaSection } from "@/components/landing/cta-section";
import { FaqSection } from "@/components/landing/faq-section";
import { Footer } from "@/components/landing/footer";
import { HeroSection } from "@/components/landing/hero-section";
import { LandingHeader } from "@/components/landing/landing-header";
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
        <SolutionSection />
        <SocialProofSection />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
