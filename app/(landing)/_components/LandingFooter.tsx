"use client";

import { useTranslation } from "@/lib/i18n";

export default function LandingFooter() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-gray-800 mt-20 py-8 text-center">
      <p className="text-gray-500 text-sm">
        {t("selector.footerTagline")}
      </p>
      <p className="text-gray-600 text-xs mt-1">
        par Lupandu ·{" "}
        <a
          href="mailto:support@tamma.me"
          className="text-accent hover:underline"
        >
          support@tamma.me
        </a>
      </p>
    </footer>
  );
}
