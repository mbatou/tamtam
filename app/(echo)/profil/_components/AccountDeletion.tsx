"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n";

export default function AccountDeletion() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { t } = useTranslation();

  return (
    <>
      {/* Danger zone */}
      <div className="mt-8 border-t border-red-500/20 pt-6 mb-5">
        <h3 className="text-red-400 font-bold text-sm mb-2">{t("echo.profile.dangerZone")}</h3>
        <p className="text-white/30 text-xs mb-3">{t("echo.profile.deleteDescription")}</p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-xl text-xs hover:bg-red-500/20 transition"
        >
          {t("echo.profile.deleteAccount")}
        </button>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#111128] border border-red-500/30 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-red-400 font-bold text-lg mb-2">{t("echo.profile.deleteConfirm")}</h3>
            <p className="text-white/40 text-sm mb-4">{t("echo.profile.deleteIrreversible")}</p>

            {deleteError === "balance_remaining" && (
              <div className="bg-[#D35400]/10 border border-[#D35400]/30 rounded-lg p-3 mb-4">
                <div className="text-[#D35400] text-sm">{t("echo.profile.balanceWarning")}</div>
              </div>
            )}

            {deleteError && deleteError !== "balance_remaining" && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                <div className="text-red-400 text-sm">{deleteError}</div>
              </div>
            )}

            <div className="mb-4">
              <label className="text-white/30 text-xs mb-1 block">{t("echo.profile.typeToConfirm")}</label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={e => setDeleteConfirmation(e.target.value)}
                placeholder="SUPPRIMER"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500 transition"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmation(""); setDeleteError(null); }}
                className="flex-1 bg-white/5 text-white/60 py-2.5 rounded-lg text-sm hover:bg-white/10 transition"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={async () => {
                  setDeleting(true);
                  setDeleteError(null);
                  try {
                    const res = await fetch("/api/account/delete", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ confirmation: deleteConfirmation }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      window.location.href = "/";
                    } else {
                      setDeleteError(data.error === "balance_remaining" ? "balance_remaining" : data.message || data.error);
                    }
                  } catch {
                    setDeleteError(t("common.networkRetry"));
                  }
                  setDeleting(false);
                }}
                disabled={deleting || deleteConfirmation !== "SUPPRIMER"}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
                  deleteConfirmation === "SUPPRIMER" && !deleting
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-white/5 text-white/20 cursor-not-allowed"
                }`}
              >
                {deleting ? t("echo.profile.deleting") : t("echo.profile.deleteButton")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
