"use client";

import { useTranslation } from "@/lib/i18n";

export default function DeleteConfirmModal({
  deleting,
  onCancel,
  onConfirm,
}: {
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="rounded-2xl p-6 max-w-md w-full" style={{ background: "#111128", border: "0.5px solid rgba(239,68,68,0.15)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h3 className="text-white font-bold text-lg">{t("admin.campaigns.deleteTitle")}</h3>
        </div>
        <p className="text-white/60 text-sm mb-6">
          {t("admin.campaigns.deleteMessage")}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg bg-white/5 text-white/60 text-sm hover:bg-white/10 transition"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-lg bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30 transition disabled:opacity-50"
          >
            {deleting ? t("common.saving") : t("admin.campaigns.confirmDelete")}
          </button>
        </div>
      </div>
    </div>
  );
}
