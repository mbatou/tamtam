import { Fragment } from "react";
import type { DataLabData } from "../types";

interface EchoFunnelCardProps {
  echoFunnel: DataLabData["echoFunnel"];
}

export function EchoFunnelCard({ echoFunnel }: EchoFunnelCardProps) {
  const steps = [
    { label: "Inscrits", value: echoFunnel.registered, color: "bg-orange-500" },
    { label: "Campagne accept\u00e9e", value: echoFunnel.acceptedCampaign, color: "bg-blue-500" },
    { label: "Premier clic", value: echoFunnel.generatedClick, color: "bg-teal-500" },
    { label: "Premier retrait", value: echoFunnel.withdrew, color: "bg-green-500" },
    { label: "Actifs (7j)", value: echoFunnel.activeWeek, color: "bg-purple-500" },
  ];
  const maxValue = Math.max(...steps.map(s => s.value), 1);

  return (
    <div className="bg-card rounded-xl p-6 mb-6">
      <h2 className="text-white font-bold text-lg mb-4">Entonnoir &Eacute;cho</h2>
      <div className="flex items-center gap-2">
        {steps.map((step, i) => (
          <Fragment key={i}>
            <div className="flex-1 text-center">
              <div className={`${step.color} h-2 rounded-full mb-2`}
                style={{ width: `${(step.value / maxValue) * 100}%`, margin: "0 auto" }} />
              <div className="text-white font-bold text-xl">{step.value}</div>
              <div className="text-gray-500 text-xs">{step.label}</div>
              {i > 0 && (
                <div className="text-gray-600 text-xs mt-1">
                  {steps[0].value > 0 ? Math.round((step.value / steps[0].value) * 100) : 0}%
                </div>
              )}
            </div>
            {i < steps.length - 1 && <span className="text-gray-600">&rarr;</span>}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
