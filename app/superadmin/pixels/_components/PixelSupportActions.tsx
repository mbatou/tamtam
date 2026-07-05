"use client";

import { useState } from "react";
import {
  Copy,
  Check,
  Terminal,
  ExternalLink,
  BookOpen,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { cn } from "./helpers";
import type { PixelRow } from "./types";

export default function PixelSupportActions({ pixel }: { pixel: PixelRow }) {
  const [copied, setCopied] = useState<string | null>(null);

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const testCurl = `curl -X POST https://tamma.me/api/v1/conversions \\
  -H "X-Tamtam-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"event":"test","value":1,"currency":"XOF","event_id":"test_${Date.now()}"}'`;

  const issues: { type: "error" | "warn"; msg: string }[] = [];
  if (!pixel.is_active)
    issues.push({
      type: "error",
      msg: "Pixel désactivé — réactiver depuis le dashboard marque",
    });
  if (pixel.test_count === 0)
    issues.push({
      type: "warn",
      msg: "Pixel jamais testé — envoyer la commande cURL au développeur",
    });
  if (pixel.last_conversion_at) {
    const daysSince = Math.floor(
      (Date.now() - new Date(pixel.last_conversion_at).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (daysSince > 7)
      issues.push({
        type: "warn",
        msg: `Aucun événement depuis ${daysSince} jours — vérifier l'intégration`,
      });
  }
  if (pixel.last_test_latency_ms && pixel.last_test_latency_ms > 400)
    issues.push({
      type: "warn",
      msg: `Latence élevée (${pixel.last_test_latency_ms}ms)`,
    });

  return (
    <div className="bg-[#111128] rounded-[12px] p-4">
      <p className="text-[12px] font-medium text-white/50 mb-3">
        Actions support
      </p>
      <div className="flex flex-col gap-2">
        <button
          onClick={() => copyText(pixel.pixel_id, "pixelId")}
          className="flex items-center gap-3 w-full p-3 bg-white/[0.03] border border-white/[0.06] rounded-[10px] hover:border-white/[0.12] transition-all text-left"
        >
          <Copy className="w-4 h-4 text-white/30 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-white/70">
              Copier le Pixel ID
            </p>
            <p className="text-[10px] font-mono text-white/25 truncate">
              {pixel.pixel_id}
            </p>
          </div>
          {copied === "pixelId" && (
            <Check className="w-3.5 h-3.5 text-[#1D9E75] flex-shrink-0" />
          )}
        </button>

        <button
          onClick={() => copyText(testCurl, "curl")}
          className="flex items-center gap-3 w-full p-3 bg-white/[0.03] border border-white/[0.06] rounded-[10px] hover:border-white/[0.12] transition-all text-left"
        >
          <Terminal className="w-4 h-4 text-white/30 flex-shrink-0" />
          <div>
            <p className="text-[12px] font-medium text-white/70">
              Copier la commande de test
            </p>
            <p className="text-[10px] text-white/25">
              cURL prêt à envoyer au développeur
            </p>
          </div>
          {copied === "curl" && (
            <Check className="w-3.5 h-3.5 text-[#1D9E75] flex-shrink-0" />
          )}
        </button>

        {pixel.brand && (
          <a
            href={`/superadmin/crm`}
            className="flex items-center gap-3 w-full p-3 bg-white/[0.03] border border-white/[0.06] rounded-[10px] hover:border-white/[0.12] transition-all"
          >
            <ExternalLink className="w-4 h-4 text-white/30 flex-shrink-0" />
            <p className="text-[12px] font-medium text-white/70">
              Voir le compte marque
            </p>
          </a>
        )}

        <a
          href="/developers"
          target="_blank"
          className="flex items-center gap-3 w-full p-3 bg-white/[0.03] border border-white/[0.06] rounded-[10px] hover:border-white/[0.12] transition-all"
        >
          <BookOpen className="w-4 h-4 text-white/30 flex-shrink-0" />
          <p className="text-[12px] font-medium text-white/70">
            Documentation Pixel
          </p>
        </a>

        {/* Diagnosis */}
        <div className="mt-1 p-3 bg-[#0A0A1A] rounded-[10px]">
          <p className="text-[11px] font-medium text-white/40 mb-2">
            Diagnostic automatique
          </p>
          {issues.length === 0 ? (
            <p className="text-[11px] text-[#5DCAA5] flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              Tout semble bon
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {issues.map((issue, i) => (
                <p
                  key={i}
                  className={cn(
                    "text-[11px] flex items-start gap-1.5",
                    issue.type === "error"
                      ? "text-[#F09595]"
                      : "text-[#F0997B]"
                  )}
                >
                  {issue.type === "error" ? (
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  )}
                  {issue.msg}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
