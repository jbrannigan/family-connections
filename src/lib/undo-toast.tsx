"use client";

import { useUndo } from "./undo";

/**
 * Fixed bottom-right toast that appears after each undoable mutation.
 * Shows action description + "Undo" button. Auto-dismisses after 5 seconds.
 */
export default function UndoToastDisplay() {
  const { toast, dismissToast, performUndo, canUndo } = useUndo();

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[60] animate-in slide-in-from-bottom-4 fade-in duration-200">
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0f1a14] px-4 py-3 shadow-2xl">
        <span className="text-sm text-white/80">{toast.message}</span>
        {toast.type === "undo" && canUndo && (
          <button
            onClick={() => {
              performUndo();
            }}
            className="shrink-0 rounded-lg bg-[#7fdb9a]/20 px-3 py-1 text-sm font-semibold text-[#7fdb9a] transition hover:bg-[#7fdb9a]/30"
          >
            Undo
          </button>
        )}
        <button
          onClick={dismissToast}
          className="shrink-0 text-white/30 transition hover:text-white/60"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
