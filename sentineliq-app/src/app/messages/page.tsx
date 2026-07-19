"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { scanMessage, type ScanResult } from "@/lib/api";
import { type Message } from "@/lib/placeholderData";
import { useInbox } from "@/lib/useInbox";
import ScamAlert from "@/components/overlays/ScamAlert";

interface Scanned {
  result: ScanResult;
}

export default function MessagesPage() {
  const { token, effectiveLevel } = useAuth();
  // Static demo messages + any OTP SentinelIQ has "texted" this user (e.g. from
  // a Soft Step-Up during a transfer) — shared with the in-flow Messages drawer
  // so an OTP reads identically wherever it's checked from.
  const inbox = useInbox(token);
  const [scans, setScans] = useState<Record<string, Scanned>>({});
  const [scanning, setScanning] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ result: ScanResult; sender: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // "Receive" a message → run it through Builder C's NLP scanner. On a suspicious
  // verdict, pop the scam alert overlay with the plain-language reason.
  async function receive(msg: Message) {
    setScanning(msg.id);
    setError(null);
    try {
      const result = await scanMessage(msg.body, token ?? undefined);
      setScans((s) => ({ ...s, [msg.id]: { result } }));
      if (result.intent === "suspicious") {
        setAlert({ result, sender: msg.sender });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(null);
    }
  }

  return (
    <div className="min-h-screen bg-u360-page">
      <div className="mx-auto max-w-2xl px-6 pt-8">
        <div className="flex items-center gap-2">
          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-u360-navy text-xs text-white">
            🛡
          </span>
          <span className="font-heading text-xs font-extrabold tracking-wide text-u360-navy">
            SentinelIQ · Device Protection
          </span>
        </div>

        <h1 className="font-heading mt-3 text-base font-bold text-u360-navy">Messages</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-u360-muted">
          This isn&apos;t an inbox inside Union360 — Nigerian banks already protect their own
          in-app messages. This screen shows how SentinelIQ can also run at the{" "}
          <span className="font-semibold text-u360-navy">phone/SMS level</span>, scanning texts
          system-wide so you&apos;re protected everywhere, not just inside one banking app. Tap{" "}
          <span className="font-semibold text-u360-blue">Scan</span> to run a message through the
          fraud detector.
        </p>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <ul className="mt-6 flex flex-col gap-3 pb-10">
          {inbox.map((msg) => {
            const scan = scans[msg.id]?.result;
            const suspicious = scan?.intent === "suspicious";
            const legit = scan?.intent === "legitimate";
            return (
              <li
                key={msg.id}
                className="rounded-2xl bg-white p-4 shadow-[0_6px_18px_rgba(11,42,69,0.06)]"
                style={
                  suspicious
                    ? { boxShadow: "0 0 0 1px rgba(166,51,51,0.35)" }
                    : legit
                      ? { boxShadow: "0 0 0 1px rgba(46,156,90,0.3)" }
                      : undefined
                }
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13.5px] font-semibold text-u360-navy">{msg.sender}</span>
                  <span className="shrink-0 text-[11px] text-u360-muted-2">{msg.timestamp}</span>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-u360-muted">{msg.body}</p>

                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => receive(msg)}
                    disabled={scanning === msg.id}
                    className="rounded-full border border-u360-border-2 px-3.5 py-1.5 text-xs font-medium text-u360-navy transition-colors hover:bg-u360-page disabled:opacity-60"
                  >
                    {scanning === msg.id ? "Scanning…" : scan ? "Re-scan" : "Scan"}
                  </button>
                  {scan && (
                    <span
                      className="text-xs font-medium"
                      style={{ color: suspicious ? "#A63333" : "#2E9C5A" }}
                    >
                      {suspicious ? "⚠ Suspicious" : "✓ Looks legitimate"} · urgency{" "}
                      {scan.urgency_score}/10
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <ScamAlert
        open={alert !== null}
        result={alert?.result ?? null}
        sender={alert?.sender}
        level={effectiveLevel}
        onClose={() => setAlert(null)}
      />
    </div>
  );
}
