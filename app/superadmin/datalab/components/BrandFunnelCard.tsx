import { Fragment } from "react";
import type { DataLabData } from "../types";

interface BrandFunnelCardProps {
  brandFunnel: DataLabData["brandFunnel"];
}

export function BrandFunnelCard({ brandFunnel }: BrandFunnelCardProps) {
  const steps = [
    { label: "Inscrites", value: brandFunnel.registered, color: "bg-orange-500" },
    { label: "Recharg\u00e9", value: brandFunnel.recharged, color: "bg-blue-500" },
    { label: "1\u00e8re campagne", value: brandFunnel.launchedCampaign, color: "bg-teal-500" },
    { label: "2+ campagnes", value: brandFunnel.repeatCampaign, color: "bg-green-500" },
  ];
  const maxValue = Math.max(...steps.map(s => s.value), 1);

  return (
    <div className="bg-card rounded-xl p-6 mb-6">
      <h2 className="text-white font-bold text-lg mb-4">Entonnoir Marques</h2>
      <div className="flex items-center gap-2">
        {steps.map((step, i) => (
          <Fragment key={i}>
            <div className="flex-1 text-center">
              <div className={`${step.color} h-2 rounded-full mb-2`}
                style={{ width: `${(step.value / maxValue) * 100}%`, margin: "0 auto" }} />
              <div className="text-white font-bold text-xl">{step.value}</div>
              <div className="text-gray-500 text-xs">{step.label}</div>
            </div>
            {i < steps.length - 1 && <span className="text-gray-600">&rarr;</span>}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
