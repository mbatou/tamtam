import type { Metadata } from "next";
import "./globals.css";
import { PWARegister } from "@/components/PWARegister";
import { I18nProvider } from "@/lib/i18n";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: {
    default: "Tamtam — La publicité WhatsApp Status, débloquée.",
    template: "%s | Tamtam",
  },
  description:
    "Touchez vos clients là où ils sont vraiment : WhatsApp. 5 à 10× moins cher que Facebook Ads.",
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
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
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
    title: "Tamtam — La publicité WhatsApp Status, débloquée.",
    description:
      "Touchez vos clients là où ils sont vraiment : WhatsApp. 5 à 10× moins cher que Facebook Ads.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Tamtam — La publicité WhatsApp Status, débloquée.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tamtam — La publicité WhatsApp Status, débloquée.",
    description:
      "Touchez vos clients là où ils sont vraiment : WhatsApp. 5 à 10× moins cher que Facebook Ads.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
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
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
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
