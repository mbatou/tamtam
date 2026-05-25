"use client";

import { formatFCFA } from "@/lib/utils";
import { ECHO_SHARE_PERCENT } from "@/lib/constants";
import type { TrackedLinkWithCampaign } from "@/lib/types";

interface CampaignMiniCardProps {
  link: TrackedLinkWithCampaign;
  onClick?: () => void;
}

export default function CampaignMiniCard({ link, onClick }: CampaignMiniCardProps) {
  const earned = Math.floor(link.click_count * (link.campaigns?.cpc || 0) * ECHO_SHARE_PERCENT / 100);
  const isActive = link.campaigns?.status === "active";

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] cursor-pointer hover:bg-white/[0.05] transition min-w-[200px] shrink-0"
    >
      {link.campaigns?.creative_urls?.[0] && !link.campaigns.creative_urls[0].match(/\.(mp4|webm)/) ? (
        <img
          src={link.campaigns.creative_urls[0]}
          alt=""
          className="w-10 h-10 rounded-lg object-cover shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-[#1D9E75]/10 flex items-center justify-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" /></svg>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold truncate">{link.campaigns?.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-white/40">{link.click_count} clics</span>
          <span className="text-[10px] font-bold text-[#D35400]">{formatFCFA(earned)}</span>
        </div>
      </div>
      <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "bg-[#1D9E75]" : "bg-white/20"}`} />
    </div>
  );
}
