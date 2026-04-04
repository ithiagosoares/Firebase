import { FeaturesHero } from "@/components/features/features-hero";
import { FeaturesGrid } from "@/components/features/features-grid";
import { FeaturesBenefits } from "@/components/features/features-benefits";
import { FeaturesCta } from "@/components/features/features-cta";
import { LandingHeader } from "@/components/landing/landing-header";
import { Footer } from "@/components/landing/footer";

export default function FuncionalidadesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <LandingHeader />
      <main className="flex-1">
        <FeaturesHero />
        <FeaturesGrid />
        <FeaturesBenefits />
        <FeaturesCta />
      </main>
      <Footer />
    </div>
  );
}
