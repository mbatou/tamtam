"use client";

import { CheckCircle } from "lucide-react";
import CodeBlock from "@/components/developers/CodeBlock";
import { useTranslation } from "@/lib/i18n";

export default function Testing() {
  const { t } = useTranslation();
  return (
    <section className="bg-[#111128] py-20 sm:py-28 px-5">
      <div className="max-w-3xl mx-auto">
        <p className="font-code text-[11px] text-[#D35400] uppercase tracking-[0.15em] mb-3">{t("developers.testing.sectionLabel")}</p>
        <h2 className="text-[28px] sm:text-[36px] font-bold font-syne text-white mb-10">
          {t("developers.testing.title")}
        </h2>

        {/* Step-by-step */}
        <div className="space-y-4 mb-12">
          {[
            {
              step: "1",
              title: t("developers.testing.step1Title"),
              code: "tamtam('init', 'tmsk_your_key', { debug: true })",
            },
            {
              step: "2",
              title: t("developers.testing.step2Title"),
              code: `[Tamtam Pixel] Initialized · key: tmsk_abc...
[Tamtam Pixel] Event queued: sign_up
[Tamtam Pixel] Event sent ✓ · 47ms · evt_01HXY...`,
            },
            {
              step: "3",
              title: t("developers.testing.step3Title"),
              code: "Dashboard → Pixel → [your pixel] → Live Events tab\nEvents appear within 30 seconds.",
            },
            {
              step: "4",
              title: t("developers.testing.step4Title"),
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
        <h3 className="text-[16px] font-bold font-syne text-white mb-6">{t("developers.testing.commonIssuesTitle")}</h3>
        <div className="space-y-3 mb-12">
          {[
            { q: t("developers.testing.issue1Q"), a: t("developers.testing.issue1A") },
            { q: t("developers.testing.issue2Q"), a: t("developers.testing.issue2A") },
            { q: t("developers.testing.issue3Q"), a: t("developers.testing.issue3A") },
            { q: t("developers.testing.issue4Q"), a: t("developers.testing.issue4A") },
          ].map((item) => (
            <div key={item.q} className="bg-[#0A0A1A] border border-white/[0.07] rounded-xl p-4">
              <p className="text-[13px] font-dm font-semibold text-white mb-1">{item.q}</p>
              <p className="text-[12px] font-dm text-white/40">{item.a}</p>
            </div>
          ))}
        </div>

        {/* curl test */}
        <h3 className="text-[16px] font-bold font-syne text-white mb-4">{t("developers.testing.curlTitle")}</h3>
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
        <h3 className="text-[16px] font-bold font-syne text-white mt-12 mb-4">{t("developers.testing.benchmarksTitle")}</h3>
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
            <p className="text-[13px] font-medium text-white mb-1 font-dm">{t("developers.testing.benchmarkNote")}</p>
            <p className="text-[12px] text-white/45 font-dm">
              {t("developers.testing.benchmarkNoteDesc")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
