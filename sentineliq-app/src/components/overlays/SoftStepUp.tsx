"use client";

// Soft Step-Up: low-friction biometric confirmation prompt. Styled to match the
// Union360/SentinelIQ redesign language (white card, shield badge) at a lower
// severity than the Hard Step-Up / Breach overlays — no reference frame shows
// this exact screen, so it follows the same visual system rather than a 1:1 crop.
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-u360-navy/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-[0_12px_30px_rgba(11,42,69,0.18)]">
        <div className="flex items-center justify-center gap-2">
          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-u360-navy text-xs text-white">
            🛡
          </span>
          <span className="font-heading text-xs font-extrabold tracking-wide text-u360-navy">
            SentinelIQ
          </span>
        </div>

        <div className="mx-auto mt-4 flex h-16 w-16 items-center justify-center rounded-full bg-u360-blue/15">
          <span className="text-3xl" aria-hidden>
            🖐️
          </span>
        </div>
        <h2 className="font-heading mt-4 text-lg font-bold text-u360-navy">Confirm it&apos;s you</h2>
        <p className="mt-2 text-sm text-u360-muted">{alertText("soft_step_up", level)}</p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={onClose}
            className="rounded-[22px] bg-u360-blue py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            Scan biometrics
          </button>
          <button
            onClick={onClose}
            className="rounded-lg py-2 text-sm text-u360-muted transition-colors hover:text-u360-navy"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
