"use client";

// Breach Alert — matches the SentinelIQ redesign reference: full-screen maroon
// stop with the shield badge, warning icon, detail rows, and a single Contact
// Support action. Highest-severity overlay, hidden by default. Fires globally
// from the `decoy-touched` Socket.IO event (see BreachWatcher), showing the
// live access-trace of whoever tripped the honeytoken.

import type { OverlayProps } from "./SoftStepUp";
import type { DecoyTrace } from "@/components/BreachWatcher";
import { alertText } from "@/lib/alertText";

interface BreachAlertProps extends OverlayProps {
  trace?: DecoyTrace | null;
}

export default function BreachAlert({ open, onClose, trace, level }: BreachAlertProps) {
  if (!open) return null;

  const rows: [string, string | undefined][] = [
    ["Detected", trace?.ts ? new Date(trace.ts).toLocaleTimeString() : "Just now"],
    ["Access point", trace?.device || "Unrecognized device"],
    ["Field triggered", trace?.account ? `Decoy account · ${trace.account}` : "Decoy account no."],
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col px-6 pb-11 pt-16 text-white"
      style={{ background: "#5C1414" }}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-[13px]" style={{ color: "#8C1F1F" }}>
          🛡
        </span>
        <span className="font-heading text-xs font-extrabold tracking-wide">SentinelIQ</span>
      </div>

      <div className="mt-9 text-center">
        <div className="mx-auto mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white/10 text-4xl">
          ⚠
        </div>
        <h2 className="font-heading text-xl font-extrabold tracking-wide">BREACH DETECTED</h2>
      </div>

      <p className="mt-[18px] text-center text-[13.5px] leading-relaxed text-white/90">
        {alertText("decoy_breach", level)}
      </p>

      <div className="mt-6 rounded-2xl bg-white/10 p-4">
        <dl className="space-y-2">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between text-xs text-white/75">
              <dt>{k}</dt>
              <dd className="text-white">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-auto rounded-[24px] bg-white py-[15px] font-heading text-[14.5px] font-bold transition-colors hover:bg-white/90"
        style={{ color: "#5C1414" }}
      >
        Contact Support
      </button>
    </div>
  );
}
