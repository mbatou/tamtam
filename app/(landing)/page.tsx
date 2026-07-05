"use client";

import { Suspense } from "react";
import Navbar from "./_components/Navbar";
import Hero from "./_components/Hero";
import SocialProofStrip from "./_components/SocialProofStrip";
import SplitExplanation from "./_components/SplitExplanation";
import HowItWorks from "./_components/HowItWorks";
import StatsSection from "./_components/StatsSection";
import Testimonials from "./_components/Testimonials";
import UseCases from "./_components/UseCases";
import PixelCallout from "./_components/PixelCallout";
import FAQ from "./_components/FAQ";
import FinalCTA from "./_components/FinalCTA";
import Footer from "./_components/Footer";

export default function LandingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-tt-night" />}>
      <LandingContent />
    </Suspense>
  );
}

function LandingContent() {
  return (
    <main className="bg-tt-night text-white overflow-x-hidden">
      <Navbar />
      <Hero />
      <SocialProofStrip />
      <SplitExplanation />
      <HowItWorks />
      <StatsSection />
      <Testimonials />
      <UseCases />
      <PixelCallout />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
