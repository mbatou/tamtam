"use client";

import { Fragment, useEffect, useState } from "react";

interface Suggestion {
  severity: "red" | "yellow" | "green";
  text: string;
}

interface CityStats {
  city: string;
  echoCount: number;
  totalClicks: number;
  validClicks: number;
  validRate: number;
  clicksPerEcho: number;
}

interface Cohort {
  week: string;
  registered: number;
  activeNow: number;
  retentionRate: number;
}

interface DataLabData {
  echoFunnel: {
    registered: number;
    acceptedCampaign: number;
    generatedClick: number;
    withdrew: number;
    activeWeek: number;
  };
  echoLifecycle: {
    new: number;
    active: number;
    dormant: number;
    churned: number;
    neverActive: number;
  };
  brandFunnel: {
    registered: number;
    recharged: number;
    launchedCampaign: number;
    repeatCampaign: number;
  };
  heatmap: number[][];
  cityStats: CityStats[];
  campaignStats: {
    avgBudget: number;
    avgCPC: number;
    totalCampaigns: number;
    completedCampaigns: number;
  };
  cohorts: Cohort[];
  suggestions: Suggestion[];
}

interface AIInsight {
  severity: "red" | "yellow" | "green";
  title: string;
  observation: string;
  psychology: string;
  law: string;
  action: string;
  impact: string;
}

interface AIAnalysis {
  insights: AIInsight[];
  summary: string;
  topPriority: string;
}

const LAW_ICONS: Record<string, string> = {
  "Peak-End Rule": "\u{1F3D4}\uFE0F",
  "Idleness Aversion": "\u23F3",
  "Goal-Gradient": "\u{1F3AF}",
  "Glass Box": "\u{1F50D}",
  "Uncertainty Reduction": "\u{1F6E1}\uFE0F",
  "Uber: Activation": "\u{1F680}",
  "Uber: Retention": "\u{1F504}",
  "Uber: Power Users": "\u26A1",
  "Uber: Churn": "\u{1F4C9}",
};

const LAW_COLORS: Record<string, string> = {
  "Peak-End Rule": "border-purple-500/30 bg-purple-500/5",
  "Idleness Aversion": "border-blue-500/30 bg-blue-500/5",
  "Goal-Gradient": "border-teal-500/30 bg-teal-500/5",
  "Glass Box": "border-cyan-500/30 bg-cyan-500/5",
  "Uncertainty Reduction": "border-indigo-500/30 bg-indigo-500/5",
  "Uber: Activation": "border-orange-500/30 bg-orange-500/5",
  "Uber: Retention": "border-green-500/30 bg-green-500/5",
  "Uber: Power Users": "border-yellow-500/30 bg-yellow-500/5",
  "Uber: Churn": "border-red-500/30 bg-red-500/5",
};

export default function DataLabPage() {
  const [data, setData] = useState<DataLabData | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/superadmin/datalab").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  const handleAnalyze = async () => {
    if (!data) return;
    setAnalyzing(true);
    setAiError(null);
    try {
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
      setAiError("Erreur de connexion \u00e0 l\u2019IA");
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
      <h1 className="text-2xl font-bold text-white mb-6">{"\u{1F52C}"} Data Lab</h1>

      {/* AI Behavioral Analysis */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            {"\u{1F9E0}"} Analyse Comportementale IA
          </h2>
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className={`px-6 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 ${
              analyzing
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-orange-500 hover:bg-orange-600 text-white"
            }`}
          >
            {analyzing ? (
              <>
                <span className="animate-spin">{"\u{1F52C}"}</span>
                Analyse en cours...
              </>
            ) : aiAnalysis ? (
              <>{"\u{1F504}"} Relancer l&apos;analyse</>
            ) : (
              <>{"\u{1F52C}"} Analyser les donn&eacute;es</>
            )}
          </button>
        </div>

        {/* Loading state */}
        {analyzing && (
          <div className="bg-card rounded-xl p-8 text-center">
            <div className="text-4xl mb-4 animate-pulse">{"\u{1F9E0}"}</div>
            <div className="text-white font-medium">Le scientifique analyse vos donn&eacute;es...</div>
            <div className="text-gray-500 text-sm mt-2">Application des lois comportementales de Bartlett + m&eacute;triques Uber Lab</div>
            <div className="flex justify-center gap-2 mt-4">
              <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">Peak-End Rule</span>
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Idleness Aversion</span>
              <span className="text-xs bg-teal-500/20 text-teal-400 px-2 py-1 rounded">Goal-Gradient</span>
              <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded">Glass Box</span>
              <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded">Uncertainty</span>
            </div>
          </div>
        )}

        {/* Error state */}
        {aiError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <div className="text-red-400 font-medium">{"\u274C"} {aiError}</div>
            <div className="text-gray-500 text-sm mt-1">V&eacute;rifiez la cl&eacute; API Anthropic dans les variables d&apos;environnement.</div>
          </div>
        )}

        {/* AI Results */}
        {aiAnalysis && !analyzing && (
          <div className="space-y-4">
            {/* Summary + top priority */}
            <div className="bg-card rounded-xl p-6 border border-orange-500/20">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{"\u{1F9E0}"}</span>
                <div>
                  <div className="text-white font-medium mb-2">{aiAnalysis.summary}</div>
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mt-3">
                    <div className="text-orange-400 text-xs uppercase tracking-wider mb-1">Priorit&eacute; #1 cette semaine</div>
                    <div className="text-white text-sm font-medium">{aiAnalysis.topPriority}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Individual insights */}
            {aiAnalysis.insights.map((insight, i) => (
              <div key={i} className={`rounded-xl p-5 border ${
                insight.severity === "red" ? "border-red-500/30 bg-red-500/5" :
                insight.severity === "yellow" ? "border-yellow-500/30 bg-yellow-500/5" :
                "border-green-500/30 bg-green-500/5"
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg ${
                      insight.severity === "red" ? "text-red-400" :
                      insight.severity === "yellow" ? "text-yellow-400" :
                      "text-green-400"
                    }`}>
                      {insight.severity === "red" ? "\u{1F534}" : insight.severity === "yellow" ? "\u{1F7E1}" : "\u{1F7E2}"}
                    </span>
                    <h3 className="text-white font-bold text-sm">{insight.title}</h3>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border ${LAW_COLORS[insight.law] || "border-gray-500/30 bg-gray-500/5"}`}>
                    {LAW_ICONS[insight.law] || "\u{1F4CA}"} {insight.law}
                  </span>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Observation</div>
                    <div className="text-gray-300">{insight.observation}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Psychologie</div>
                    <div className="text-gray-400 italic">{insight.psychology}</div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Action recommand&eacute;e</div>
                      <div className="text-white">{insight.action}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Impact</div>
                      <div className="text-green-400 text-sm font-medium">{insight.impact}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Cost indicator */}
            <div className="text-center text-gray-600 text-xs mt-2">
              Analyse effectu&eacute;e via Claude Sonnet &middot; ~0,01 USD par analyse
            </div>
          </div>
        )}

        {/* Initial state — no analysis yet */}
        {!aiAnalysis && !analyzing && !aiError && (
          <div className="bg-card rounded-xl p-6 border border-dashed border-gray-700 text-center">
            <div className="text-3xl mb-3">{"\u{1F9E0}"}</div>
            <div className="text-white font-medium mb-1">Analyse comportementale IA</div>
            <div className="text-gray-500 text-sm mb-4">
              Le scientifique analysera vos donn&eacute;es &agrave; travers les lois de Bartlett et les m&eacute;triques Uber Lab
            </div>
            <div className="flex justify-center gap-2 flex-wrap">
              <span className="text-xs bg-purple-500/10 text-purple-400 px-2 py-1 rounded">{"\u{1F3D4}\uFE0F"} Peak-End Rule</span>
              <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded">{"\u23F3"} Idleness Aversion</span>
              <span className="text-xs bg-teal-500/10 text-teal-400 px-2 py-1 rounded">{"\u{1F3AF}"} Goal-Gradient</span>
              <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded">{"\u{1F50D}"} Glass Box</span>
              <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded">{"\u{1F6E1}\uFE0F"} Uncertainty Reduction</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggestions */}
      <div className="space-y-3 mb-8">
        {data.suggestions.map((s, i) => (
          <div key={i} className={`rounded-xl p-4 border ${
            s.severity === "red" ? "bg-red-500/10 border-red-500/30" :
            s.severity === "yellow" ? "bg-yellow-500/10 border-yellow-500/30" :
            "bg-green-500/10 border-green-500/30"
          }`}>
            <div className={`text-sm ${
              s.severity === "red" ? "text-red-400" :
              s.severity === "yellow" ? "text-yellow-400" :
              "text-green-400"
            }`}>
              {s.severity === "red" ? "\u{1F534}" : s.severity === "yellow" ? "\u{1F7E1}" : "\u{1F7E2}"} {s.text}
            </div>
          </div>
        ))}
      </div>

      {/* Écho engagement funnel */}
      <div className="bg-card rounded-xl p-6 mb-6">
        <h2 className="text-white font-bold text-lg mb-4">Entonnoir &Eacute;cho</h2>
        <div className="flex items-center gap-2">
          {[
            { label: "Inscrits", value: data.echoFunnel.registered, color: "bg-orange-500" },
            { label: "Campagne accept\u00e9e", value: data.echoFunnel.acceptedCampaign, color: "bg-blue-500" },
            { label: "Premier clic", value: data.echoFunnel.generatedClick, color: "bg-teal-500" },
            { label: "Premier retrait", value: data.echoFunnel.withdrew, color: "bg-green-500" },
            { label: "Actifs (7j)", value: data.echoFunnel.activeWeek, color: "bg-purple-500" },
          ].map((step, i, arr) => (
            <Fragment key={i}>
              <div className="flex-1 text-center">
                <div className={`${step.color} h-2 rounded-full mb-2`}
                  style={{ width: `${(step.value / Math.max(...arr.map(s => s.value), 1)) * 100}%`, margin: "0 auto" }} />
                <div className="text-white font-bold text-xl">{step.value}</div>
                <div className="text-gray-500 text-xs">{step.label}</div>
                {i > 0 && (
                  <div className="text-gray-600 text-xs mt-1">
                    {arr[0].value > 0 ? Math.round((step.value / arr[0].value) * 100) : 0}%
                  </div>
                )}
              </div>
              {i < arr.length - 1 && <span className="text-gray-600">&rarr;</span>}
            </Fragment>
          ))}
        </div>
      </div>

      {/* Écho lifecycle */}
      <div className="bg-card rounded-xl p-6 mb-6">
        <h2 className="text-white font-bold text-lg mb-4">Cycle de vie &Eacute;cho</h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Nouveaux (< 7j)", value: data.echoLifecycle.new, color: "text-blue-400" },
            { label: "Actifs (7j)", value: data.echoLifecycle.active, color: "text-green-400" },
            { label: "Dormants (14j+)", value: data.echoLifecycle.dormant, color: "text-yellow-400" },
            { label: "Churn\u00e9s (30j+)", value: data.echoLifecycle.churned, color: "text-red-400" },
            { label: "Jamais actifs", value: data.echoLifecycle.neverActive, color: "text-gray-500" },
          ].map((stage, i) => (
            <div key={i} className="bg-gray-800/50 rounded-lg p-4 text-center">
              <div className={`font-bold text-2xl ${stage.color}`}>{stage.value}</div>
              <div className="text-gray-500 text-xs mt-1">{stage.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Brand funnel */}
      <div className="bg-card rounded-xl p-6 mb-6">
        <h2 className="text-white font-bold text-lg mb-4">Entonnoir Marques</h2>
        <div className="flex items-center gap-2">
          {[
            { label: "Inscrites", value: data.brandFunnel.registered, color: "bg-orange-500" },
            { label: "Recharg\u00e9", value: data.brandFunnel.recharged, color: "bg-blue-500" },
            { label: "1\u00e8re campagne", value: data.brandFunnel.launchedCampaign, color: "bg-teal-500" },
            { label: "2+ campagnes", value: data.brandFunnel.repeatCampaign, color: "bg-green-500" },
          ].map((step, i, arr) => (
            <Fragment key={i}>
              <div className="flex-1 text-center">
                <div className={`${step.color} h-2 rounded-full mb-2`}
                  style={{ width: `${(step.value / Math.max(...arr.map(s => s.value), 1)) * 100}%`, margin: "0 auto" }} />
                <div className="text-white font-bold text-xl">{step.value}</div>
                <div className="text-gray-500 text-xs">{step.label}</div>
              </div>
              {i < arr.length - 1 && <span className="text-gray-600">&rarr;</span>}
            </Fragment>
          ))}
        </div>
      </div>

      {/* Peak hours heatmap */}
      <div className="bg-card rounded-xl p-6 mb-6">
        <h2 className="text-white font-bold text-lg mb-4">Heures de pointe</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left text-gray-500 py-1 w-16"></th>
                {Array.from({ length: 24 }, (_, h) => (
                  <th key={h} className="text-center text-gray-600 py-1 w-8">{h}h</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"].map((day, d) => (
                <tr key={d}>
                  <td className="text-gray-500 py-1">{day}</td>
                  {data.heatmap[d].map((count: number, h: number) => {
                    const maxCount = Math.max(...data.heatmap.flat());
                    const intensity = maxCount > 0 ? count / maxCount : 0;
                    return (
                      <td key={h} className="py-1 px-0.5">
                        <div className="w-6 h-6 rounded-sm mx-auto" style={{
                          background: intensity > 0.7 ? "#D35400" :
                                     intensity > 0.4 ? "#E67E22" :
                                     intensity > 0.1 ? "#2a2a3a" :
                                     "#1a1a2e",
                        }} title={`${day} ${h}h: ${count} clics`} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#1a1a2e" }}></span> 0</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#2a2a3a" }}></span> Faible</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#E67E22" }}></span> Moyen</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#D35400" }}></span> Fort</span>
        </div>
      </div>

      {/* City performance */}
      <div className="bg-card rounded-xl p-6 mb-6">
        <h2 className="text-white font-bold text-lg mb-4">Performance par ville</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase">
                <th className="text-left py-2">Ville</th>
                <th className="text-center py-2">&Eacute;chos</th>
                <th className="text-center py-2">Clics valides</th>
                <th className="text-center py-2">Taux validit&eacute;</th>
                <th className="text-center py-2">Clics/&Eacute;cho</th>
              </tr>
            </thead>
            <tbody>
              {data.cityStats.map((city: CityStats) => (
                <tr key={city.city} className="border-t border-gray-800">
                  <td className="py-3 text-white">{city.city}</td>
                  <td className="py-3 text-center">{city.echoCount}</td>
                  <td className="py-3 text-center text-green-400">{city.validClicks}</td>
                  <td className="py-3 text-center">
                    <span className={city.validRate >= 55 ? "text-green-400" : city.validRate >= 40 ? "text-yellow-400" : "text-red-400"}>
                      {city.validRate}%
                    </span>
                  </td>
                  <td className="py-3 text-center text-gray-400">{city.clicksPerEcho}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Retention cohorts */}
      <div className="bg-card rounded-xl p-6 mb-6">
        <h2 className="text-white font-bold text-lg mb-4">R&eacute;tention par cohorte</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase">
                <th className="text-left py-2">Cohorte</th>
                <th className="text-center py-2">Inscrits</th>
                <th className="text-center py-2">Actifs auj.</th>
                <th className="text-center py-2">R&eacute;tention</th>
              </tr>
            </thead>
            <tbody>
              {data.cohorts.map((c: Cohort) => (
                <tr key={c.week} className="border-t border-gray-800">
                  <td className="py-3 text-white">{c.week}</td>
                  <td className="py-3 text-center">{c.registered}</td>
                  <td className="py-3 text-center text-green-400">{c.activeNow}</td>
                  <td className="py-3 text-center">
                    <span className={c.retentionRate >= 30 ? "text-green-400" : c.retentionRate >= 15 ? "text-yellow-400" : "text-red-400"}>
                      {c.retentionRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
