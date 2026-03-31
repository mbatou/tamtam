import type { DataLabData } from "../types";

interface EchoLifecycleCardProps {
  echoLifecycle: DataLabData["echoLifecycle"];
}

export function EchoLifecycleCard({ echoLifecycle }: EchoLifecycleCardProps) {
  const stages = [
    { label: "Nouveaux (< 7j)", value: echoLifecycle.new, color: "text-blue-400" },
    { label: "Actifs (7j)", value: echoLifecycle.active, color: "text-green-400" },
    { label: "Dormants (14j+)", value: echoLifecycle.dormant, color: "text-yellow-400" },
    { label: "Churn\u00e9s (30j+)", value: echoLifecycle.churned, color: "text-red-400" },
    { label: "Jamais actifs", value: echoLifecycle.neverActive, color: "text-gray-500" },
  ];

  return (
    <div className="bg-card rounded-xl p-6 mb-6">
      <h2 className="text-white font-bold text-lg mb-4">Cycle de vie &Eacute;cho</h2>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stages.map((stage, i) => (
          <div key={i} className="bg-gray-800/50 rounded-lg p-4 text-center">
            <div className={`font-bold text-2xl ${stage.color}`}>{stage.value}</div>
            <div className="text-gray-500 text-xs mt-1">{stage.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
