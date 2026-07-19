"use client";

// Scam-message alert — matches the SentinelIQ redesign reference: a red banner
// that drops over whatever screen is open, with the SentinelIQ shield badge,
// plain-language reason, and Dismiss / Report actions.
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
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-u360-navy/20" onClick={onClose} />
      <div
        className="absolute inset-x-0 top-0 px-5 pb-[18px] pt-6 shadow-[0_10px_24px_rgba(166,51,51,0.3)]"
        style={{ background: "#A63333" }}
      >
        <div className="mx-auto flex max-w-md flex-col">
          <div className="mb-2.5 flex items-center gap-2">
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-white text-xs" style={{ color: "#A63333" }}>
              🛡
            </span>
            <span className="font-heading text-[11.5px] font-extrabold tracking-wide text-white">
              SentinelIQ
            </span>
            <span className="ml-auto rounded-full bg-white/15 px-2 py-1 text-xs font-medium text-white/90">
              Urgency {result.urgency_score}/10
            </span>
          </div>

          <div className="font-heading mb-2 text-base font-extrabold text-white">Scam Alert</div>

          <p className="mb-3.5 text-[12.5px] leading-relaxed text-white/95">
            {body}
            {sender && <span className="block text-white/70">From {sender}</span>}
          </p>

          {result.reason && result.reason !== result.alert_text_standard && (
            <p className="mb-3.5 text-xs text-white/70">Why we flagged it: {result.reason}</p>
          )}

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-[20px] border border-white/50 py-2.5 text-[12.5px] font-bold text-white transition-colors hover:bg-white/10"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-[20px] bg-white py-2.5 text-[12.5px] font-bold transition-colors hover:bg-white/90"
              style={{ color: "#A63333" }}
            >
              Report This Message
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
