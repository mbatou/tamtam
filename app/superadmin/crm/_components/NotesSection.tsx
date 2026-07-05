"use client";

import { Plus, X } from "lucide-react";
import { NOTE_CONFIG, NotesSectionProps } from "./types";

export default function NotesSection({
  notes,
  loading,
  newNote,
  onNewNoteChange,
  newNoteType,
  onNewNoteTypeChange,
  onAdd,
  onDelete,
}: NotesSectionProps) {
  return (
    <div>
      <h4 className="font-dm text-[10px] uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>Notes</h4>
      {loading ? (
        <div className="font-dm text-sm py-4 text-center" style={{ color: "rgba(255,255,255,0.2)" }}>Chargement...</div>
      ) : notes.length === 0 ? (
        <div className="font-dm text-sm py-4 text-center" style={{ color: "rgba(255,255,255,0.2)" }}>Aucune note</div>
      ) : (
        <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
          {notes.map(note => {
            const nc = NOTE_CONFIG[note.note_type] || NOTE_CONFIG.note;
            return (
              <div key={note.id} className="rounded-lg p-3 group" style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-dm text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: nc.bg, color: nc.color }}>{nc.label}</span>
                      <span className="font-dm text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>{new Date(note.created_at).toLocaleDateString("fr-FR")}</span>
                    </div>
                    <p className="font-dm text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>{note.content}</p>
                  </div>
                  <button onClick={() => onDelete(note.id)}
                    className="opacity-0 group-hover:opacity-100 transition p-1" style={{ color: "rgba(255,255,255,0.2)" }}>
                    <X size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="flex gap-2">
        <select value={newNoteType} onChange={e => onNewNoteTypeChange(e.target.value)}
          className="rounded-lg px-2 py-2 font-dm text-xs focus:outline-none"
          style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
          <option value="note">Note</option>
          <option value="call">Appel</option>
          <option value="email">Email</option>
          <option value="followup">Suivi</option>
          <option value="meeting">Réunion</option>
        </select>
        <input value={newNote} onChange={e => onNewNoteChange(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") onAdd(); }}
          placeholder="Ajouter une note..."
          className="flex-1 rounded-lg px-3 py-2 font-dm text-sm focus:outline-none transition"
          style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "#fff" }} />
        <button onClick={onAdd} disabled={!newNote.trim()}
          className="px-4 py-2 rounded-lg font-dm text-sm font-bold transition disabled:opacity-30"
          style={{ background: "#D35400", color: "#fff" }}>
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
