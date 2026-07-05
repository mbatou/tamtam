"use client";

import { useTranslation } from "@/lib/i18n";
import CitySelect from "@/components/ui/CitySelect";
import type { ProfileForm } from "./types";

export default function ProfileEditForm({
  form,
  setForm,
  saving,
  onSave,
  onCancel,
}: {
  form: ProfileForm;
  setForm: (form: ProfileForm) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 mb-5 space-y-4">
      <h3 className="text-sm font-bold">{t("echo.profile.editProfile")}</h3>
      <div>
        <label className="block text-xs font-semibold text-white/40 mb-1">{t("echo.profile.nameRequired")}</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1D9E75] transition"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-white/40 mb-1">{t("common.phone")}</label>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="+221 77 000 00 00"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1D9E75] transition"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-white/40 mb-1">{t("common.city")}</label>
        <CitySelect
          value={form.city}
          onChange={(city) => setForm({ ...form, city })}
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
                  ? "border-[#1D9E75] bg-[#1D9E75]/10"
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
          onClick={onSave}
          disabled={saving || !form.name}
          className="flex-1 py-3 rounded-xl font-bold text-white bg-[#1D9E75] hover:bg-[#178a65] transition disabled:opacity-50"
        >
          {saving ? t("echo.profile.saveLoading") : t("echo.profile.saveButton")}
        </button>
        <button
          onClick={onCancel}
          className="px-6 py-3 rounded-xl border border-white/10 text-sm font-semibold text-white/60 hover:bg-white/5 transition"
        >
          {t("common.cancel")}
        </button>
      </div>
    </div>
  );
}
