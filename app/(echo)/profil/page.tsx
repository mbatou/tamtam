"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatFCFA } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import type { User } from "@/lib/types";

export default function ProfilPage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState({ totalClicks: 0, activeCampaigns: 0, totalEarned: 0 });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", city: "", mobile_money_provider: "" });

  // Password change
  const [showPassword, setShowPassword] = useState(false);
  const [passwords, setPasswords] = useState({ new_password: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);

  const supabase = createClient();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [userRes, linksRes] = await Promise.all([
      fetch("/api/echo/user"),
      fetch("/api/echo/links"),
    ]);

    if (userRes.ok) {
      const userData = await userRes.json();
      setUser(userData);
      setForm({
        name: userData.name || "",
        phone: userData.phone || "",
        city: userData.city || "",
        mobile_money_provider: userData.mobile_money_provider || "",
      });
    }

    if (linksRes.ok) {
      const linksData = await linksRes.json();
      const links = Array.isArray(linksData) ? linksData : [];
      const totalClicks = links.reduce((sum: number, l: { click_count: number }) => sum + l.click_count, 0);
      const activeCampaigns = links.filter((l: { campaigns?: { status: string } }) => l.campaigns?.status === "active").length;
      const totalEarned = links.reduce((sum: number, l: { click_count: number; campaigns?: { cpc: number } }) => {
        return sum + Math.floor(l.click_count * (l.campaigns?.cpc || 0) * 0.75);
      }, 0);
      setStats({ totalClicks, activeCampaigns, totalEarned });
    }

    setLoading(false);
  }

  async function handleSaveProfile() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/echo/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("common.error"));
      } else {
        setUser((prev) => prev ? { ...prev, ...data } : prev);
        setSuccess(t("echo.profile.profileUpdated"));
        setEditing(false);
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch {
      setError(t("common.networkRetry"));
    }
    setSaving(false);
  }

  async function handleChangePassword() {
    setError("");
    setSuccess("");

    if (passwords.new_password.length < 6) {
      setError(t("common.passwordMin"));
      return;
    }
    if (passwords.new_password !== passwords.confirm) {
      setError(t("common.passwordMismatch"));
      return;
    }

    setPwSaving(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: passwords.new_password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("common.error"));
      } else {
        setSuccess(t("common.passwordUpdated"));
        setPasswords({ new_password: "", confirm: "" });
        setShowPassword(false);
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch {
      setError(t("common.networkRetry"));
    }
    setPwSaving(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) {
    return (
      <div className="px-4 py-5 max-w-lg mx-auto space-y-3">
        <div className="skeleton h-6 w-28 rounded-xl" />
        <div className="skeleton h-24 rounded-xl" />
        <div className="grid grid-cols-3 gap-2">
          <div className="skeleton h-16 rounded-xl" />
          <div className="skeleton h-16 rounded-xl" />
          <div className="skeleton h-16 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-5">{t("echo.profile.title")}</h1>

      {/* Feedback */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          {success}
        </div>
      )}

      {/* Profile card */}
      <div className="glass-card p-5 mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center text-xl font-black shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold truncate">{user?.name}</h2>
              <p className="text-xs text-white/40">{user?.phone}</p>
              {user?.city && <p className="text-xs text-white/30">{user.city}</p>}
            </div>
          </div>
          {!editing && (
            <button
              onClick={() => { setEditing(true); setError(""); setSuccess(""); }}
              className="text-xs text-primary font-semibold hover:underline shrink-0"
            >
              {t("echo.profile.edit")}
            </button>
          )}
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="glass-card p-5 mb-5 space-y-4">
          <h3 className="text-sm font-bold">{t("echo.profile.editProfile")}</h3>
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-1">{t("echo.profile.nameRequired")}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-1">{t("common.phone")}</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+221 77 000 00 00"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-1">{t("common.city")}</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Dakar"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 mb-1">{t("echo.profile.paymentMethod")}</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "wave", label: t("common.wave") },
                { id: "orange_money", label: t("common.orangeMoney") },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setForm({ ...form, mobile_money_provider: option.id })}
                  className={`p-3 rounded-xl border-2 transition-all text-left ${
                    form.mobile_money_provider === option.id
                      ? "border-primary bg-primary/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <p className="font-semibold text-sm">{option.label}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSaveProfile}
              disabled={saving || !form.name}
              className="flex-1 py-3 rounded-btn font-bold text-white bg-gradient-primary disabled:opacity-50 transition"
            >
              {saving ? t("echo.profile.saveLoading") : t("echo.profile.saveButton")}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setForm({
                  name: user?.name || "",
                  phone: user?.phone || "",
                  city: user?.city || "",
                  mobile_money_provider: user?.mobile_money_provider || "",
                });
              }}
              className="px-6 py-3 rounded-btn border border-white/10 text-sm font-semibold text-white/60 hover:bg-white/5 transition"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="glass-card p-3 text-center">
          <p className="text-lg font-black">{stats.totalClicks}</p>
          <p className="text-[9px] text-white/40 font-semibold">{t("echo.profile.resonances")}</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-lg font-black">{stats.activeCampaigns}</p>
          <p className="text-[9px] text-white/40 font-semibold">{t("echo.dashboard.rythmes")}</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-lg font-black text-accent">{formatFCFA(stats.totalEarned)}</p>
          <p className="text-[9px] text-white/40 font-semibold">{t("common.earned")}</p>
        </div>
      </div>

      {/* Details */}
      <div className="glass-card divide-y divide-white/5 mb-5">
        <div className="flex justify-between px-4 py-3">
          <span className="text-xs text-white/40">{t("echo.profile.balance")}</span>
          <span className="text-xs font-bold text-primary">{formatFCFA(user?.balance || 0)}</span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-xs text-white/40">{t("echo.profile.totalEarned")}</span>
          <span className="text-xs font-bold text-accent">{formatFCFA(user?.total_earned || 0)}</span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-xs text-white/40">{t("echo.profile.paymentMethod")}</span>
          <span className="text-xs font-semibold">
            {user?.mobile_money_provider === "wave" ? t("common.wave") : t("common.orangeMoney")}
          </span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-xs text-white/40">{t("common.city")}</span>
          <span className="text-xs font-semibold">{user?.city || "—"}</span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-xs text-white/40">{t("echo.profile.memberSince")}</span>
          <span className="text-xs font-semibold">
            {user?.created_at ? new Date(user.created_at).toLocaleDateString("fr-FR") : "—"}
          </span>
        </div>
      </div>

      {/* Password change */}
      <div className="glass-card p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold">{t("common.password")}</h3>
          {!showPassword && (
            <button
              onClick={() => { setShowPassword(true); setError(""); setSuccess(""); }}
              className="text-xs text-primary font-semibold hover:underline"
            >
              {t("echo.profile.changePassword")}
            </button>
          )}
        </div>
        {showPassword ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-1">{t("common.newPassword")}</label>
              <input
                type="password"
                value={passwords.new_password}
                onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                placeholder={t("common.minChars")}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-1">{t("common.confirmPassword")}</label>
              <input
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                placeholder={t("common.repeatPassword")}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition"
                onKeyDown={(e) => e.key === "Enter" && !pwSaving && passwords.new_password && passwords.confirm && handleChangePassword()}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleChangePassword}
                disabled={pwSaving || !passwords.new_password || !passwords.confirm}
                className="flex-1 py-3 rounded-btn font-bold text-white bg-gradient-primary disabled:opacity-50 transition"
              >
                {pwSaving ? t("common.updating") : t("common.update")}
              </button>
              <button
                onClick={() => { setShowPassword(false); setPasswords({ new_password: "", confirm: "" }); }}
                className="px-6 py-3 rounded-btn border border-white/10 text-sm font-semibold text-white/60 hover:bg-white/5 transition"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-white/30">{t("common.passwordStrong")}</p>
        )}
      </div>

      <div className="mb-5">
        <LanguageSwitcher />
      </div>

      <button
        onClick={handleLogout}
        className="w-full py-3 rounded-btn border border-red-500/20 text-red-400 text-sm font-semibold active:bg-red-500/10 transition"
      >
        {t("echo.profile.logout")}
      </button>
    </div>
  );
}
