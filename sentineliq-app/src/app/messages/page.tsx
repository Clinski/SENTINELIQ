"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { scanMessage, type ScanResult } from "@/lib/api";
import { MESSAGES, type Message } from "@/lib/placeholderData";
import ScamAlert from "@/components/overlays/ScamAlert";

interface Scanned {
  result: ScanResult;
}

export default function MessagesPage() {
  const { token, effectiveLevel } = useAuth();
  const [inbox, setInbox] = useState<Message[]>(MESSAGES);
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
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
      <p className="mt-1 text-sm text-slate-500">
        Inbox — SMS &amp; alerts. Tap <span className="font-medium text-ubblue">Scan</span> to run
        a message through the fraud detector.
      </p>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <ul className="mt-6 space-y-3">
        {inbox.map((msg) => {
          const scan = scans[msg.id]?.result;
          return (
            <li
              key={msg.id}
              className={`rounded-xl border bg-white p-4 shadow-sm ${
                scan?.intent === "suspicious"
                  ? "border-red-300"
                  : scan?.intent === "legitimate"
                    ? "border-emerald-300"
                    : "border-slate-200"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-slate-800">{msg.sender}</span>
                <span className="shrink-0 text-xs text-slate-400">{msg.timestamp}</span>
              </div>
              <p className="mt-1.5 text-sm text-slate-600">{msg.body}</p>

              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => receive(msg)}
                  disabled={scanning === msg.id}
                  className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-60"
                >
                  {scanning === msg.id ? "Scanning…" : scan ? "Re-scan" : "Scan"}
                </button>
                {scan && (
                  <span
                    className={`text-xs font-medium ${
                      scan.intent === "suspicious" ? "text-red-600" : "text-emerald-600"
                    }`}
                  >
                    {scan.intent === "suspicious" ? "⚠ Suspicious" : "✓ Looks legitimate"} ·
                    urgency {scan.urgency_score}/10
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <ScamAlert
        open={alert !== null}
        result={alert?.result ?? null}
        sender={alert?.sender}
        level={effectiveLevel}
        onClose={() => setAlert(null)}
      />
    </main>
  );
}
