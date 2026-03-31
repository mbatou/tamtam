import type { Metadata } from "next";
import "./globals.css";
import { PWARegister } from "@/components/PWARegister";
import { I18nProvider } from "@/lib/i18n";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: {
    default: "Tamtam — Le bouche-à-oreille digital au Sénégal",
    template: "%s | Tamtam",
  },
  description:
    "Lancez des campagnes CPC sur WhatsApp (marques) ou gagnez de l'argent en partageant des liens (échos). La plateforme de micro-influence #1 au Sénégal. 552+ Échos, 27+ Marques.",
  keywords: [
    "Tamtam", "micro-influence", "WhatsApp", "Sénégal", "gagner argent",
    "partage liens", "CPC", "influence marketing", "Dakar", "Wave", "Orange Money",
    "campagne WhatsApp", "écho", "marque", "marketing digital Sénégal",
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
    title: "Tamtam — Le bouche-à-oreille digital au Sénégal",
    description:
      "Marques: touchez des milliers de personnes via WhatsApp dès 20 FCFA/clic. Échos: gagnez de l'argent en partageant des liens. tamma.me",    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Tamtam — Le bouche-à-oreille digital au Sénégal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tamtam — Le bouche-à-oreille digital au Sénégal",
    description:
      "Marques: touchez des milliers de personnes via WhatsApp dès 20 FCFA/clic. Échos: gagnez de l'argent en partageant des liens. tamma.me",    images: ["/og-image.png"],
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
                "Lancez des campagnes CPC sur WhatsApp ou gagnez de l'argent en partageant des liens. La plateforme de micro-influence #1 au Sénégal.",
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
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
