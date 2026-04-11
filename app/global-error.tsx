"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "system-ui, sans-serif", background: "#111", color: "#fff" }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Une erreur est survenue</h2>
          <p style={{ color: "#999", marginBottom: "2rem" }}>Nous avons ete notifies et travaillons sur le correctif.</p>
          <button
            onClick={reset}
            style={{ padding: "0.75rem 2rem", borderRadius: "0.5rem", background: "#D35400", color: "#fff", border: "none", cursor: "pointer", fontSize: "1rem" }}
          >
            Reessayer
          </button>
        </div>
      </body>
    </html>
  );
}
