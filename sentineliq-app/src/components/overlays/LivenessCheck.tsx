"use client";

// Liveness Check — last resort before a transfer is fully blocked. Instead of a
// dead-end "contact your bank," walks the user through a short guided facial
// verification (no camera wired up here — steps auto-advance to simulate the
// on-device check) so a genuine user isn't just locked out.

import { useEffect, useState } from "react";
import type { OverlayProps } from "./SoftStepUp";

interface LivenessCheckProps extends OverlayProps {
  /** Called once all steps complete. */
  onVerified?: () => void;
}

const STEPS = [
  { icon: "🙂", instruction: "Center your face in the frame" },
  { icon: "👈", instruction: "Slowly turn your head left" },
  { icon: "👉", instruction: "Slowly turn your head right" },
  { icon: "👄", instruction: "Open your mouth" },
];

const STEP_MS = 1300;

export default function LivenessCheck({ open, onClose, onVerified }: LivenessCheckProps) {
  const [step, setStep] = useState(0);
  const done = step >= STEPS.length;

  useEffect(() => {
    if (!open) return;
    if (done) {
      const t = setTimeout(() => onVerified?.(), 900);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [open, step, done, onVerified]);

  if (!open) return null;

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-u360-navy/40" />
      <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-6 pb-9 pt-5 shadow-[0_-8px_30px_rgba(0,0,0,0.18)]">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-slate-200" />

        <div className="flex items-center gap-2">
          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-u360-navy text-xs text-white">
            🛡
          </span>
          <span className="font-heading text-xs font-extrabold tracking-wide text-u360-navy">
            SentinelIQ
          </span>
        </div>

        <h2 className="font-heading mt-3 text-lg font-bold text-u360-navy">Verify it&apos;s you</h2>
        <p className="mt-1 text-[13px] text-u360-muted">
          This one needs a closer look. Follow the steps below.
        </p>

        <div className="mt-6 flex flex-col items-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-u360-blue/15 text-5xl">
            {done ? "✅" : current.icon}
          </div>
          <p className="mt-4 text-center text-sm font-medium text-u360-navy">
            {done ? "Verified — sending your transfer" : current.instruction}
          </p>

          <div className="mt-5 flex gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className="h-1.5 w-6 rounded-full transition-colors"
                style={{ background: done || i < step ? "#42B4E6" : i === step ? "#8FD3ED" : "#E4EEF3" }}
              />
            ))}
          </div>
        </div>

        {!done && (
          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full rounded-[22px] border border-u360-border-2 py-[13px] text-[13.5px] font-bold text-[#33475A] transition-colors hover:bg-u360-page"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
