"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Zap,
  CheckCircle,
  Activity,
  Clock,
  Search,
  RefreshCw,
  X,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  BookOpen,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
} from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Brand {
  id: string;
  name: string;
  company_name: string | null;
  logo_url: string | null;
}

interface PixelRow {
  id: string;
  pixel_id: string;
  name: string;
  is_active: boolean;
  total_conversions: number;
  last_conversion_at: string | null;
  last_test_at: string | null;
  test_status: string;
  test_count: number;
  last_test_error: string | null;
  last_test_latency_ms: number | null;
  platform: string;
  created_at: string;
  brand_id: string;
  brand: Brand | null;
}

interface Stats {
  totalPixels: number;
  activePixels: number;
  testedPixels: number;
  eventsToday: number;
  avgLatency: number;
  errorRate: number;
}

interface ConversionEvent {
  id: string;
  event: string;
  event_name: string | null;
  value_amount: number | null;
  tm_ref: string | null;
  attributed: boolean;
  created_at: string;
  metadata: Record<string, unknown>;
  external_id: string | null;
}

type PixelHealth = "active" | "inactive" | "untested" | "slow" | "error";
type FilterType = "Tous" | "Actifs" | "Non testés" | "Erreurs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPixelHealth(pixel: PixelRow): PixelHealth {
  if (!pixel.is_active) return "inactive";
  if (pixel.test_count === 0) return "untested";
  if (pixel.last_test_latency_ms && pixel.last_test_latency_ms > 500)
    return "slow";
  if (pixel.test_status === "failed") return "error";
  return "active";
}

const STATUS_CONFIG: Record<
  PixelHealth,
  { label: string; bg: string; color: string; dot: string }
> = {
  active: {
    label: "Actif",
    bg: "rgba(29,158,117,0.12)",
    color: "#5DCAA5",
    dot: "#1D9E75",
  },
  inactive: {
    label: "Inactif",
    bg: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.35)",
    dot: "rgba(255,255,255,0.2)",
  },
  untested: {
    label: "Non testé",
    bg: "rgba(211,84,0,0.10)",
    color: "#F0997B",
    dot: "#D35400",
  },
  slow: {
    label: "Lent",
    bg: "rgba(240,153,123,0.12)",
    color: "#F0997B",
    dot: "#F0997B",
  },
  error: {
    label: "Erreur",
    bg: "rgba(240,149,149,0.12)",
    color: "#F09595",
    dot: "#E24B4A",
  },
};

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString("fr-FR");
}

function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  icon: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    teal: "#5DCAA5",
    orange: "#D35400",
    white: "rgba(255,255,255,0.7)",
    red: "#F09595",
  };
  const c = colorMap[color] || color;

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: c }}>{icon}</span>
        <span className="text-[10px] text-white/30 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-xl font-bold font-syne" style={{ color: c }}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-white/25 mt-1">{sub}</p>}
    </div>
  );
}

function PixelStatusBadge({ pixel }: { pixel: PixelRow }) {
  const status = getPixelHealth(pixel);
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: cfg.dot }}
      />
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Detail Panel
// ---------------------------------------------------------------------------

function PixelDetailPanel({
  pixel,
  onClose,
}: {
  pixel: PixelRow;
  onClose: () => void;
}) {
  const [events, setEvents] = useState<ConversionEvent[]>([]);
  const [errors, setErrors] = useState<ConversionEvent[]>([]);
  const [latencyData, setLatencyData] = useState<
    { time: string; latency: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/superadmin/pixels?pixelId=${pixel.pixel_id}`)
      .then((r) => r.json())
      .then((d) => {
        setEvents(d.recentEvents || []);
        setErrors(d.errorEvents || []);
        const ld = (d.latencyData || [])
          .filter(
            (e: { metadata?: { latency_ms?: number } }) =>
              e.metadata?.latency_ms
          )
          .map(
            (e: {
              created_at: string;
              metadata: { latency_ms: number };
            }) => ({
              time:
                new Date(e.created_at).getHours() +
                ":" +
                String(new Date(e.created_at).getMinutes()).padStart(2, "0"),
              latency: e.metadata.latency_ms,
            })
          );
        setLatencyData(ld);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pixel.pixel_id]);

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const testCurl = `curl -X POST https://tamma.me/api/v1/conversions \\
  -H "X-Tamtam-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"event":"test","value":1,"currency":"XOF","event_id":"test_${Date.now()}"}'`;

  const issues: { type: "error" | "warn"; msg: string }[] = [];
  if (!pixel.is_active)
    issues.push({
      type: "error",
      msg: "Pixel désactivé — réactiver depuis le dashboard marque",
    });
  if (pixel.test_count === 0)
    issues.push({
      type: "warn",
      msg: "Pixel jamais testé — envoyer la commande cURL au développeur",
    });
  if (pixel.last_conversion_at) {
    const daysSince = Math.floor(
      (Date.now() - new Date(pixel.last_conversion_at).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (daysSince > 7)
      issues.push({
        type: "warn",
        msg: `Aucun événement depuis ${daysSince} jours — vérifier l'intégration`,
      });
  }
  if (pixel.last_test_latency_ms && pixel.last_test_latency_ms > 400)
    issues.push({
      type: "warn",
      msg: `Latence élevée (${pixel.last_test_latency_ms}ms)`,
    });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-white/[0.07]">
        <div>
          <p className="text-[15px] font-bold text-white">
            {pixel.brand?.company_name || pixel.brand?.name || "—"}
          </p>
          <p className="text-[11px] font-mono text-white/30 mt-0.5">
            {pixel.pixel_id}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PixelStatusBadge pixel={pixel} />
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/60 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 p-5 flex flex-col gap-5 overflow-y-auto">
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Conversions",
              value: pixel.total_conversions || 0,
              color: "#D35400",
            },
            {
              label: "Tests",
              value: pixel.test_count || 0,
              color: "#5DCAA5",
            },
            {
              label: "Latence",
              value: pixel.last_test_latency_ms
                ? `${pixel.last_test_latency_ms}ms`
                : "—",
              color: "#fff",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-[#111128] rounded-[10px] p-3 text-center"
            >
              <p
                className="text-[18px] font-black"
                style={{ color: stat.color }}
              >
                {stat.value}
              </p>
              <p className="text-[10px] text-white/30 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Latency chart */}
        <div className="bg-[#111128] rounded-[12px] p-4">
          <p className="text-[12px] font-medium text-white/50 mb-3">
            Latence (24h)
          </p>
          {latencyData.length === 0 ? (
            <p className="text-[11px] text-white/25 text-center py-4">
              Aucune donnée de latence disponible
            </p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={80}>
                <LineChart data={latencyData}>
                  <Line
                    type="monotone"
                    dataKey="latency"
                    stroke="#D35400"
                    strokeWidth={1.5}
                    dot={false}
                  />
                  <ReferenceLine
                    y={300}
                    stroke="rgba(255,255,255,0.1)"
                    strokeDasharray="4 4"
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#111128",
                      border: "0.5px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                    formatter={(v) => [`${v}ms`, "Latence"]}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex justify-between text-[10px] text-white/20 mt-1">
                <span>0ms</span>
                <span className="text-white/30">--- 300ms (seuil)</span>
                <span>max</span>
              </div>
            </>
          )}
        </div>

        {/* Recent events */}
        <div className="bg-[#111128] rounded-[12px] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] font-medium text-white/50">
              Événements récents
            </p>
            <span className="text-[10px] text-white/25">20 derniers</span>
          </div>
          {loading ? (
            <p className="text-[11px] text-white/25 text-center py-3">
              Chargement...
            </p>
          ) : events.length === 0 ? (
            <p className="text-[11px] text-white/25 text-center py-3">
              Aucun événement enregistré
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center gap-3 py-1.5 border-b border-white/[0.04] last:border-0"
                >
                  <div
                    className={cn(
                      "w-1.5 h-1.5 rounded-full flex-shrink-0",
                      ev.event === "test"
                        ? "bg-[#D35400]"
                        : ev.event === "error"
                          ? "bg-[#E24B4A]"
                          : "bg-[#1D9E75]"
                    )}
                  />
                  <span className="font-mono text-[11px] text-white/60 flex-shrink-0">
                    {ev.event}
                  </span>
                  {ev.tm_ref && (
                    <span className="font-mono text-[10px] text-white/25 truncate flex-1">
                      {ev.tm_ref}
                    </span>
                  )}
                  {ev.value_amount != null && (
                    <span className="font-mono text-[10px] text-[#5DCAA5] flex-shrink-0">
                      {ev.value_amount} XOF
                    </span>
                  )}
                  <span className="text-[10px] text-white/20 flex-shrink-0">
                    {formatRelativeTime(ev.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error log */}
        {!loading &&
          (errors.length === 0 ? (
            <div className="bg-[rgba(29,158,117,0.05)] border border-[rgba(29,158,117,0.15)] rounded-[12px] p-4 flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-[#1D9E75] flex-shrink-0" />
              <p className="text-[12px] text-[#5DCAA5]">
                Aucune erreur récente — Pixel en bonne santé
              </p>
            </div>
          ) : (
            <div className="bg-[rgba(226,75,74,0.05)] border border-[rgba(226,75,74,0.15)] rounded-[12px] p-4">
              <p className="text-[12px] font-medium text-[#F09595] mb-3">
                Erreurs récentes ({errors.length})
              </p>
              <div className="flex flex-col gap-2">
                {errors.map((err) => (
                  <div
                    key={err.id}
                    className="bg-[rgba(226,75,74,0.08)] rounded-[8px] p-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[11px] text-[#F09595]">
                        {err.event_name || err.event}
                      </span>
                      <span className="text-[10px] text-white/25">
                        {formatRelativeTime(err.created_at)}
                      </span>
                    </div>
                    {err.metadata &&
                      typeof err.metadata === "object" &&
                      "error" in err.metadata && (
                        <p className="text-[11px] text-white/40 font-mono leading-relaxed">
                          {String(
                            (err.metadata as Record<string, unknown>).error
                          )}
                        </p>
                      )}
                  </div>
                ))}
              </div>
            </div>
          ))}

        {/* Support actions */}
        <div className="bg-[#111128] rounded-[12px] p-4">
          <p className="text-[12px] font-medium text-white/50 mb-3">
            Actions support
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => copyText(pixel.pixel_id, "pixelId")}
              className="flex items-center gap-3 w-full p-3 bg-white/[0.03] border border-white/[0.06] rounded-[10px] hover:border-white/[0.12] transition-all text-left"
            >
              <Copy className="w-4 h-4 text-white/30 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-white/70">
                  Copier le Pixel ID
                </p>
                <p className="text-[10px] font-mono text-white/25 truncate">
                  {pixel.pixel_id}
                </p>
              </div>
              {copied === "pixelId" && (
                <Check className="w-3.5 h-3.5 text-[#1D9E75] flex-shrink-0" />
              )}
            </button>

            <button
              onClick={() => copyText(testCurl, "curl")}
              className="flex items-center gap-3 w-full p-3 bg-white/[0.03] border border-white/[0.06] rounded-[10px] hover:border-white/[0.12] transition-all text-left"
            >
              <Terminal className="w-4 h-4 text-white/30 flex-shrink-0" />
              <div>
                <p className="text-[12px] font-medium text-white/70">
                  Copier la commande de test
                </p>
                <p className="text-[10px] text-white/25">
                  cURL prêt à envoyer au développeur
                </p>
              </div>
              {copied === "curl" && (
                <Check className="w-3.5 h-3.5 text-[#1D9E75] flex-shrink-0" />
              )}
            </button>

            {pixel.brand && (
              <a
                href={`/superadmin/crm`}
                className="flex items-center gap-3 w-full p-3 bg-white/[0.03] border border-white/[0.06] rounded-[10px] hover:border-white/[0.12] transition-all"
              >
                <ExternalLink className="w-4 h-4 text-white/30 flex-shrink-0" />
                <p className="text-[12px] font-medium text-white/70">
                  Voir le compte marque
                </p>
              </a>
            )}

            <a
              href="/developers"
              target="_blank"
              className="flex items-center gap-3 w-full p-3 bg-white/[0.03] border border-white/[0.06] rounded-[10px] hover:border-white/[0.12] transition-all"
            >
              <BookOpen className="w-4 h-4 text-white/30 flex-shrink-0" />
              <p className="text-[12px] font-medium text-white/70">
                Documentation Pixel
              </p>
            </a>

            {/* Diagnosis */}
            <div className="mt-1 p-3 bg-[#0A0A1A] rounded-[10px]">
              <p className="text-[11px] font-medium text-white/40 mb-2">
                Diagnostic automatique
              </p>
              {issues.length === 0 ? (
                <p className="text-[11px] text-[#5DCAA5] flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Tout semble bon
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {issues.map((issue, i) => (
                    <p
                      key={i}
                      className={cn(
                        "text-[11px] flex items-start gap-1.5",
                        issue.type === "error"
                          ? "text-[#F09595]"
                          : "text-[#F0997B]"
                      )}
                    >
                      {issue.type === "error" ? (
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      )}
                      {issue.msg}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function PixelsPage() {
  const [pixels, setPixels] = useState<PixelRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("Tous");
  const [search, setSearch] = useState("");
  const [selectedPixel, setSelectedPixel] = useState<PixelRow | null>(null);
  const [lastRefresh, setLastRefresh] = useState(0);
  const [secondsSince, setSecondsSince] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/superadmin/pixels")
      .then((r) => r.json())
      .then((d) => {
        setPixels(d.pixels || []);
        setStats(d.stats || null);
        setLastRefresh(Date.now());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => {
      if (lastRefresh > 0) {
        setSecondsSince(Math.floor((Date.now() - lastRefresh) / 1000));
      }
    }, 1000);
    return () => clearInterval(t);
  }, [lastRefresh]);

  const filtered = pixels.filter((p) => {
    const health = getPixelHealth(p);
    if (filter === "Actifs" && health !== "active") return false;
    if (filter === "Non testés" && health !== "untested") return false;
    if (filter === "Erreurs" && health !== "error" && health !== "slow")
      return false;

    if (search) {
      const q = search.toLowerCase();
      const brandName = (
        p.brand?.company_name ||
        p.brand?.name ||
        ""
      ).toLowerCase();
      const pId = p.pixel_id.toLowerCase();
      const pName = p.name.toLowerCase();
      if (
        !brandName.includes(q) &&
        !pId.includes(q) &&
        !pName.includes(q)
      )
        return false;
    }

    return true;
  });

  if (!stats && loading) {
    return (
      <div className="p-6 text-white/40 text-sm">Chargement des pixels...</div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold font-syne text-white">Pixels</h1>
          <p className="text-[12px] text-white/35 mt-0.5">
            Suivi des intégrations Tamtam Pixel par marque
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-white/25">
          <RefreshCw
            className={cn("w-3.5 h-3.5", loading && "animate-spin")}
          />
          <span>Actualisé il y a {secondsSince}s</span>
          <button
            onClick={load}
            className="text-white/40 hover:text-white/70 transition"
          >
            Actualiser
          </button>
        </div>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Pixels actifs"
            value={`${stats.activePixels}/${stats.totalPixels}`}
            color="teal"
            icon={<Zap size={16} />}
          />
          <StatCard
            label="Pixels testés"
            value={stats.testedPixels}
            sub={
              stats.totalPixels - stats.testedPixels > 0
                ? `${stats.totalPixels - stats.testedPixels} non testés`
                : undefined
            }
            color={
              stats.testedPixels === stats.totalPixels ? "teal" : "orange"
            }
            icon={<CheckCircle size={16} />}
          />
          <StatCard
            label="Événements aujourd'hui"
            value={stats.eventsToday.toLocaleString("fr-FR")}
            color="white"
            icon={<Activity size={16} />}
          />
          <StatCard
            label="Latence moyenne"
            value={stats.avgLatency > 0 ? `${stats.avgLatency}ms` : "—"}
            color={
              stats.avgLatency === 0
                ? "white"
                : stats.avgLatency < 300
                  ? "teal"
                  : stats.avgLatency < 500
                    ? "orange"
                    : "red"
            }
            icon={<Clock size={16} />}
          />
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex bg-white/[0.04] rounded-lg p-0.5 gap-0.5">
          {(["Tous", "Actifs", "Non testés", "Erreurs"] as FilterType[]).map(
            (f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "text-[12px] font-medium px-3 py-1.5 rounded-[7px] transition-all",
                  filter === f
                    ? "bg-[#D35400] text-white"
                    : "text-white/40 hover:text-white/60"
                )}
              >
                {f}
              </button>
            )
          )}
        </div>

        <div className="relative flex-1 max-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
          <input
            type="text"
            placeholder="Rechercher une marque..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.07] rounded-lg pl-9 pr-3 py-2 text-[12px] text-white placeholder-white/20 outline-none focus:border-[rgba(211,84,0,0.4)]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/30 border-b border-white/[0.06]">
                <th className="text-left py-3 px-4">Marque</th>
                <th className="text-left py-3 px-3">Pixel</th>
                <th className="text-left py-3 px-3">Statut</th>
                <th className="text-left py-3 px-3 hidden md:table-cell">
                  Dernier événement
                </th>
                <th className="text-left py-3 px-3 hidden md:table-cell">
                  Conversions
                </th>
                <th className="text-left py-3 px-3 hidden lg:table-cell">
                  Tests
                </th>
                <th className="text-right py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer transition"
                  onClick={() => setSelectedPixel(p)}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[rgba(211,84,0,0.12)] flex items-center justify-center text-[12px] font-black text-[#F0997B]">
                        {(
                          p.brand?.company_name?.[0] ||
                          p.brand?.name?.[0] ||
                          "?"
                        ).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-white">
                          {p.brand?.company_name || p.brand?.name || "—"}
                        </p>
                        <p className="text-[11px] font-mono text-white/30">
                          {p.pixel_id}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-[12px] text-white/60">{p.name}</span>
                  </td>
                  <td className="py-3 px-3">
                    <PixelStatusBadge pixel={p} />
                  </td>
                  <td className="py-3 px-3 hidden md:table-cell">
                    <div>
                      <p className="text-[12px] text-white/60">
                        {p.last_conversion_at
                          ? formatRelativeTime(p.last_conversion_at)
                          : "Jamais"}
                      </p>
                      {p.last_test_latency_ms && (
                        <p
                          className={cn(
                            "text-[10px] font-mono",
                            p.last_test_latency_ms < 300
                              ? "text-[#5DCAA5]"
                              : p.last_test_latency_ms < 500
                                ? "text-[#F0997B]"
                                : "text-[#F09595]"
                          )}
                        >
                          {p.last_test_latency_ms}ms
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 hidden md:table-cell">
                    <span className="text-[13px] font-bold text-white">
                      {p.total_conversions || 0}
                    </span>
                  </td>
                  <td className="py-3 px-3 hidden lg:table-cell">
                    <span
                      className={cn(
                        "text-[12px]",
                        p.test_count > 0 ? "text-[#5DCAA5]" : "text-white/30"
                      )}
                    >
                      {p.test_count > 0
                        ? `${p.test_count} test${p.test_count > 1 ? "s" : ""}`
                        : "Non testé"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-[11px] text-white/30 hover:text-white/60 transition-colors">
                      Voir détails →
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 text-center text-white/20 text-sm"
                  >
                    {pixels.length === 0
                      ? "Aucun pixel créé"
                      : "Aucun pixel correspondant aux filtres"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail panel overlay */}
      {selectedPixel && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setSelectedPixel(null)}
          />
          <div className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-[#0D0D1F] border-l border-white/[0.07] z-50 overflow-y-auto animate-in slide-in-from-right duration-300">
            <PixelDetailPanel
              pixel={selectedPixel}
              onClose={() => setSelectedPixel(null)}
            />
          </div>
        </>
      )}
    </div>
  );
}
