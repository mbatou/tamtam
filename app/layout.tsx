import type { Metadata } from "next";
import "./globals.css";
import { PWARegister } from "@/components/PWARegister";
import { I18nProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: {
    default: "Tamtam — Partage. Résonne. Gagne.",
    template: "%s | Tamtam",
  },
  description:
    "Gagne de l'argent en partageant des liens sur WhatsApp. La plateforme de micro-influence au Sénégal.",
  keywords: [
    "Tamtam", "micro-influence", "WhatsApp", "Sénégal", "gagner argent",
    "partage liens", "CPC", "influence marketing", "Dakar", "Wave", "Orange Money",
  ],
  authors: [{ name: "Tamtam" }],
  creator: "Tamtam",
  metadataBase: new URL("https://tamma.me"),
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
  openGraph: {
    type: "website",
    locale: "fr_SN",
    url: "https://tamma.me",
    siteName: "Tamtam",
    title: "Tamtam — Partage. Résonne. Gagne.",
    description:
      "Gagne de l'argent en partageant des liens sur WhatsApp. La plateforme de micro-influence au Sénégal.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Tamtam — Partage. Résonne. Gagne.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tamtam — Partage. Résonne. Gagne.",
    description:
      "Gagne de l'argent en partageant des liens sur WhatsApp. La plateforme de micro-influence au Sénégal.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Tamtam",
              url: "https://tamma.me",
              description:
                "Gagne de l'argent en partageant des liens sur WhatsApp. La plateforme de micro-influence au Sénégal.",
              applicationCategory: "BusinessApplication",
              operatingSystem: "All",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "XOF",
              },
              author: {
                "@type": "Organization",
                name: "Tamtam",
                url: "https://tamma.me",
              },
            }),
          }}
        />
        <I18nProvider>
          {children}
          <PWARegister />
        </I18nProvider>
      </body>
    </html>
  );
}
