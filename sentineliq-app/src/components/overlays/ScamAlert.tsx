"use client";

// Scam-message alert: fires when Builder C's NLP scanner classifies an incoming
// message as "suspicious". Shows the plain-language reason from the API so the
// user understands *why* it's dangerous. Not full-screen — it sits over the inbox.
import type { ScanResult } from "@/lib/api";
import { alertText, variantForLiteracy } from "@/lib/alertText";

interface ScamAlertProps {
  open: boolean;
  result: ScanResult | null;
  sender?: string;
  level?: string | null;
  onClose: () => void;
}

export default function ScamAlert({ open, result, sender, level, onClose }: ScamAlertProps) {
  if (!open || !result) return null;

  // Prefer the NLP's per-message copy for this user's variant; fall back to the
  // canonical phishing text, then to the raw reason.
  const variant = variantForLiteracy(level);
  const nlpText =
    variant === "tech"
      ? result.alert_text_tech
      : variant === "elderly"
        ? result.alert_text_elderly
        : result.alert_text_standard;
  const body = nlpText || alertText("phishing", level) || result.reason;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-red-500/50 bg-slate-900 p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>
            🚨
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">Suspicious message blocked</h2>
            {sender && <p className="text-xs text-slate-400">From {sender}</p>}
          </div>
          <span className="ml-auto rounded-full bg-red-500/15 px-2 py-1 text-xs font-medium text-red-300">
            Urgency {result.urgency_score}/10
          </span>
        </div>

        {/* Demographic alert copy — NLP per-message variant for this user's level. */}
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {body}
        </p>

        {result.reason && result.reason !== result.alert_text_standard && (
          <p className="mt-2 text-xs text-slate-500">Why we flagged it: {result.reason}</p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-medium text-slate-950 transition-colors hover:bg-cyan-400"
          >
            Got it — delete message
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-slate-400 transition-colors hover:text-white"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
