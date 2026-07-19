"use client";

// Hard Step-Up — matches the SentinelIQ redesign reference: a white card rising
// over a dimmed background, SentinelIQ shield badge + HIGH RISK tag, "Why am I
// seeing this?" breakdown. Low trust-score transfers require facial verification
// (confirming the same face as the account holder), not an OTP — the check
// happens on-device, so there is no server round-trip here (mirrors how
// SoftStepUp confirms locally).

import { useState } from "react";
import type { OverlayProps } from "./SoftStepUp";
import { alertText } from "@/lib/alertText";

// Trust-engine signal keys → human-readable labels for the "Why am I seeing this?"
// breakdown. Keys match the `signals` array from the /api/trust-score response.
const SIGNAL_LABELS: Record<string, string> = {
  new_device: "New device detected",
  new_location: "Unfamiliar location",
  unusual_hour: "Unusual hour",
  large_amount: "Large transfer amount",
  unknown_recipient: "First-time recipient",
  new_recipient_high_amount: "Large payment to a new recipient",
  impossible_travel: "Impossible travel detected",
  typing_rhythm: "Unusual typing rhythm",
};

interface HardStepUpProps extends OverlayProps {
  /** Plain-language reason from the trust engine (why this fired). */
  explanation?: string;
  /** Signal keys from the trust-score API response. */
  signals?: string[];
  /** Called once facial verification confirms the account holder's identity. */
  onVerified?: () => void;
}

export default function HardStepUp({
  open,
  onClose,
  onVerified,
  explanation,
  signals,
  level,
}: HardStepUpProps) {
  const [confirming, setConfirming] = useState(false);

  if (!open) return null;

  const labels = (signals ?? []).map((s) => SIGNAL_LABELS[s] || s.replace(/_/g, " "));

  function confirm() {
    setConfirming(true);
    // Biometric auth is verified by the device's OS, not the bank server —
    // simulate that on-device check, then hand off to the caller.
    setTimeout(() => {
      setConfirming(false);
      onVerified?.();
    }, 700);
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-u360-navy/40" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white px-6 pb-9 pt-5 shadow-[0_-8px_30px_rgba(0,0,0,0.18)]">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-slate-200" />

        <div className="flex items-center gap-2">
          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-u360-navy text-xs text-white">
            🛡
          </span>
          <span className="font-heading text-xs font-extrabold tracking-wide text-u360-navy">
            SentinelIQ
          </span>
          <span
            className="ml-auto rounded-full px-2.5 py-1 text-[10.5px] font-extrabold tracking-wide"
            style={{ background: "#F6D9C8", color: "#C1592E" }}
          >
            HIGH RISK
          </span>
        </div>

        <p className="mt-3.5 text-[13px] leading-relaxed text-[#33475A]">
          {alertText("hard_step_up", level)}
        </p>

        {/* Why am I seeing this? — the exact signals that tripped the step-up. */}
        {labels.length > 0 && (
          <div className="mt-3 rounded-lg border border-u360 bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-u360-muted-2">
              Why am I seeing this?
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {labels.map((label) => (
                <li
                  key={label}
                  className="rounded-full px-2.5 py-1 text-xs"
                  style={{ background: "#F6D9C8", color: "#C1592E" }}
                >
                  {label}
                </li>
              ))}
            </ul>
            {explanation && <p className="mt-2 text-xs text-u360-muted-2">{explanation}</p>}
          </div>
        )}

        <div className="mt-3.5 flex flex-col items-center rounded-xl bg-u360-page p-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-u360-blue/15 text-3xl">
            🙂
          </div>
          <p className="mt-2.5 text-center text-xs leading-snug text-u360-muted">
            Run a quick facial scan to confirm it&apos;s really you before this goes through
          </p>
        </div>

        <div className="mt-4 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-[22px] border border-u360-border-2 py-[13px] text-[13.5px] font-bold text-[#33475A] transition-colors hover:bg-u360-page"
          >
            Cancel Transfer
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={confirming}
            className="flex-1 rounded-[22px] bg-u360-blue py-[13px] text-[13.5px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {confirming ? "Verifying…" : "Verify My Face"}
          </button>
        </div>
      </div>
    </div>
  );
}
