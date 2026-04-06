"use client";

import { useEffect, useState, useCallback } from "react";
import InterestOnboardingModal from "./InterestOnboardingModal";

export default function InterestOnboardingWrapper() {
  const [showModal, setShowModal] = useState(false);
  const [isExistingEcho, setIsExistingEcho] = useState(true);
  const [showReward, setShowReward] = useState(true);
  const [checked, setChecked] = useState(false);

  const checkShouldShow = useCallback(async () => {
    try {
      const res = await fetch("/api/echo/interests");
      if (!res.ok) return;
      const data = await res.json();

      // Never show if already completed
      if (data.interestsCompletedAt) return;

      // If dismissed recently (within 3 days), don't show yet
      if (data.interestsPromptDismissedAt) {
        const dismissedAt = new Date(data.interestsPromptDismissedAt);
        const threeDaysLater = new Date(dismissedAt.getTime() + 3 * 24 * 60 * 60 * 1000);
        if (new Date() < threeDaysLater) return;
      }

      // Check if rewards are still available
      const deadline = new Date("2026-04-30T23:59:59Z");
      setShowReward(new Date() <= deadline);
      setShowModal(true);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (!checked) {
      setChecked(true);
      // Delay slightly so the main dashboard loads first
      const timer = setTimeout(checkShouldShow, 1500);
      return () => clearTimeout(timer);
    }
  }, [checked, checkShouldShow]);

  if (!showModal) return null;

  return (
    <InterestOnboardingModal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
      onComplete={() => setShowModal(false)}
      isExistingEcho={isExistingEcho}
      showReward={showReward}
    />
  );
}
