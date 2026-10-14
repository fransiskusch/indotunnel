import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { Hero } from "@/components/landing/hero";
import { Quickstart } from "@/components/landing/quickstart";
import { Features } from "@/components/landing/features";
import { AiSection } from "@/components/landing/ai-section";
import { Pricing } from "@/components/landing/pricing";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Background Decorative Grid */}
      <div className="fixed inset-0 bg-grid-pattern opacity-40 pointer-events-none" />

      {/* Header / Navbar */}
      <SiteHeader />

      {/* Main Container */}
      <main className="relative z-10">
        {/* HERO SECTION */}
        <Hero />

        {/* 3-STEP QUICKSTART SECTION */}
        <Quickstart />

        {/* FEATURES SHOWCASE */}
        <Features />

        {/* AI SECTION */}
        <AiSection />

        {/* PRICING SECTION */}
        <Pricing />

        {/* FOOTER */}
        <SiteFooter />
      </main>
    </div>
  );
}
