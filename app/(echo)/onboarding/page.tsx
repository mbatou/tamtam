"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import OnboardingShell from "@/components/echo/onboarding/OnboardingShell";
import StepPlatforms from "@/components/echo/onboarding/StepPlatforms";
import StepAudience from "@/components/echo/onboarding/StepAudience";
import StepInterests from "@/components/echo/onboarding/StepInterests";
import { getPrimaryPlatform, PLATFORM_LABELS } from "@/lib/onboarding";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [audienceSize, setAudienceSize] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/echo/user")
      .then((r) => r.json())
      .then((user) => {
        if (user.platforms?.length) setPlatforms(user.platforms);
        if (user.audience_size_range) setAudienceSize(user.audience_size_range);
      })
      .catch(() => {});
  }, []);

  async function savePlatformData() {
    const primary = getPrimaryPlatform(platforms);
    try {
      await fetch("/api/echo/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platforms,
          primary_platform: primary,
          audience_size_range: audienceSize,
        }),
      });
    } catch {
      // silent — data saved on best effort, user can edit later from profil
    }
  }

  async function handlePlatformNext() {
    setStep(1);
  }

  async function handleAudienceNext() {
    await savePlatformData();
    setStep(2);
  }

  function handleInterestsComplete() {
    router.push("/dashboard");
  }

  async function handleSkip() {
    if (platforms.length > 0 || audienceSize) {
      await savePlatformData();
    }
    try {
      await fetch("/api/echo/interests/dismiss", { method: "POST" });
    } catch {
      // silent
    }
    router.push("/dashboard");
  }

  const primaryPlatform = platforms.length > 0 ? getPrimaryPlatform(platforms) : "whatsapp";
  const primaryLabel = PLATFORM_LABELS[primaryPlatform] || primaryPlatform;

  return (
    <OnboardingShell currentStep={step} totalSteps={3}>
      {step === 0 && (
        <StepPlatforms
          selected={platforms}
          onChange={setPlatforms}
          onNext={handlePlatformNext}
          onSkip={handleSkip}
        />
      )}
      {step === 1 && (
        <StepAudience
          primaryPlatformLabel={primaryLabel}
          selected={audienceSize}
          onChange={setAudienceSize}
          onNext={handleAudienceNext}
          onBack={() => setStep(0)}
          onSkip={handleSkip}
        />
      )}
      {step === 2 && (
        <StepInterests
          onComplete={handleInterestsComplete}
          onBack={() => setStep(1)}
          onSkip={handleSkip}
        />
      )}
    </OnboardingShell>
  );
}
