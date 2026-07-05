"use client";

import { formatFCFA, timeAgo } from "@/lib/utils";
import { getBrandDisplayName, getBrandSubtitle } from "@/lib/display-utils";
import AdminBadge from "@/components/superadmin/AdminBadge";
import { qualityScore, type UserRow } from "./types";

export default function UsersTable({
  users,
  onSelectUser,
}: {
  users: UserRow[];
  onSelectUser: (user: UserRow) => void;
}) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "0.5px solid rgba(255,255,255,0.07)" }}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ background: "#111128" }}>
              {["Utilisateur", "Rôle", "Statut", "Plateformes", "Clics", "Gains", "Qualité", "Solde", "Inscrit"].map((h, i) => (
                <th
                  key={h}
                  className={`text-left font-dm font-medium uppercase tracking-wider px-4 py-3 ${
                    i >= 3 && i <= 6 ? "hidden md:table-cell" : ""
                  } ${i >= 7 ? "hidden lg:table-cell" : ""}`}
                  style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const score = (user.role === "echo" || user.has_echo_activity) ? qualityScore(user) : null;
              return (
                <tr
                  key={user.id}
                  className="cursor-pointer transition-colors"
                  style={{ borderBottom: "0.5px solid rgba(255,255,255,0.05)" }}
                  onClick={() => onSelectUser(user)}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-dm text-xs font-bold text-white shrink-0" style={{ background: "#D35400" }}>
                        {getBrandDisplayName(user).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-dm text-sm font-semibold text-white">{getBrandDisplayName(user)}</span>
                          {user.is_dual_role && (
                            <span className="text-[9px] font-dm font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(192,132,252,0.15)", color: "#C084FC" }}>Double</span>
                          )}
                        </div>
                        {getBrandSubtitle(user) && <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{getBrandSubtitle(user)}</div>}
                        <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>{user.city || user.phone || ""}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="font-dm text-[10px] font-bold px-2 py-1 rounded-full"
                      style={{
                        background: user.role === "echo" ? "rgba(211,84,0,0.12)" : user.role === "batteur" ? "rgba(29,158,117,0.12)" : "rgba(226,75,74,0.12)",
                        color: user.role === "echo" ? "#D35400" : user.role === "batteur" ? "#5DCAA5" : "#F09595",
                      }}
                    >
                      {user.role === "echo" ? "Écho" : user.role === "batteur" ? "Marque" : user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <AdminBadge status={
                      user.status === "verified" ? "verified" :
                      user.status === "flagged" ? "error" :
                      user.status === "suspended" ? "suspended" :
                      "active"
                    }>
                      {user.status === "verified" ? "Vérifié" :
                       user.status === "flagged" ? "Signalé" :
                       user.status === "suspended" ? "Suspendu" :
                       "Actif"}
                    </AdminBadge>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {user.platforms && user.platforms.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {user.platforms.slice(0, 3).map((p) => (
                          <span key={p} className="font-dm text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(29,158,117,0.12)", color: "#5DCAA5" }}>
                            {p === "whatsapp" ? "WA" : p === "instagram" ? "IG" : p === "tiktok" ? "TT" : p === "facebook" ? "FB" : p === "snapchat" ? "SC" : p}
                          </span>
                        ))}
                        {user.platforms.length > 3 && (
                          <span className="font-dm text-[9px] px-1 py-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>+{user.platforms.length - 3}</span>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: "rgba(255,255,255,0.15)" }}>—</span>
                    )}
                    {user.audience_size_range && (
                      <div className="font-dm text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>
                        {user.audience_size_range === "small" ? "<200" : user.audience_size_range === "medium" ? "200-500" : user.audience_size_range === "growing" ? "500-2k" : "2k+"}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell font-dm text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {user.click_stats.total > 0 ? (
                      <span>{user.click_stats.total} <span style={{ color: user.click_stats.rate > 20 ? "#F09595" : "rgba(255,255,255,0.3)" }}>({user.click_stats.rate}% fraude)</span></span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell font-syne font-bold text-white text-sm">{formatFCFA(user.total_earned)}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {score !== null ? (
                      <span
                        className="font-dm text-[10px] font-bold px-2 py-1 rounded-full"
                        style={{
                          background: score >= 70 ? "rgba(29,158,117,0.12)" : score >= 40 ? "rgba(211,84,0,0.12)" : "rgba(226,75,74,0.12)",
                          color: score >= 70 ? "#5DCAA5" : score >= 40 ? "#D35400" : "#F09595",
                        }}
                      >
                        {score}%
                      </span>
                    ) : <span style={{ color: "rgba(255,255,255,0.15)" }}>—</span>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell font-dm text-sm text-white">{formatFCFA(user.balance)}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="font-dm text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{new Date(user.created_at).toLocaleDateString("fr-FR")}</div>
                    <div className="font-dm text-[10px]" style={{ color: user.last_click_at ? "rgba(29,158,117,0.6)" : "rgba(255,255,255,0.15)" }}>
                      {user.last_click_at ? timeAgo(user.last_click_at) : "Jamais actif"}
                    </div>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center font-dm text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Aucun utilisateur trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
