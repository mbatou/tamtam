"use client";

import { useTranslation } from "@/lib/i18n";

export default function CancelConfirmModal({
  onContinueEditing,
  onSaveDraft,
  onQuitWithout,
}: {
  onContinueEditing: () => void;
  onSaveDraft: () => void;
  onQuitWithout: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="rounded-2xl p-6 max-w-md w-full" style={{ background: "#111128", border: "0.5px solid rgba(255,255,255,0.08)" }}>
        <h3 className="text-white font-bold text-lg mb-2">{t("admin.campaigns.cancelConfirm")}</h3>
        <p className="text-white/40 text-sm mb-6">
          {t("admin.campaigns.cancelMessage")}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onContinueEditing}
            className="flex-1 py-2.5 rounded-lg bg-white/5 text-white/60 text-sm hover:bg-white/10 transition"
          >
            {t("admin.campaigns.continueEditing")}
          </button>
          <button
            onClick={onSaveDraft}
            className="flex-1 py-2.5 rounded-lg bg-white/10 text-white text-sm hover:bg-white/15 transition"
          >
            {t("admin.campaigns.saveDraft")}
          </button>
          <button
            onClick={onQuitWithout}
            className="flex-1 py-2.5 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition"
          >
            {t("admin.campaigns.quitWithout")}
          </button>
        </div>
      </div>
    </div>
  );
}
