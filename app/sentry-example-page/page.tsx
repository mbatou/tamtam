"use client";

import * as Sentry from "@sentry/nextjs";

export default function SentryExamplePage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#111", color: "#fff", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Sentry Test Page</h1>
      <p style={{ color: "#999", marginBottom: "2rem" }}>Click the button to send a test error to Sentry.</p>
      <button
        onClick={() => {
          // Method 1: capture an explicit exception
          Sentry.captureException(new Error("Sentry frontend test — Tamtam integration verified"));
          // Method 2: throw an unhandled error (gets caught by error boundary)
          throw new Error("Sentry frontend test — unhandled error");
        }}
        style={{ padding: "1rem 2rem", borderRadius: "0.5rem", background: "#D35400", color: "#fff", border: "none", cursor: "pointer", fontSize: "1.1rem", fontWeight: "bold" }}
      >
        Throw Test Error
      </button>
    </div>
  );
}
