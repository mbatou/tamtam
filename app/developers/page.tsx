"use client";

import DevNav from "./_components/DevNav";
import Hero from "./_components/Hero";
import QuickStart from "./_components/QuickStart";
import HowItWorks from "./_components/HowItWorks";
import TmRefLifecycle from "./_components/TmRefLifecycle";
import ApiReference from "./_components/ApiReference";
import CodeExamples from "./_components/CodeExamples";
import Testing from "./_components/Testing";
import Privacy from "./_components/Privacy";
import DevFaq from "./_components/DevFaq";
import FinalCta from "./_components/FinalCta";
import Changelog from "./_components/Changelog";
import DevFooter from "./_components/DevFooter";

export default function DevelopersPage() {
  return (
    <div className="min-h-screen bg-[#0A0A1A]">
      <DevNav />
      <Hero />
      <QuickStart />
      <HowItWorks />
      <TmRefLifecycle />
      <ApiReference />
      <CodeExamples />
      <Testing />
      <Privacy />
      <DevFaq />
      <FinalCta />
      <Changelog />
      <DevFooter />
    </div>
  );
}
