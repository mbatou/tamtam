"use client";

import { useEffect, useState } from "react";

interface InterestCategory {
  id: string;
  name_fr: string;
  name_en: string;
  emoji: string;
  count: number;
  percentage: number;
}

interface SignalCategory {
  id: string;
  name_fr: string;
  name_en: string;
  emoji: string;
  count: number;
  percentage: number;
}

interface HeatmapCity {
  city: string;
  total: number;
  interests: Record<string, number>;
}

interface CompletionDay {
  date: string;
  count: number;
}

interface InterestsData {
  totalEchos: number;
  completedEchos: number;
  completionRate: number;
  foundingEchos: number;
  totalRewardsDistributed: number;
  daysRemaining: number;
  categories: InterestCategory[];
  signals: SignalCategory[];
  heatmapCities: HeatmapCity[];
  completionTrend: CompletionDay[];
}

export function InterestsTab() {
  const [data, setData] = useState<InterestsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/superadmin/datalab/interests")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-24 rounded-xl" />
        <div className="skeleton h-48 rounded-xl" />
        <div className="skeleton h-48 rounded-xl" />
      </div>
    );
  }

  const sortedCategories = [...data.categories].sort((a, b) => b.count - a.count);
  const sortedSignals = [...data.signals].sort((a, b) => b.count - a.count);
  const maxCategoryCount = Math.max(...sortedCategories.map((c) => c.count), 1);
  const maxSignalCount = Math.max(...sortedSignals.map((s) => s.count), 1);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Completion rate */}
        <div className="bg-card rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase mb-1">Completed</p>
          <p className="text-white text-2xl font-bold">{data.completedEchos} / {data.totalEchos}</p>
          <div className="mt-2 h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${data.completionRate}%` }}
            />
          </div>
          <p className="text-gray-500 text-xs mt-1">{data.completionRate}% completion rate</p>
        </div>

        {/* Founding Echos */}
        <div className="bg-card rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase mb-1">Founding Echos</p>
          <p className="text-yellow-400 text-2xl font-bold">{data.foundingEchos}</p>
          <p className="text-gray-500 text-xs mt-1">&#129351; badge holders</p>
        </div>

        {/* Deadline */}
        <div className="bg-card rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase mb-1">Deadline</p>
          <p className="text-orange-400 text-2xl font-bold">{data.daysRemaining}d</p>
          <p className="text-gray-500 text-xs mt-1">remaining until April 30</p>
        </div>

        {/* Total rewards */}
        <div className="bg-card rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase mb-1">Rewards Distributed</p>
          <p className="text-green-400 text-2xl font-bold">{data.totalRewardsDistributed.toLocaleString()} FCFA</p>
          <p className="text-gray-500 text-xs mt-1">from interest_reward txns</p>
        </div>

        {/* Avg interests per echo */}
        <div className="bg-card rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase mb-1">Avg Interests/Echo</p>
          <p className="text-white text-2xl font-bold">
            {data.completedEchos > 0
              ? (data.categories.reduce((sum, c) => sum + c.count, 0) / data.completedEchos).toFixed(1)
              : "0"}
          </p>
          <p className="text-gray-500 text-xs mt-1">of max 5</p>
        </div>
      </div>

      {/* Completion trend */}
      {data.completionTrend.length > 0 && (
        <div className="bg-card rounded-xl p-6">
          <h2 className="text-white font-bold text-lg mb-4">Completions per Day</h2>
          <div className="flex items-end gap-1 h-32">
            {data.completionTrend.map((day) => {
              const maxCount = Math.max(...data.completionTrend.map((d) => d.count), 1);
              const height = Math.max((day.count / maxCount) * 100, 4);
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1" title={`${day.date}: ${day.count}`}>
                  <span className="text-[9px] text-gray-500">{day.count}</span>
                  <div
                    className="w-full bg-green-500/60 rounded-t"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[8px] text-gray-600 truncate w-full text-center">
                    {day.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Interest distribution */}
      <div className="bg-card rounded-xl p-6">
        <h2 className="text-white font-bold text-lg mb-4">Interest Distribution</h2>
        <div className="space-y-3">
          {sortedCategories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3">
              <span className="text-lg w-8 text-center shrink-0">{cat.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white font-medium truncate">{cat.name_en}</span>
                  <span className="text-xs text-gray-400 shrink-0 ml-2">{cat.count} ({cat.percentage}%)</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all"
                    style={{ width: `${(cat.count / maxCategoryCount) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Signal distribution */}
      <div className="bg-card rounded-xl p-6">
        <h2 className="text-white font-bold text-lg mb-4">Content Signal Distribution</h2>
        <div className="space-y-3">
          {sortedSignals.map((sig) => (
            <div key={sig.id} className="flex items-center gap-3">
              <span className="text-lg w-8 text-center shrink-0">{sig.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white font-medium truncate">{sig.name_en}</span>
                  <span className="text-xs text-gray-400 shrink-0 ml-2">{sig.count} ({sig.percentage}%)</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full transition-all"
                    style={{ width: `${(sig.count / maxSignalCount) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* City × Interest heatmap */}
      {data.heatmapCities.length > 0 && (
        <div className="bg-card rounded-xl p-6">
          <h2 className="text-white font-bold text-lg mb-4">City × Interest Heatmap</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left py-2 text-gray-500 sticky left-0 bg-card">City</th>
                  {data.categories.map((cat) => (
                    <th key={cat.id} className="text-center py-2 px-1" title={cat.name_en}>
                      <span className="text-sm">{cat.emoji}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.heatmapCities.map((city) => {
                  const maxCellValue = Math.max(
                    ...data.heatmapCities.flatMap((c) => Object.values(c.interests)),
                    1
                  );
                  return (
                    <tr key={city.city} className="border-t border-gray-800">
                      <td className="py-2 text-white font-medium sticky left-0 bg-card pr-2">{city.city}</td>
                      {data.categories.map((cat) => {
                        const value = city.interests[cat.id] || 0;
                        const intensity = value / maxCellValue;
                        return (
                          <td key={cat.id} className="text-center py-2 px-1">
                            <div
                              className="w-8 h-8 rounded flex items-center justify-center mx-auto text-[10px] font-bold"
                              style={{
                                backgroundColor: value > 0
                                  ? `rgba(211, 84, 0, ${0.1 + intensity * 0.7})`
                                  : "rgba(255,255,255,0.02)",
                                color: value > 0 ? "white" : "rgba(255,255,255,0.1)",
                              }}
                            >
                              {value || ""}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stated vs Revealed gap (stub) */}
      <div className="bg-card rounded-xl p-6 opacity-60">
        <h2 className="text-white font-bold text-lg mb-2">Stated vs Revealed Preference Gap</h2>
        <p className="text-gray-500 text-sm">
          Phase 1.5 — Will compare stated interests vs actual campaign click-through rates
          once sufficient campaign data is available. Flags interests where gap &gt; 20%.
        </p>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {data.categories.slice(0, 5).map((cat) => (
            <div key={cat.id} className="bg-gray-800/50 rounded-lg p-3 text-center">
              <span className="text-lg">{cat.emoji}</span>
              <p className="text-[10px] text-gray-500 mt-1">Stated: {cat.percentage}%</p>
              <p className="text-[10px] text-gray-600">Revealed: —</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
