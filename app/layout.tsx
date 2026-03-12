import type { Metadata } from "next";
import "./globals.css";
import { PWARegister } from "@/components/PWARegister";

export const metadata: Metadata = {
  title: "Tamtam — Partage. Résonne. Gagne.",
  description:
    "Gagne de l'argent en partageant des liens sur WhatsApp. La plateforme de micro-influence pour tous.",
  manifest: "/manifest.json",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    viewportFit: "cover",
  },
  themeColor: "#D35400",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Tamtam",
  },
  other: {
    "apple-touch-icon": "/icons/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="font-outfit antialiased bg-background text-foreground min-h-screen">
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
