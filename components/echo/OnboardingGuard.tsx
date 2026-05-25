"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { shouldShowOnboarding } from "@/lib/onboarding";
import type { User } from "@/lib/types";

export default function OnboardingGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (checked) return;
    if (pathname.startsWith("/onboarding")) return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/echo/user");
        if (!res.ok) return;
        const user: User = await res.json();
        if (shouldShowOnboarding(user)) {
          router.push("/onboarding");
        }
      } catch {
        // silent
      }
      setChecked(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [checked, pathname, router]);

  return null;
}
