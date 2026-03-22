"use client";

import { Suspense } from "react";
import LandingContent from "./LandingContent";

export default function LandingPage() {
  return (
    <Suspense>
      <LandingContent />
    </Suspense>
  );
}
