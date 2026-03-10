import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tamtam — Partage. Résonne. Gagne.",
  description:
    "Gagne de l'argent en partageant des liens sur WhatsApp. La plateforme de micro-influence pour tous.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="font-outfit antialiased bg-background text-foreground min-h-screen">
        {children}
      </body>
    </html>
  );
}
