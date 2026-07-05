"use client";

import NotesSection from "./NotesSection";
import { AVAILABLE_TAGS, BrandUser, NotesSectionProps } from "./types";

export default function BrandInfoTab({
  user,
  onUpdateTags,
  notes,
}: {
  user: BrandUser;
  onUpdateTags: (userId: string, tags: string[]) => void;
  notes: NotesSectionProps;
}) {
  return (
    <>
      {/* Contact */}
      <div className="space-y-2">
        <h4 className="font-dm text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>Contact</h4>
        {[
          { label: "Email", value: user.email || "—" },
          { label: "Tél.", value: user.phone || "—", wa: user.phone },
          { label: "Inscrit", value: new Date(user.created_at).toLocaleDateString("fr-FR") },
        ].map(row => (
          <div key={row.label} className="flex items-center gap-2 font-dm text-sm">
            <span className="w-14" style={{ color: "rgba(255,255,255,0.3)" }}>{row.label}</span>
            <span className="text-white">{row.value}</span>
            {row.wa && (
              <a href={`https://wa.me/${row.wa.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
                className="font-dm text-xs transition" style={{ color: "#5DCAA5" }}>WhatsApp</a>
            )}
          </div>
        ))}
      </div>

      {/* Tags */}
      <div>
        <h4 className="font-dm text-[10px] uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>Tags</h4>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_TAGS.map(tag => {
            const isActive = (user.crm_tags || []).includes(tag);
            return (
              <button key={tag} onClick={() => {
                const current = user.crm_tags || [];
                onUpdateTags(user.id, isActive ? current.filter(t => t !== tag) : [...current, tag]);
              }}
                className="px-2.5 py-1 rounded-full font-dm text-xs font-medium transition"
                style={{
                  background: isActive ? "rgba(211,84,0,0.12)" : "rgba(255,255,255,0.04)",
                  color: isActive ? "#D35400" : "rgba(255,255,255,0.3)",
                  border: `0.5px solid ${isActive ? "rgba(211,84,0,0.3)" : "rgba(255,255,255,0.05)"}`,
                }}>
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <NotesSection {...notes} />
    </>
  );
}
