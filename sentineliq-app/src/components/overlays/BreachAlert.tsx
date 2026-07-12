"use client";

// Breach Alert: red full-screen, highest-severity stop. Hidden by default.
// Fires globally from the `decoy-touched` Socket.IO event (see BreachWatcher),
// showing the live access-trace of whoever tripped the honeytoken.

import type { OverlayProps } from "./SoftStepUp";
import type { DecoyTrace } from "@/components/BreachWatcher";
import { alertText } from "@/lib/alertText";

interface BreachAlertProps extends OverlayProps {
  trace?: DecoyTrace | null;
}

export default function BreachAlert({ open, onClose, trace, level }: BreachAlertProps) {
  if (!open) return null;

  const rows: [string, string | undefined][] = [
    ["Decoy account", trace?.account],
    ["Source IP", trace?.ip],
    ["Location", trace?.location],
    ["Device", trace?.device],
    ["Detected", trace?.ts ? new Date(trace.ts).toLocaleTimeString() : undefined],
  ];
  const hasTrace = rows.some(([, v]) => v);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-red-700 p-6 text-center text-white">
      <span className="animate-pulse text-6xl" aria-hidden>
        🛑
      </span>
      <h2 className="mt-4 text-3xl font-black tracking-tight">Security breach detected</h2>
      <p className="mt-3 max-w-md text-red-100">{alertText("decoy_breach", level)}</p>

      {hasTrace && (
        <div className="mt-6 w-full max-w-sm rounded-xl border border-white/30 bg-red-800/60 p-4 text-left text-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-200">
            Intruder access trace
          </p>
          <dl className="space-y-1">
            {rows
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-red-200">{k}</dt>
                  <dd className="font-mono text-white">{v}</dd>
                </div>
              ))}
          </dl>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50"
        >
          Freeze my account
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-white/60 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
