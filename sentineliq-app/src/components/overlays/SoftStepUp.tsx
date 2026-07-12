"use client";

// Soft Step-Up: low-friction biometric confirmation prompt.
// Copy adapts to the user's tech_literacy_level via `level`.

import { alertText } from "@/lib/alertText";

export interface OverlayProps {
  open: boolean;
  onClose: () => void;
  /** DB tech_literacy_level — selects the demographic copy variant. */
  level?: string | null;
}

export default function SoftStepUp({ open, onClose, level }: OverlayProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 text-center shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/15">
          <span className="text-3xl" aria-hidden>
            🖐️
          </span>
        </div>
        <h2 className="mt-4 text-lg font-semibold text-white">Confirm it&apos;s you</h2>
        <p className="mt-2 text-sm text-slate-400">{alertText("soft_step_up", level)}</p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={onClose}
            className="rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-medium text-slate-950 transition-colors hover:bg-cyan-400"
          >
            Scan biometrics
          </button>
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-slate-400 transition-colors hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
