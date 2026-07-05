"use client";

import { StageCounts } from "./types";

export default function PipelineStageTabs({
  total,
  stageCounts,
  stageFilter,
  onSelectStage,
}: {
  total: number;
  stageCounts: StageCounts;
  stageFilter: string;
  onSelectStage: (key: string) => void;
}) {
  return (
    <div className="flex gap-1 p-1 rounded-xl mb-4" style={{ background: "rgba(255,255,255,0.03)" }}>
      {[
        { key: "", label: "Toutes", count: total },
        { key: "registered", label: "Inscrites", count: stageCounts.registered },
        { key: "recharged", label: "Rechargées", count: stageCounts.recharged },
        { key: "first_campaign", label: "1ère campagne", count: stageCounts.first_campaign },
        { key: "repeat", label: "Récurrentes", count: stageCounts.repeat },
        { key: "vip", label: "VIP", count: stageCounts.vip },
      ].map(stage => (
        <button
          key={stage.key}
          onClick={() => onSelectStage(stage.key)}
          className="px-3 py-1.5 rounded-lg font-dm text-xs font-medium transition-all"
          style={{
            background: stageFilter === stage.key ? "rgba(211,84,0,0.12)" : "transparent",
            color: stageFilter === stage.key ? "#D35400" : "rgba(255,255,255,0.4)",
          }}
        >
          {stage.label} <span className="font-bold ml-1">{stage.count || 0}</span>
        </button>
      ))}
    </div>
  );
}
