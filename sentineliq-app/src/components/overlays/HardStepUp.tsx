"use client";

// Hard Step-Up: action-bound OTP challenge. Shows the personalised OTP message
// ("OTP - 654231 to authorize your transfer of ₦X to Y…") plus a "Why am I seeing
// this?" breakdown, and verifies the code against the backend.

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
  /** Personalised, action-bound OTP message from /api/otp/send. */
  otpMessage?: string;
  /** Verify the entered code. Resolves ok/false with an optional error. */
  onVerify?: (code: string) => Promise<{ ok: boolean; error?: string }>;
  /** Called on successful verification. */
  onVerified?: () => void;
}

export default function HardStepUp({
  open,
  onClose,
  onVerify,
  onVerified,
  otpMessage,
  explanation,
  signals,
  level,
}: HardStepUpProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  if (!open) return null;

  const labels = (signals ?? []).map((s) => SIGNAL_LABELS[s] || s.replace(/_/g, " "));

  async function submit() {
    setError(null);
    if (!onVerify) {
      onVerified?.();
      return;
    }
    setVerifying(true);
    try {
      const res = await onVerify(code);
      if (res.ok) {
        setCode("");
        onVerified?.();
      } else {
        setError(res.error || "Incorrect code.");
      }
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-white p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>
            ⚠️
          </span>
          <h2 className="text-lg font-semibold text-slate-900">Extra verification needed</h2>
        </div>

        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {alertText("hard_step_up", level)}
        </p>

        {/* Personalised, action-bound OTP message (as it would arrive by SMS). */}
        {otpMessage && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Message from Union Bank
            </p>
            <p className="mt-1 text-sm text-slate-700">{otpMessage}</p>
          </div>
        )}

        {/* Why am I seeing this? — the exact signals that tripped the step-up. */}
        {labels.length > 0 && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Why am I seeing this?
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {labels.map((label) => (
                <li
                  key={label}
                  className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs text-amber-800"
                >
                  {label}
                </li>
              ))}
            </ul>
            {explanation && <p className="mt-2 text-xs text-slate-500">{explanation}</p>}
          </div>
        )}

        <label htmlFor="otp-code" className="mt-5 block text-sm font-medium text-slate-700">
          One-time code
        </label>
        <input
          id="otp-code"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="••••••"
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-center text-lg tracking-[0.5em] text-slate-900 outline-none focus:border-ubblue"
        />

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={verifying || code.length < 6}
            className="rounded-lg bg-ubblue px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ubblue-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {verifying ? "Verifying…" : "Verify & continue"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-slate-500 transition-colors hover:text-slate-800"
          >
            Cancel transfer
          </button>
        </div>
      </div>
    </div>
  );
}
