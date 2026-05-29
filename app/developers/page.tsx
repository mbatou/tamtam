"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Server,
  Link2,
  Shield,
  Key,
  Terminal,
  MessageCircle,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import CodeBlock from "@/components/developers/CodeBlock";
import TabGroup from "@/components/developers/TabGroup";
import StepCard from "@/components/developers/StepCard";
import ApiParam from "@/components/developers/ApiParam";
import EndpointBadge from "@/components/developers/EndpointBadge";

// ══════════════════════════════════════════════════
// NAV
// ══════════════════════════════════════════════════
function DevNav() {
  return (
    <nav className="sticky top-0 z-50 bg-[#0A0A1A]/90 backdrop-blur-xl border-b border-white/[0.07]">
      <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="shrink-0">
            <Image src="/brand/tamtam-horizontal-orange.png" alt="Tamtam" width={100} height={26} priority className="h-6 w-auto" />
          </Link>
          <span className="text-white/15">|</span>
          <span className="text-[12px] font-code text-white/40">Developers</span>
        </div>
        <div className="hidden sm:flex items-center gap-6">
          <a href="#quickstart" className="text-[12px] font-dm text-white/40 hover:text-white transition-colors">Quick start</a>
          <a href="#api" className="text-[12px] font-dm text-white/40 hover:text-white transition-colors">API</a>
          <a href="#examples" className="text-[12px] font-dm text-white/40 hover:text-white transition-colors">Exemples</a>
          <a href="#faq" className="text-[12px] font-dm text-white/40 hover:text-white transition-colors">FAQ</a>
          <Link
            href="/signup/brand"
            className="text-[11px] font-dm font-semibold bg-[#D35400] text-white px-3 py-1.5 rounded-lg hover:bg-[#B94700] transition-colors"
          >
            Get API key
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ══════════════════════════════════════════════════
// HERO
// ══════════════════════════════════════════════════
function Hero() {
  return (
    <section className="bg-[#0A0A1A] pt-20 pb-16 sm:pt-28 sm:pb-24 px-5">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <p className="font-code text-[11px] text-[#D35400] uppercase tracking-[0.15em] mb-4">
            Tamtam for Developers
          </p>
          <h1 className="text-[36px] sm:text-[52px] font-bold font-syne tracking-tight text-white leading-[1.1] mb-5">
            Intégrez le Pixel.
            <br />
            Tracez tout.
          </h1>
          <p className="text-[15px] font-dm text-white/45 leading-relaxed max-w-[520px] mb-8">
            Le Tamtam Pixel est un tracker server-side léger.
            Clics vérifiés, inscriptions, activations, achats —
            tout remonte dans votre dashboard en temps réel.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/signup/brand"
              className="inline-flex items-center gap-2 bg-[#D35400] text-white font-dm font-semibold text-[13px] px-5 py-2.5 rounded-lg hover:bg-[#B94700] transition-colors"
            >
              Get your API key <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#quickstart"
              className="inline-flex items-center gap-2 border border-white/[0.12] text-white/60 font-dm font-semibold text-[13px] px-5 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              Read the docs ↓
            </a>
          </div>
        </div>

        {/* Code preview */}
        <div className="bg-[#0D1117] border border-white/[0.08] rounded-[14px] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-[#161B22] border-b border-white/[0.06]">
            <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
            <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
            <div className="w-3 h-3 rounded-full bg-[#28C840]" />
            <span className="ml-2 text-[11px] text-white/25 font-code">tamtam-pixel.js</span>
          </div>
          <pre className="p-5 text-[12px] font-code leading-[1.8] overflow-x-auto scrollbar-hide">
            <code>
              <span className="text-[#8B949E]">{"// Initialize Tamtam Pixel"}</span>{"\n"}
              <span className="text-[#FF7B72]">window</span>
              <span className="text-white">.</span>
              <span className="text-[#79C0FF]">tamtam</span>
              <span className="text-white"> = </span>
              <span className="text-[#FF7B72]">new</span>
              <span className="text-[#FFA657]"> TamtamPixel</span>
              <span className="text-white">(</span>
              <span className="text-[#A5D6FF]">{`'tmsk_your_key_here'`}</span>
              <span className="text-white">)</span>{"\n\n"}
              <span className="text-[#8B949E]">{"// Track a signup"}</span>{"\n"}
              <span className="text-[#79C0FF]">tamtam</span>
              <span className="text-white">.</span>
              <span className="text-[#D2A8FF]">track</span>
              <span className="text-white">(</span>
              <span className="text-[#A5D6FF]">{`'sign_up'`}</span>
              <span className="text-white">, {"{"}</span>{"\n"}
              <span className="text-white">  </span>
              <span className="text-[#79C0FF]">value</span>
              <span className="text-white">: </span>
              <span className="text-[#79C0FF]">1</span>
              <span className="text-white">,</span>{"\n"}
              <span className="text-white">  </span>
              <span className="text-[#79C0FF]">currency</span>
              <span className="text-white">: </span>
              <span className="text-[#A5D6FF]">{`'XOF'`}</span>{"\n"}
              <span className="text-white">{"}"}</span>
              <span className="text-white">)</span>{"\n\n"}
              <span className="text-[#3FB950]">{"// ✓ Event received · 47ms"}</span>
            </code>
          </pre>
        </div>
      </div>

      {/* Stats strip */}
      <div className="max-w-7xl mx-auto mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
        {[
          "< 2KB gzipped",
          "Server-side verified",
          "3-layer fraud protection",
        ].map((s, i) => (
          <span key={i} className="text-[11px] font-dm text-white/30">
            {i > 0 && <span className="mr-6 sm:mr-10 text-white/10">·</span>}
            {s}
          </span>
        ))}
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════
// QUICK START
// ══════════════════════════════════════════════════
function QuickStart() {
  return (
    <section id="quickstart" className="bg-[#111128] py-20 sm:py-28 px-5">
      <div className="max-w-3xl mx-auto">
        <p className="font-code text-[11px] text-[#D35400] uppercase tracking-[0.15em] mb-3">Quick start</p>
        <h2 className="text-[28px] sm:text-[36px] font-bold font-syne text-white mb-12">
          Intégration en 5 minutes
        </h2>

        <div className="space-y-16">
          {/* Step 1 */}
          <StepCard step={1} title="Ajoutez le script" description="Add to your <head> tag:">
            <TabGroup
              tabs={[
                {
                  label: "HTML",
                  content: (
                    <CodeBlock
                      language="html"
                      filename="index.html"
                      code={`<!-- Tamtam Pixel -->
<script>
  (function(w,d,s,k){
    w.TamtamObject=s;
    w[s]=w[s]||function(){(w[s].q=w[s].q||[]).push(arguments)};
    w[s].l=1*new Date();
    var f=d.getElementsByTagName('script')[0],
        j=d.createElement('script');
    j.async=true;
    j.src='https://cdn.tamma.me/pixel/v1/tamtam.min.js';
    f.parentNode.insertBefore(j,f);
  }(window,document,'script','tamtam'));

  tamtam('init', 'tmsk_YOUR_KEY_HERE');
</script>`}
                    />
                  ),
                },
                {
                  label: "Next.js",
                  content: (
                    <CodeBlock
                      language="tsx"
                      filename="app/layout.tsx"
                      code={`import Script from 'next/script'

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <Script
          src="https://cdn.tamma.me/pixel/v1/tamtam.min.js"
          strategy="afterInteractive"
        />
        <Script id="tamtam-init" strategy="afterInteractive">
          {\`tamtam('init', '\${process.env.NEXT_PUBLIC_TAMTAM_PIXEL_ID}')\`}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  )
}`}
                    />
                  ),
                },
                {
                  label: "React",
                  content: (
                    <CodeBlock
                      language="tsx"
                      filename="src/index.html"
                      code={`<!-- Add to your public/index.html <head> -->
<script>
  (function(w,d,s,k){
    w.TamtamObject=s;
    w[s]=w[s]||function(){(w[s].q=w[s].q||[]).push(arguments)};
    w[s].l=1*new Date();
    var f=d.getElementsByTagName('script')[0],
        j=d.createElement('script');
    j.async=true;
    j.src='https://cdn.tamma.me/pixel/v1/tamtam.min.js';
    f.parentNode.insertBefore(j,f);
  }(window,document,'script','tamtam'));
  tamtam('init', 'tmsk_YOUR_KEY_HERE');
</script>

<!-- Then in your components: -->
<!-- window.tamtam('track', 'sign_up', { value: 1 }) -->`}
                    />
                  ),
                },
                {
                  label: "Vue",
                  content: (
                    <CodeBlock
                      language="html"
                      filename="index.html"
                      code={`<!-- Add to your public/index.html <head> -->
<script>
  (function(w,d,s,k){
    w.TamtamObject=s;
    w[s]=w[s]||function(){(w[s].q=w[s].q||[]).push(arguments)};
    w[s].l=1*new Date();
    var f=d.getElementsByTagName('script')[0],
        j=d.createElement('script');
    j.async=true;
    j.src='https://cdn.tamma.me/pixel/v1/tamtam.min.js';
    f.parentNode.insertBefore(j,f);
  }(window,document,'script','tamtam'));
  tamtam('init', 'tmsk_YOUR_KEY_HERE');
</script>

<!-- In a Vue component: -->
<!-- this.$nextTick(() => window.tamtam('track', 'sign_up')) -->`}
                    />
                  ),
                },
              ]}
            />
          </StepCard>

          {/* Step 2 */}
          <StepCard step={2} title="Configurez votre clé API" description="Get your pixel key from your Tamtam dashboard → Pixel tab.">
            <CodeBlock
              language="js"
              code={`tamtam('init', 'tmsk_abc123...', {
  debug: true,          // logs events to console during development
  autoPageView: true,   // auto-tracks page_view on init (default: true)
  currency: 'XOF',      // default currency for all events
})`}
            />
            <div className="flex items-start gap-3 bg-[rgba(211,84,0,0.08)] border border-[rgba(211,84,0,0.2)] rounded-[10px] px-4 py-3 mt-4">
              <AlertCircle className="w-4 h-4 text-[#F0997B] flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-white/60 font-dm">
                Vos clés commencent toujours par <code className="text-[#F0997B] font-code">tmsk_</code>.
                Ne commitez jamais votre clé dans votre code source.
                Utilisez une variable d&apos;environnement.
              </p>
            </div>
          </StepCard>

          {/* Step 3 */}
          <StepCard step={3} title="Envoyez votre premier événement" description="Three standard events, ready to use:">
            <CodeBlock
              language="js"
              code={`// Page view (auto-tracked — no action needed if autoPageView: true)
tamtam('track', 'page_view')

// Sign up
tamtam('track', 'sign_up', {
  value: 1,
  currency: 'XOF',
  user_id: 'optional-your-internal-id',  // hashed, never PII
})

// Activation (first key action — purchase, first order, etc.)
tamtam('track', 'activation', {
  value: 2500,        // monetary value in XOF if applicable
  currency: 'XOF',
  event_id: 'unique-dedup-id',  // optional — prevents duplicate counting
})`}
            />
            <div className="bg-[rgba(29,158,117,0.08)] border border-[rgba(29,158,117,0.2)] rounded-[10px] p-4 flex items-start gap-3 mt-4">
              <CheckCircle className="w-5 h-5 text-[#1D9E75] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] font-medium text-white mb-1 font-dm">C&apos;est tout.</p>
                <p className="text-[12px] text-white/45 font-dm">
                  Les événements apparaissent dans votre dashboard Tamtam → Pixel → Live Events
                  dans les 30 secondes suivant l&apos;envoi.
                </p>
              </div>
            </div>
          </StepCard>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════
// HOW IT WORKS
// ══════════════════════════════════════════════════
function HowItWorks() {
  return (
    <section className="bg-[#0A0A1A] py-20 sm:py-28 px-5">
      <div className="max-w-5xl mx-auto">
        <p className="font-code text-[11px] text-[#D35400] uppercase tracking-[0.15em] mb-3">Architecture</p>
        <h2 className="text-[28px] sm:text-[36px] font-bold font-syne text-white mb-12">
          Comment ça fonctionne
        </h2>

        {/* Flow diagram */}
        <div className="bg-[#111128] border border-white/[0.07] rounded-2xl p-6 sm:p-10 mb-12 overflow-x-auto scrollbar-hide">
          <div className="flex items-center justify-between min-w-[600px] gap-4">
            {/* Box 1 */}
            <div className="bg-[#0A0A1A] border border-white/[0.07] rounded-xl p-5 w-[180px] text-center shrink-0">
              <p className="text-[11px] font-code text-[#D35400] mb-2">Visitor</p>
              <p className="text-[12px] font-dm text-white/50">Clicks shared link</p>
            </div>
            {/* Arrow */}
            <div className="flex-1 flex items-center">
              <div className="flex-1 h-px bg-gradient-to-r from-[#D35400]/50 to-[#D35400]" />
              <ArrowRight className="w-4 h-4 text-[#D35400] -ml-1" />
            </div>
            {/* Box 2 */}
            <div className="bg-[#0A0A1A] border border-[#D35400]/30 rounded-xl p-5 w-[200px] text-center shrink-0">
              <p className="text-[11px] font-code text-[#D35400] mb-2">Your site</p>
              <code className="text-[10px] font-code text-white/60 block">tamtam(&apos;track&apos;, &apos;sign_up&apos;)</code>
              <p className="text-[10px] font-code text-white/25 mt-2">POST /v1/events</p>
              <p className="text-[10px] font-code text-white/25">X-Tamtam-Key: tmsk_...</p>
            </div>
            {/* Arrow */}
            <div className="flex-1 flex items-center">
              <div className="flex-1 h-px bg-gradient-to-r from-[#D35400]/50 to-[#D35400]" />
              <ArrowRight className="w-4 h-4 text-[#D35400] -ml-1" />
            </div>
            {/* Box 3 */}
            <div className="bg-[#0A0A1A] border border-white/[0.07] rounded-xl p-5 w-[180px] text-center shrink-0">
              <p className="text-[11px] font-code text-[#1D9E75] mb-2">Tamtam servers</p>
              <p className="text-[12px] font-dm text-white/50">Verify + score</p>
              <p className="text-[12px] font-dm text-white/50">Update dashboard</p>
            </div>
          </div>
        </div>

        {/* 3 cards */}
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            {
              icon: Server,
              title: "Server-side verification",
              desc: "Events are validated server-side before recording. IP, device fingerprint, rate limiting — all handled before a single event reaches your dashboard.",
            },
            {
              icon: Link2,
              title: "Attribution automatique",
              desc: "Every Tamtam click appends ?tm_ref=xxx to your URL. The Pixel reads this parameter automatically and links the conversion back to the correct Écho.",
            },
            {
              icon: Shield,
              title: "3-layer fraud protection",
              desc: "Per-key rate limiting (100 req/min). Per-IP rate limiting (200 req/min). Failed auth lockout (10 attempts → 15min block).",
            },
          ].map((card) => (
            <div key={card.title} className="bg-[#111128] border border-white/[0.07] rounded-xl p-6">
              <card.icon className="w-5 h-5 text-[#D35400] mb-4" />
              <h3 className="text-[14px] font-bold font-syne text-white mb-2">{card.title}</h3>
              <p className="text-[12px] font-dm text-white/40 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════
// TM_REF LIFECYCLE
// ══════════════════════════════════════════════════
function TmRefLifecycle() {
  return (
    <section className="bg-[#111128] py-20 sm:py-28 px-5">
      <div className="max-w-3xl mx-auto">
        <p className="font-code text-[11px] text-[#D35400] uppercase tracking-[0.15em] mb-3">Attribution</p>
        <h2 className="text-[28px] sm:text-[36px] font-bold font-syne text-white mb-4">
          Cycle de vie du tm_ref
        </h2>
        <p className="text-[13px] font-dm text-white/45 mb-10 max-w-[520px]">
          Le paramètre <code className="font-code text-[#A5D6FF]">tm_ref</code> est la clé d&apos;attribution de Tamtam.
          Il relie chaque conversion à l&apos;Écho qui a partagé le lien.
        </p>

        {/* 5-step flow */}
        <div className="space-y-4 mb-10">
          {[
            {
              step: "1",
              title: "L'Écho partage un lien",
              desc: "Chaque Écho reçoit un lien unique avec son tm_ref personnel.",
              code: "https://votresite.com?tm_ref=echo_abc123",
            },
            {
              step: "2",
              title: "Le visiteur clique",
              desc: "Le visiteur arrive sur votre site avec le tm_ref dans l'URL.",
              code: "URL bar: votresite.com/signup?tm_ref=echo_abc123",
            },
            {
              step: "3",
              title: "Le Pixel capture le tm_ref",
              desc: "Le SDK JavaScript lit automatiquement le paramètre de l'URL et le persiste en localStorage.",
              code: "tamtam('init', 'tmsk_...') // auto-reads ?tm_ref from URL",
            },
            {
              step: "4",
              title: "Le visiteur convertit",
              desc: "Vous déclenchez un événement — le tm_ref est inclus automatiquement.",
              code: "tamtam('track', 'sign_up') // tm_ref=echo_abc123 attached",
            },
            {
              step: "5",
              title: "Attribution confirmée",
              desc: "Tamtam attribue la conversion au bon Écho et met à jour le dashboard en temps réel.",
              code: "→ Écho abc123 credited · Campaign budget debited",
            },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-[#D35400]/15 flex items-center justify-center shrink-0 mt-1">
                <span className="text-[12px] font-bold font-code text-[#D35400]">{item.step}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-dm font-semibold text-white mb-1">{item.title}</p>
                <p className="text-[12px] font-dm text-white/40 mb-2">{item.desc}</p>
                <code className="text-[11px] font-code text-white/35 bg-[#0D1117] border border-white/[0.05] rounded-lg px-3 py-2 block overflow-x-auto scrollbar-hide">
                  {item.code}
                </code>
              </div>
            </div>
          ))}
        </div>

        {/* Green info box */}
        <div className="bg-[rgba(29,158,117,0.08)] border border-[rgba(29,158,117,0.2)] rounded-[10px] p-4 flex items-start gap-3 mb-10">
          <CheckCircle className="w-5 h-5 text-[#1D9E75] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-medium text-white mb-1 font-dm">Chaque Écho a un tm_ref unique</p>
            <p className="text-[12px] text-white/45 font-dm">
              Deux Échos partageant la même campagne auront des tm_ref différents.
              L&apos;attribution est toujours précise, même si des milliers d&apos;Échos partagent la même campagne.
            </p>
          </div>
        </div>

        {/* Code example: two Échos, different tm_ref */}
        <h3 className="text-[16px] font-bold font-syne text-white mb-4">Exemple : deux Échos, même campagne</h3>
        <CodeBlock
          language="bash"
          filename="Liens partagés par deux Échos différents"
          code={`# Écho A partage la campagne "Promo Été"
https://votresite.com/promo?tm_ref=echo_a_7x9k2

# Écho B partage la même campagne "Promo Été"
https://votresite.com/promo?tm_ref=echo_b_m3p5q

# → Chaque visiteur est attribué à l'Écho qui a partagé le lien
# → Le Pixel lit tm_ref automatiquement, aucun code supplémentaire requis`}
        />
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════
// API REFERENCE
// ══════════════════════════════════════════════════
function ApiReference() {
  return (
    <section id="api" className="bg-[#111128] py-20 sm:py-28 px-5">
      <div className="max-w-3xl mx-auto">
        <p className="font-code text-[11px] text-[#D35400] uppercase tracking-[0.15em] mb-3">Reference</p>
        <h2 className="text-[28px] sm:text-[36px] font-bold font-syne text-white mb-10">API Reference</h2>

        {/* Base URL */}
        <div className="mb-8">
          <h3 className="text-[13px] font-dm font-semibold text-white/60 uppercase tracking-wide mb-3">Base URL</h3>
          <code className="text-[14px] font-code text-[#79C0FF] bg-[#0D1117] px-4 py-2.5 rounded-lg border border-white/[0.07] block">
            https://tamma.me/api/pixel
          </code>
        </div>

        {/* Auth */}
        <div className="mb-12">
          <h3 className="text-[13px] font-dm font-semibold text-white/60 uppercase tracking-wide mb-3">Authentication</h3>
          <code className="text-[13px] font-code text-white/60 bg-[#0D1117] px-4 py-2.5 rounded-lg border border-white/[0.07] block">
            X-Tamtam-Key: tmsk_your_key_here
          </code>
          <p className="text-[12px] font-dm text-white/35 mt-2">
            All requests require this header. Keys are managed in Dashboard → Pixel.
          </p>
        </div>

        {/* Pixel ID vs tm_ref distinction */}
        <div className="bg-[#0D1117] border border-white/[0.07] rounded-xl p-5 mb-12">
          <h3 className="text-[13px] font-dm font-semibold text-white mb-4">Pixel ID vs tm_ref — ne pas confondre</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-[rgba(211,84,0,0.06)] border border-[rgba(211,84,0,0.15)] rounded-lg p-4">
              <code className="text-[12px] font-code text-[#D35400] font-bold">tmsk_...</code>
              <p className="text-[11px] font-dm font-semibold text-white/60 mt-2 mb-1">Pixel ID (clé API)</p>
              <p className="text-[11px] font-dm text-white/35 leading-relaxed">
                Identifie votre compte / pixel. Utilisé dans le header <code className="font-code text-white/45">X-Tamtam-Key</code>.
                Un par pixel, créé dans votre dashboard. Secret — ne jamais exposer côté client.
              </p>
            </div>
            <div className="bg-[rgba(29,158,117,0.06)] border border-[rgba(29,158,117,0.15)] rounded-lg p-4">
              <code className="text-[12px] font-code text-[#1D9E75] font-bold">tm_ref</code>
              <p className="text-[11px] font-dm font-semibold text-white/60 mt-2 mb-1">Paramètre d&apos;attribution</p>
              <p className="text-[11px] font-dm text-white/35 leading-relaxed">
                Identifie quel Écho a référé le visiteur. Auto-ajouté aux URLs quand un Écho partage votre campagne.
                Public — visible dans l&apos;URL. Lu automatiquement par le SDK JS.
              </p>
            </div>
          </div>
        </div>

        {/* Endpoint 1 */}
        <div className="mb-12">
          <EndpointBadge method="POST" path="/api/pixel/event" />
          <p className="text-[13px] font-dm text-white/45 mt-3 mb-6">Track a conversion event.</p>

          {/* Headers table */}
          <h4 className="text-[11px] font-dm font-semibold text-white/40 uppercase tracking-wide mb-3">Request headers</h4>
          <div className="bg-[#0D1117] border border-white/[0.07] rounded-xl p-4 mb-6">
            <ApiParam name="X-Tamtam-Key" type="string" required description="Your pixel API key (tmsk_...)" />
            <ApiParam name="Content-Type" type="string" required description="application/json" />
          </div>

          {/* Body params */}
          <h4 className="text-[11px] font-dm font-semibold text-white/40 uppercase tracking-wide mb-3">Request body</h4>
          <div className="bg-[#0D1117] border border-white/[0.07] rounded-xl p-4 mb-6">
            <ApiParam name="event" type="string" required description="Event name: page_view, sign_up, activation, purchase, or custom" />
            <ApiParam name="tm_ref" type="string" description="Attribution reference from URL param (auto-read by JS SDK)" />
            <ApiParam name="value" type="number" description="Monetary value of the event in XOF" />
            <ApiParam name="currency" type="string" description="Currency code. Default: XOF" />
            <ApiParam name="event_id" type="string" description="Unique ID for deduplication (recommended)" />
            <ApiParam name="user_data" type="object" description="Hashed user identifiers (see Privacy section)" />
          </div>

          {/* Request example */}
          <CodeBlock
            language="bash"
            filename="Request example"
            code={`curl -X POST https://tamma.me/api/pixel/event \\
  -H "X-Tamtam-Key: tmsk_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "event": "sign_up",
    "tm_ref": "abc123xyz",
    "value": 1,
    "currency": "XOF",
    "event_id": "signup_user_456"
  }'`}
          />

          {/* Response */}
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-[11px] font-dm text-[#1D9E75] font-semibold mb-2">Success — 200</p>
              <CodeBlock
                language="json"
                code={`{
  "success": true,
  "event_id": "evt_01HXYZ...",
  "received_at": "2026-05-24T14:30:00.000Z",
  "attribution": {
    "campaign_id": "camp_789",
    "echo_id": "echo_012"
  }
}`}
              />
            </div>
            <div>
              <p className="text-[11px] font-dm text-red-400 font-semibold mb-2">Error — 4xx</p>
              <CodeBlock
                language="json"
                code={`{
  "success": false,
  "error": "INVALID_API_KEY",
  "message": "API key not found or inactive."
}`}
              />
            </div>
          </div>

          {/* Error codes */}
          <h4 className="text-[11px] font-dm font-semibold text-white/40 uppercase tracking-wide mt-8 mb-3">Error codes</h4>
          <div className="bg-[#0D1117] border border-white/[0.07] rounded-xl overflow-hidden">
            <table className="w-full text-[12px] font-dm">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  <th className="text-left px-4 py-2.5 text-white/30 font-semibold">Code</th>
                  <th className="text-left px-4 py-2.5 text-white/30 font-semibold">HTTP</th>
                  <th className="text-left px-4 py-2.5 text-white/30 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="text-white/45">
                {[
                  ["INVALID_API_KEY", "401", "Key missing, malformed, or inactive"],
                  ["RATE_LIMIT_EXCEEDED", "429", "Too many requests — slow down"],
                  ["PAYLOAD_TOO_LARGE", "413", "Request body exceeds 10KB"],
                  ["MISSING_EVENT", "400", "event field is required"],
                  ["CAMPAIGN_NOT_FOUND", "404", "tm_ref doesn't match an active campaign"],
                ].map(([code, http, desc]) => (
                  <tr key={code} className="border-b border-white/[0.03] last:border-b-0">
                    <td className="px-4 py-2.5 font-code text-[#FF7B72]">{code}</td>
                    <td className="px-4 py-2.5 font-code">{http}</td>
                    <td className="px-4 py-2.5">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Endpoint 2 */}
        <div className="mb-12">
          <EndpointBadge method="GET" path="/api/pixel/ping" />
          <p className="text-[13px] font-dm text-white/45 mt-3 mb-4">Test your connection. No authentication required.</p>
          <CodeBlock
            language="bash"
            code={`curl https://tamma.me/api/pixel/ping
# → { "status": "ok", "version": "1.0", "timestamp": "..." }`}
          />
        </div>

        {/* Standard events */}
        <h3 className="text-[13px] font-dm font-semibold text-white/60 uppercase tracking-wide mb-3">Standard events</h3>
        <div className="bg-[#0D1117] border border-white/[0.07] rounded-xl overflow-hidden">
          <table className="w-full text-[12px] font-dm">
            <thead>
              <tr className="border-b border-white/[0.05]">
                <th className="text-left px-4 py-2.5 text-white/30 font-semibold">Event</th>
                <th className="text-left px-4 py-2.5 text-white/30 font-semibold">Description</th>
                <th className="text-left px-4 py-2.5 text-white/30 font-semibold hidden sm:table-cell">Typical use</th>
              </tr>
            </thead>
            <tbody className="text-white/45">
              {[
                ["page_view", "Page was viewed", "Auto-tracked"],
                ["sign_up", "User registered", "After form or OAuth callback"],
                ["activation", "User completed key action", "First purchase, first order"],
                ["purchase", "Monetary transaction", "E-commerce checkout"],
                ["lead", "Contact form submitted", "Lead gen campaigns"],
                ["app_install", "Mobile app installed", "App install campaigns"],
              ].map(([event, desc, use]) => (
                <tr key={event} className="border-b border-white/[0.03] last:border-b-0">
                  <td className="px-4 py-2.5 font-code text-[#A5D6FF]">{event}</td>
                  <td className="px-4 py-2.5">{desc}</td>
                  <td className="px-4 py-2.5 hidden sm:table-cell text-white/30">{use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] font-dm text-white/25 mt-2">
          Custom events supported — use any lowercase snake_case string.
        </p>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════
// CODE EXAMPLES
// ══════════════════════════════════════════════════
function CodeExamples() {
  return (
    <section id="examples" className="bg-[#0A0A1A] py-20 sm:py-28 px-5">
      <div className="max-w-3xl mx-auto">
        <p className="font-code text-[11px] text-[#D35400] uppercase tracking-[0.15em] mb-3">Examples</p>
        <h2 className="text-[28px] sm:text-[36px] font-bold font-syne text-white mb-10">
          Exemples d&apos;intégration
        </h2>

        <TabGroup
          tabs={[
            {
              label: "E-commerce",
              content: (
                <div>
                  <p className="text-[13px] font-dm text-white/45 mb-4">
                    Track purchases on a Senegalese e-commerce site. Fire activation on order confirmation.
                  </p>
                  <CodeBlock
                    language="js"
                    filename="pages/order/confirmation.js"
                    code={`// Fire on page load after successful order
useEffect(() => {
  if (order.status === 'confirmed') {
    window.tamtam('track', 'purchase', {
      value: order.total_xof,
      currency: 'XOF',
      event_id: \`order_\${order.id}\`, // prevents duplicate counting on refresh
    })
  }
}, [order])`}
                  />
                </div>
              ),
            },
            {
              label: "App mobile",
              content: (
                <div>
                  <p className="text-[13px] font-dm text-white/45 mb-4">
                    Track installs and signups from a mobile app. The Pixel works via your backend — no client-side SDK needed.
                  </p>
                  <CodeBlock
                    language="python"
                    filename="tracking.py"
                    code={`import requests
import os

def track_tamtam_event(event_name, tm_ref, value=None):
    response = requests.post(
        'https://tamma.me/api/pixel/event',
        headers={
            'X-Tamtam-Key': os.environ['TAMTAM_PIXEL_KEY'],
            'Content-Type': 'application/json',
        },
        json={
            'event': event_name,
            'tm_ref': tm_ref,
            'value': value,
            'currency': 'XOF',
        }
    )
    return response.json()

# Call on user signup:
track_tamtam_event('sign_up', request.GET.get('tm_ref'), value=1)

# Call on first order:
track_tamtam_event('activation', session.get('tm_ref'), value=order.total)`}
                  />
                </div>
              ),
            },
            {
              label: "Lead gen",
              content: (
                <div>
                  <p className="text-[13px] font-dm text-white/45 mb-4">
                    Track form submissions on a landing page.
                  </p>
                  <CodeBlock
                    language="js"
                    filename="form-handler.js"
                    code={`// Vanilla JS — works on any website or landing page builder
document.getElementById('lead-form').addEventListener('submit', function(e) {
  e.preventDefault()

  // Submit your form first
  submitForm().then(() => {
    // Then fire the Pixel
    tamtam('track', 'lead', {
      value: 1,
      currency: 'XOF',
      event_id: \`lead_\${Date.now()}\`,
    })

    // Redirect to thank you page
    window.location.href = '/merci'
  })
})`}
                  />
                </div>
              ),
            },
            {
              label: "SaaS",
              content: (
                <div>
                  <p className="text-[13px] font-dm text-white/45 mb-4">
                    Track signups and first meaningful action (activation). Recommended: fire activation on first project created or first team invite.
                  </p>
                  <CodeBlock
                    language="ts"
                    filename="app/api/onboarding/complete/route.ts"
                    code={`import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { userId, tmRef } = await req.json()

  // Your onboarding logic here...
  await completeOnboarding(userId)

  // Fire Pixel server-side
  await fetch('https://tamma.me/api/pixel/event', {
    method: 'POST',
    headers: {
      'X-Tamtam-Key': process.env.TAMTAM_PIXEL_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event: 'activation',
      tm_ref: tmRef,
      value: 1,
      currency: 'XOF',
      event_id: \`activation_\${userId}\`,
    }),
  })

  return NextResponse.json({ success: true })
}`}
                  />
                </div>
              ),
            },
            {
              label: "React Native",
              content: (
                <div>
                  <p className="text-[13px] font-dm text-white/45 mb-4">
                    Capture le tm_ref depuis un deep link et persiste-le avec AsyncStorage pour l&apos;attribution post-install.
                  </p>
                  <CodeBlock
                    language="ts"
                    filename="utils/tamtam.ts"
                    code={`import { Linking } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

// On app launch — capture tm_ref from deep link
export async function captureTmRef() {
  const url = await Linking.getInitialURL()
  if (url) {
    const tmRef = new URL(url).searchParams.get('tm_ref')
    if (tmRef) {
      await AsyncStorage.setItem('tm_ref', tmRef)
      await AsyncStorage.setItem('tm_ref_ts', Date.now().toString())
    }
  }
}

// On conversion — send event with stored tm_ref
export async function trackTamtam(event: string, value?: number) {
  const tmRef = await AsyncStorage.getItem('tm_ref')
  const ts = parseInt((await AsyncStorage.getItem('tm_ref_ts')) || '0')
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000

  // Expire after 7 days
  if (!tmRef || Date.now() - ts > SEVEN_DAYS) return

  await fetch('https://tamma.me/api/pixel/event', {
    method: 'POST',
    headers: {
      'X-Tamtam-Key': 'tmsk_your_key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event,
      tm_ref: tmRef,
      value,
      currency: 'XOF',
    }),
  })
}

// Usage:
// captureTmRef()          — call in App.tsx useEffect
// trackTamtam('sign_up')  — call after registration`}
                  />
                </div>
              ),
            },
            {
              label: "Mobile Web",
              content: (
                <div>
                  <p className="text-[13px] font-dm text-white/45 mb-4">
                    Sur mobile web, persistez le tm_ref en localStorage avec une fenêtre de 7 jours pour gérer les navigations entre pages.
                  </p>
                  <CodeBlock
                    language="js"
                    filename="tm-ref-persist.js"
                    code={`// Run on every page load — persist tm_ref across navigations
(function() {
  const params = new URLSearchParams(window.location.search)
  const tmRef = params.get('tm_ref')

  if (tmRef) {
    localStorage.setItem('tm_ref', tmRef)
    localStorage.setItem('tm_ref_ts', Date.now().toString())
  }
})()

// Helper: read stored tm_ref with 7-day expiry
function getTmRef() {
  const ref = localStorage.getItem('tm_ref')
  const ts = parseInt(localStorage.getItem('tm_ref_ts') || '0')
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000

  if (ref && Date.now() - ts < SEVEN_DAYS) return ref

  // Expired — clean up
  localStorage.removeItem('tm_ref')
  localStorage.removeItem('tm_ref_ts')
  return null
}

// On conversion, pass tm_ref explicitly
tamtam('track', 'sign_up', {
  tm_ref: getTmRef(),
  value: 1,
})`}
                  />
                  <div className="flex items-start gap-3 bg-[rgba(211,84,0,0.08)] border border-[rgba(211,84,0,0.2)] rounded-[10px] px-4 py-3 mt-4">
                    <AlertCircle className="w-4 h-4 text-[#F0997B] flex-shrink-0 mt-0.5" />
                    <p className="text-[12px] text-white/60 font-dm">
                      Le SDK JS gère déjà cette persistence automatiquement sur desktop.
                      Ce pattern est utile pour les PWA ou sites mobile sans le SDK JS.
                    </p>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════
// TESTING
// ══════════════════════════════════════════════════
function Testing() {
  return (
    <section className="bg-[#111128] py-20 sm:py-28 px-5">
      <div className="max-w-3xl mx-auto">
        <p className="font-code text-[11px] text-[#D35400] uppercase tracking-[0.15em] mb-3">Debug</p>
        <h2 className="text-[28px] sm:text-[36px] font-bold font-syne text-white mb-10">
          Tester votre intégration
        </h2>

        {/* Step-by-step */}
        <div className="space-y-4 mb-12">
          {[
            {
              step: "1",
              title: "Enable debug mode",
              code: "tamtam('init', 'tmsk_your_key', { debug: true })",
            },
            {
              step: "2",
              title: "Open browser console — you'll see:",
              code: `[Tamtam Pixel] Initialized · key: tmsk_abc...
[Tamtam Pixel] Event queued: sign_up
[Tamtam Pixel] Event sent ✓ · 47ms · evt_01HXY...`,
            },
            {
              step: "3",
              title: "Check Live Events in your dashboard",
              code: "Dashboard → Pixel → [your pixel] → Live Events tab\nEvents appear within 30 seconds.",
            },
            {
              step: "4",
              title: "Verify attribution",
              code: `Click a real Tamtam campaign link (URL has ?tm_ref=xxx)
Then trigger the event on your site.
Check: Dashboard → Pixel → Conversions`,
            },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-4">
              <div className="w-7 h-7 rounded-lg bg-[#D35400]/15 flex items-center justify-center shrink-0 mt-1">
                <span className="text-[11px] font-bold font-code text-[#D35400]">{item.step}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-dm font-semibold text-white mb-2">{item.title}</p>
                <code className="text-[11px] font-code text-white/40 bg-[#0D1117] border border-white/[0.05] rounded-lg px-3 py-2 block whitespace-pre overflow-x-auto scrollbar-hide">
                  {item.code}
                </code>
              </div>
            </div>
          ))}
        </div>

        {/* Common issues */}
        <h3 className="text-[16px] font-bold font-syne text-white mb-6">Common issues</h3>
        <div className="space-y-3 mb-12">
          {[
            {
              q: "Event sent but not appearing in dashboard",
              a: "Check that your pixel key is active in Dashboard → Pixel. Inactive keys return 200 but events are silently dropped.",
            },
            {
              q: "RATE_LIMIT_EXCEEDED on first request",
              a: "Your IP may have been flagged. Wait 15 minutes. If persistent, contact contact@tamma.me with your pixel ID.",
            },
            {
              q: "Attribution showing null",
              a: "The tm_ref param must be present in the URL when the page loads. Check that your redirect preserves query parameters. Example: yoursite.com/signup?tm_ref=abc123 ✓",
            },
            {
              q: "Events duplicating on page refresh",
              a: "Use event_id with a stable unique value (order ID, user ID). Tamtam deduplicates events with the same event_id within 24h.",
            },
          ].map((item) => (
            <div key={item.q} className="bg-[#0A0A1A] border border-white/[0.07] rounded-xl p-4">
              <p className="text-[13px] font-dm font-semibold text-white mb-1">{item.q}</p>
              <p className="text-[12px] font-dm text-white/40">{item.a}</p>
            </div>
          ))}
        </div>

        {/* curl test */}
        <h3 className="text-[16px] font-bold font-syne text-white mb-4">Test with curl</h3>
        <CodeBlock
          language="bash"
          code={`# 1. Ping — no key needed
curl https://tamma.me/api/pixel/ping

# 2. Send a test event
curl -X POST https://tamma.me/api/pixel/event \\
  -H "X-Tamtam-Key: tmsk_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"event": "sign_up", "value": 1, "currency": "XOF"}'

# 3. Expected response:
# {"success":true,"event_id":"evt_...","received_at":"..."}`}
        />

        {/* Latency benchmarks */}
        <h3 className="text-[16px] font-bold font-syne text-white mt-12 mb-4">Latency benchmarks</h3>
        <div className="bg-[#0D1117] border border-white/[0.07] rounded-xl overflow-hidden mb-4">
          <table className="w-full text-[12px] font-dm">
            <thead>
              <tr className="border-b border-white/[0.05]">
                <th className="text-left px-4 py-2.5 text-white/30 font-semibold">Endpoint</th>
                <th className="text-left px-4 py-2.5 text-white/30 font-semibold">p50</th>
                <th className="text-left px-4 py-2.5 text-white/30 font-semibold">p95</th>
                <th className="text-left px-4 py-2.5 text-white/30 font-semibold">p99</th>
              </tr>
            </thead>
            <tbody className="text-white/45">
              <tr className="border-b border-white/[0.03]">
                <td className="px-4 py-2.5 font-code text-[#A5D6FF]">POST /api/pixel/event</td>
                <td className="px-4 py-2.5 font-code">45ms</td>
                <td className="px-4 py-2.5 font-code">120ms</td>
                <td className="px-4 py-2.5 font-code">280ms</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-code text-[#A5D6FF]">GET /api/pixel/ping</td>
                <td className="px-4 py-2.5 font-code">12ms</td>
                <td className="px-4 py-2.5 font-code">35ms</td>
                <td className="px-4 py-2.5 font-code">80ms</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="bg-[rgba(29,158,117,0.08)] border border-[rgba(29,158,117,0.2)] rounded-[10px] p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-[#1D9E75] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-medium text-white mb-1 font-dm">Async &amp; non-bloquant</p>
            <p className="text-[12px] text-white/45 font-dm">
              Le SDK JS envoie les événements en arrière-plan via <code className="font-code text-white/55">navigator.sendBeacon</code> ou <code className="font-code text-white/55">fetch</code> asynchrone.
              Le tracking n&apos;impacte jamais les performances de votre site — aucun rendu bloqué, aucun délai visible pour l&apos;utilisateur.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════
// PRIVACY
// ══════════════════════════════════════════════════
function Privacy() {
  return (
    <section className="bg-[#0A0A1A] py-20 sm:py-28 px-5">
      <div className="max-w-5xl mx-auto">
        <p className="font-code text-[11px] text-[#D35400] uppercase tracking-[0.15em] mb-3">Data</p>
        <h2 className="text-[28px] sm:text-[36px] font-bold font-syne text-white mb-10">
          Privacy & données
        </h2>

        <div className="grid sm:grid-cols-3 gap-5">
          <div className="bg-[#111128] border border-white/[0.07] rounded-xl p-6">
            <h3 className="text-[14px] font-bold font-syne text-white mb-4">What we collect</h3>
            <div className="text-[12px] font-dm text-white/40 leading-relaxed space-y-3">
              <div>
                <p className="text-white/55 font-semibold mb-1">The Pixel collects:</p>
                <p>· The event name and value you send</p>
                <p>· The tm_ref attribution parameter</p>
                <p>· IP address (anonymized after 30 days)</p>
                <p>· User agent / device fingerprint (fraud scoring only)</p>
              </div>
              <div>
                <p className="text-white/55 font-semibold mb-1">The Pixel never collects:</p>
                <p>· Email addresses</p>
                <p>· Names or personal identifiers</p>
                <p>· Payment information</p>
              </div>
            </div>
          </div>

          <div className="bg-[#111128] border border-white/[0.07] rounded-xl p-6">
            <h3 className="text-[14px] font-bold font-syne text-white mb-4">PII handling</h3>
            <p className="text-[12px] font-dm text-white/40 leading-relaxed mb-3">
              If you pass user_data, hash it first:
            </p>
            <CodeBlock
              language="js"
              code={`tamtam('track', 'sign_up', {
  user_data: {
    email_hash: sha256('user@example.com'),
    phone_hash: sha256('+221771234567'),
  }
})`}
            />
            <p className="text-[11px] font-dm text-white/30 mt-3">
              Plain-text PII is stripped server-side before storage.
              Never pass raw emails, names, or phone numbers.
            </p>
          </div>

          <div className="bg-[#111128] border border-white/[0.07] rounded-xl p-6">
            <h3 className="text-[14px] font-bold font-syne text-white mb-4">Loi 2008-12 / GDPR</h3>
            <p className="text-[12px] font-dm text-white/40 leading-relaxed">
              Tamtam is compliant with Senegal&apos;s loi 2008-12 on personal data protection (CDP Sénégal).
            </p>
            <p className="text-[12px] font-dm text-white/40 leading-relaxed mt-3">
              For EU visitors, the Pixel qualifies as a necessary analytics cookie — no consent banner required for basic click tracking.
            </p>
            <Link href="/privacy" className="text-[12px] font-dm text-[#D35400] hover:underline mt-3 block">
              Full privacy policy →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════
// FAQ
// ══════════════════════════════════════════════════
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.06] last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-5 text-left"
      >
        <span className="text-[14px] font-dm font-semibold text-white pr-4">{q}</span>
        <ChevronDown className={`w-4 h-4 text-white/30 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <p className="text-[13px] font-dm text-white/40 leading-relaxed pb-5 pr-8">
          {a}
        </p>
      )}
    </div>
  );
}

function DevFaq() {
  const faqs = [
    {
      q: "Le Pixel fonctionne-t-il côté serveur ou côté client ?",
      a: "Les deux. Le SDK JavaScript fonctionne côté client (browser). Pour une précision maximale (no adblockers), utilisez le tracking server-side via l'API REST directement depuis votre backend.",
    },
    {
      q: "Comment gérer le consentement cookies ?",
      a: "Le Pixel de base (page_view) ne nécessite pas de consentement explicite en droit sénégalais. Pour les événements de conversion, attendez le consentement utilisateur avant d'appeler tamtam('track', ...).",
    },
    {
      q: "Peut-on utiliser un seul Pixel pour plusieurs domaines ?",
      a: "Oui. Créez un Pixel par campagne (pas par domaine) depuis votre dashboard. Un même key peut tracker plusieurs sous-domaines.",
    },
    {
      q: "Quel est le SLA de l'API ?",
      a: "L'endpoint /api/pixel/event cible un p95 < 200ms. Les événements apparaissent dans le dashboard en < 30s. Status page : status.tamma.me (à venir).",
    },
    {
      q: "Est-ce que le Pixel fonctionne avec un ad blocker ?",
      a: "Les ad blockers peuvent bloquer le SDK JavaScript. Pour les conversions critiques (sign_up, purchase), utilisez le tracking server-side — il n'est pas affecté par les ad blockers.",
    },
    {
      q: "Comment supprimer des événements de test ?",
      a: "Dans Dashboard → Pixel → [votre pixel] → Settings, activez \"Mode test\" pour marquer les événements comme test. Les événements test sont exclus des métriques de campagne.",
    },
    {
      q: "Est-ce que chaque Écho a un tm_ref unique ?",
      a: "Oui. Le tm_ref est unique par Écho et par campagne. Si deux Échos partagent la même campagne, chaque visiteur arrivera avec un tm_ref différent, permettant une attribution précise au bon Écho. Le tm_ref est généré automatiquement par Tamtam — vous n'avez rien à configurer.",
    },
    {
      q: "Comment conserver le tm_ref sur mobile ?",
      a: "Sur mobile web, le SDK JS persiste automatiquement le tm_ref en localStorage avec une fenêtre de 7 jours. Sur React Native, capturez le tm_ref depuis le deep link initial avec Linking.getInitialURL() et stockez-le via AsyncStorage. Pour les PWA sans SDK JS, utilisez le pattern localStorage décrit dans la section Exemples → Mobile Web.",
    },
  ];

  return (
    <section id="faq" className="bg-[#111128] py-20 sm:py-28 px-5">
      <div className="max-w-3xl mx-auto">
        <p className="font-code text-[11px] text-[#D35400] uppercase tracking-[0.15em] mb-3">FAQ</p>
        <h2 className="text-[28px] sm:text-[36px] font-bold font-syne text-white mb-10">
          Questions fréquentes
        </h2>
        <div className="bg-[#0A0A1A] border border-white/[0.07] rounded-2xl px-6">
          {faqs.map((faq) => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════
// FINAL CTA
// ══════════════════════════════════════════════════
function FinalCta() {
  return (
    <section className="bg-[#0A0A1A] py-20 sm:py-28 px-5">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-[28px] sm:text-[32px] font-bold font-syne text-white mb-10">
          Prêt à intégrer ?
        </h2>

        <div className="grid sm:grid-cols-3 gap-5 text-left">
          <div className="bg-[#111128] border border-white/[0.07] rounded-xl p-6">
            <Key className="w-5 h-5 text-[#D35400] mb-4" />
            <h3 className="text-[14px] font-bold font-syne text-white mb-2">Obtenez votre clé API</h3>
            <p className="text-[12px] font-dm text-white/40 leading-relaxed mb-5">
              Créez votre compte Tamtam et générez votre première clé Pixel en 2 minutes.
            </p>
            <Link
              href="/signup/brand"
              className="inline-flex items-center gap-2 bg-[#D35400] text-white font-dm font-semibold text-[12px] px-4 py-2 rounded-lg hover:bg-[#B94700] transition-colors"
            >
              Créer un compte <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-[#111128] border border-white/[0.07] rounded-xl p-6">
            <Terminal className="w-5 h-5 text-[#D35400] mb-4" />
            <h3 className="text-[14px] font-bold font-syne text-white mb-2">Accédez à votre dashboard</h3>
            <p className="text-[12px] font-dm text-white/40 leading-relaxed mb-5">
              Gérez vos Pixels, consultez vos événements en temps réel.
            </p>
            <Link
              href="/login?tab=batteur"
              className="inline-flex items-center gap-2 border border-white/[0.12] text-white/60 font-dm font-semibold text-[12px] px-4 py-2 rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              Dashboard <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-[#111128] border border-white/[0.07] rounded-xl p-6">
            <MessageCircle className="w-5 h-5 text-[#D35400] mb-4" />
            <h3 className="text-[14px] font-bold font-syne text-white mb-2">Une question technique ?</h3>
            <p className="text-[12px] font-dm text-white/40 leading-relaxed mb-5">
              Notre équipe répond en moins de 24h pour vous accompagner dans l&apos;intégration.
            </p>
            <a
              href="mailto:contact@tamma.me"
              className="inline-flex items-center gap-2 border border-white/[0.12] text-white/60 font-dm font-semibold text-[12px] px-4 py-2 rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              Nous contacter <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════
// CHANGELOG
// ══════════════════════════════════════════════════
function Changelog() {
  const [open, setOpen] = useState(false);
  return (
    <section className="bg-[#111128] py-12 px-5 border-t border-white/[0.07]">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-3 text-left w-full"
        >
          <span className="text-[13px] font-dm font-semibold text-white/50">Pixel API — Changelog</span>
          <ChevronDown className={`w-4 h-4 text-white/25 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="mt-6 space-y-6">
            <div>
              <p className="text-[12px] font-dm font-semibold text-white/60 mb-2">v1.1 — Mai 2026</p>
              <div className="text-[11px] font-code text-white/35 space-y-1">
                <p><span className="text-[#1D9E75]">+</span> Endpoint /api/pixel/ping</p>
                <p><span className="text-[#1D9E75]">+</span> event_id deduplication (24h window)</p>
                <p><span className="text-[#1D9E75]">+</span> debug mode in JS SDK</p>
                <p><span className="text-[#F39C12]">~</span> Rate limit increased: 100 → 200 req/min per IP</p>
              </div>
            </div>
            <div>
              <p className="text-[12px] font-dm font-semibold text-white/60 mb-2">v1.0 — Avril 2026</p>
              <div className="text-[11px] font-code text-white/35 space-y-1">
                <p><span className="text-[#1D9E75]">+</span> Initial release</p>
                <p><span className="text-[#1D9E75]">+</span> Events: page_view, sign_up, activation, purchase</p>
                <p><span className="text-[#1D9E75]">+</span> JS SDK (2KB gzipped)</p>
                <p><span className="text-[#1D9E75]">+</span> Server-side API</p>
                <p><span className="text-[#1D9E75]">+</span> 3-layer fraud protection</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════
// FOOTER
// ══════════════════════════════════════════════════
function DevFooter() {
  return (
    <footer className="bg-[#0A0A1A] border-t border-white/[0.07] py-8 px-5">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Image src="/brand/tamtam-horizontal-orange.png" alt="Tamtam" width={80} height={21} className="h-5 w-auto" />
          <span className="text-[11px] font-dm text-white/20">Pandorus &middot; Dakar, Sénégal</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/terms" className="text-[11px] font-dm text-white/25 hover:text-white/40 transition-colors">CGU</Link>
          <Link href="/privacy" className="text-[11px] font-dm text-white/25 hover:text-white/40 transition-colors">Confidentialité</Link>
          <Link href="/a-propos" className="text-[11px] font-dm text-white/25 hover:text-white/40 transition-colors">À propos</Link>
          <a href="mailto:contact@tamma.me" className="text-[11px] font-dm text-white/25 hover:text-white/40 transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  );
}

// ══════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════
export default function DevelopersPage() {
  return (
    <div className="min-h-screen bg-[#0A0A1A]">
      <DevNav />
      <Hero />
      <QuickStart />
      <HowItWorks />
      <TmRefLifecycle />
      <ApiReference />
      <CodeExamples />
      <Testing />
      <Privacy />
      <DevFaq />
      <FinalCta />
      <Changelog />
      <DevFooter />
    </div>
  );
}
