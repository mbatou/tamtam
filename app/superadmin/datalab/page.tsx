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

export default function DataLabPage() {
  const [data, setData] = useState<DataLabData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/superadmin/datalab").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

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
      <h1 className="text-2xl font-bold text-white mb-6">🔬 Data Lab</h1>

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
              {s.severity === "red" ? "🔴" : s.severity === "yellow" ? "🟡" : "🟢"} {s.text}
            </div>
          </div>
        ))}
      </div>

      {/* Écho engagement funnel */}
      <div className="bg-card rounded-xl p-6 mb-6">
        <h2 className="text-white font-bold text-lg mb-4">Entonnoir Écho</h2>
        <div className="flex items-center gap-2">
          {[
            { label: "Inscrits", value: data.echoFunnel.registered, color: "bg-orange-500" },
            { label: "Campagne acceptée", value: data.echoFunnel.acceptedCampaign, color: "bg-blue-500" },
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
        <h2 className="text-white font-bold text-lg mb-4">Cycle de vie Écho</h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Nouveaux (< 7j)", value: data.echoLifecycle.new, color: "text-blue-400" },
            { label: "Actifs (7j)", value: data.echoLifecycle.active, color: "text-green-400" },
            { label: "Dormants (14j+)", value: data.echoLifecycle.dormant, color: "text-yellow-400" },
            { label: "Churnés (30j+)", value: data.echoLifecycle.churned, color: "text-red-400" },
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
            { label: "Rechargé", value: data.brandFunnel.recharged, color: "bg-blue-500" },
            { label: "1ère campagne", value: data.brandFunnel.launchedCampaign, color: "bg-teal-500" },
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
                <th className="text-center py-2">Échos</th>
                <th className="text-center py-2">Clics valides</th>
                <th className="text-center py-2">Taux validité</th>
                <th className="text-center py-2">Clics/Écho</th>
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
        <h2 className="text-white font-bold text-lg mb-4">Rétention par cohorte</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase">
                <th className="text-left py-2">Cohorte</th>
                <th className="text-center py-2">Inscrits</th>
                <th className="text-center py-2">Actifs auj.</th>
                <th className="text-center py-2">Rétention</th>
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

      {/* Placeholder for future AI */}
      <div className="bg-card rounded-xl p-6 border border-dashed border-gray-700">
        <div className="text-center py-4">
          <div className="text-2xl mb-2">🤖</div>
          <div className="text-gray-400 text-sm">Analyse IA — bientôt disponible</div>
          <div className="text-gray-600 text-xs mt-1">Les suggestions ci-dessus sont basées sur des règles. L&apos;IA analysera les tendances plus en profondeur.</div>
        </div>
      </div>
    </div>
  );
}
