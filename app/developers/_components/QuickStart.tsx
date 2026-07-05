"use client";

import { AlertCircle, CheckCircle } from "lucide-react";
import CodeBlock from "@/components/developers/CodeBlock";
import TabGroup from "@/components/developers/TabGroup";
import StepCard from "@/components/developers/StepCard";
import { useTranslation } from "@/lib/i18n";

export default function QuickStart() {
  const { t } = useTranslation();
  return (
    <section id="quickstart" className="bg-[#111128] py-20 sm:py-28 px-5">
      <div className="max-w-3xl mx-auto">
        <p className="font-code text-[11px] text-[#D35400] uppercase tracking-[0.15em] mb-3">{t("developers.quickstart.sectionLabel")}</p>
        <h2 className="text-[28px] sm:text-[36px] font-bold font-syne text-white mb-12">
          {t("developers.quickstart.title")}
        </h2>

        <div className="space-y-16">
          {/* Step 1 */}
          <StepCard step={1} title={t("developers.quickstart.step1Title")} description={t("developers.quickstart.step1Desc")}>
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
          <StepCard step={2} title={t("developers.quickstart.step2Title")} description={t("developers.quickstart.step2Desc")}>
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
                {t("developers.quickstart.step2Warning")}
              </p>
            </div>
          </StepCard>

          {/* Step 3 */}
          <StepCard step={3} title={t("developers.quickstart.step3Title")} description={t("developers.quickstart.step3Desc")}>
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
                <p className="text-[13px] font-medium text-white mb-1 font-dm">{t("developers.quickstart.step3Done")}</p>
                <p className="text-[12px] text-white/45 font-dm">
                  {t("developers.quickstart.step3DoneDesc")}
                </p>
              </div>
            </div>
          </StepCard>
        </div>
      </div>
    </section>
  );
}
