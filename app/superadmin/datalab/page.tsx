"use client";

import { useEffect, useState } from "react";
import type { DataLabData, WebAnalyticsData, AIAnalysis } from "./types";
import { AIAnalysisSection } from "./components/AIAnalysisSection";
import { SuggestionsSection } from "./components/SuggestionsSection";
import { EchoFunnelCard } from "./components/EchoFunnelCard";
import { EchoLifecycleCard } from "./components/EchoLifecycleCard";
import { BrandFunnelCard } from "./components/BrandFunnelCard";
import { HeatmapCard } from "./components/HeatmapCard";
import { CityPerformanceCard } from "./components/CityPerformanceCard";
import { WebAnalyticsCard } from "./components/WebAnalyticsCard";
import { RetentionCohortsCard } from "./components/RetentionCohortsCard";
import { InterestsTab } from "./components/InterestsTab";

export default function DataLabPage() {
  const [data, setData] = useState<DataLabData | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [webAnalytics, setWebAnalytics] = useState<WebAnalyticsData | null>(null);
  const [loadingWeb, setLoadingWeb] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "interests">("overview");

  useEffect(() => {
    fetch("/api/superadmin/datalab").then(r => r.json()).then(d => { setData(d); setLoading(false); });
    fetch("/api/superadmin/datalab/web-analytics")
      .then(r => r.json())
      .then(d => { setWebAnalytics(d); setLoadingWeb(false); })
      .catch(() => setLoadingWeb(false));
  }, []);

  const handleAnalyze = async () => {
    if (!data) return;
    setAnalyzing(true);
    setAiError(null);
    try {
      // Fetch interest data for AI context
      let interestData = null;
      try {
        const intRes = await fetch("/api/superadmin/datalab/interests");
        if (intRes.ok) interestData = await intRes.json();
      } catch {}

      const res = await fetch("/api/superadmin/datalab/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metrics: {
            echoFunnel: data.echoFunnel,
            echoLifecycle: data.echoLifecycle,
            brandFunnel: data.brandFunnel,
            heatmap: data.heatmap,
            cityStats: data.cityStats,
            campaignStats: data.campaignStats,
            cohorts: data.cohorts,
            suggestions: data.suggestions,
            webAnalytics: webAnalytics?.error ? null : webAnalytics,
            interestData,
          },
        }),
      });
      const result = await res.json();
      if (result.error) {
        setAiError(result.error);
      } else {
        setAiAnalysis(result.analysis);
      }
    } catch {
      setAiError("AI connection error");
    }
    setAnalyzing(false);
  };

  if (loading || !data) {
    return (
      <div className="p-6 space-y-4">
        <div className="skeleton h-8 w-64 rounded-xl" />
        <div className="skeleton h-32 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-4">{"\u{1F52C}"} Data Lab</h1>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 bg-gray-800/50 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === "overview" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("interests")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === "interests" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          Interests
        </button>
      </div>

      {activeTab === "interests" ? (
        <InterestsTab />
      ) : (
      <>

      <AIAnalysisSection
        aiAnalysis={aiAnalysis}
        analyzing={analyzing}
        aiError={aiError}
        onAnalyze={handleAnalyze}
      />

      <SuggestionsSection suggestions={data.suggestions} />

      <EchoFunnelCard echoFunnel={data.echoFunnel} />

      <EchoLifecycleCard echoLifecycle={data.echoLifecycle} />

      <BrandFunnelCard brandFunnel={data.brandFunnel} />

      <HeatmapCard heatmap={data.heatmap} />

      <CityPerformanceCard cityStats={data.cityStats} />

      <WebAnalyticsCard webAnalytics={webAnalytics} loading={loadingWeb} />

      <RetentionCohortsCard cohorts={data.cohorts} />

      </>
      )}
    </div>
  );
}
