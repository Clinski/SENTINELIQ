"use client";

import { useEffect, useRef, useState } from "react";
import { getSocket, onEvent, EVENTS } from "@/lib/socket";
import { getFieldMap, type FieldMap } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

// Alert-language options for the demo toggle. Values are DB literacy levels so they
// flow straight through alertText()'s mapping; null = follow the user's profile.
const LANG_OPTIONS: { value: string; label: string }[] = [
  { value: "auto", label: "Auto (user profile)" },
  { value: "high", label: "Tech-Native" },
  { value: "standard", label: "Standard" },
  { value: "low", label: "Elderly" },
];

// Each panel keeps a rolling log of the latest events streamed from Builder B.
interface FeedItem {
  id: number;
  text: string;
  tone: "ok" | "warn" | "bad";
  ts: number;
}

const MAX_ROWS = 8;

export default function AdminPage() {
  const [connected, setConnected] = useState(false);
  const [trustFeed, setTrustFeed] = useState<FeedItem[]>([]);
  const [scanFeed, setScanFeed] = useState<FeedItem[]>([]);
  const [decoyFeed, setDecoyFeed] = useState<FeedItem[]>([]);
  const [risk, setRisk] = useState<{ level: string; reasons: string[] } | null>(null);
  const [fieldMap, setFieldMap] = useState<FieldMap | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [trippedTypes, setTrippedTypes] = useState<Set<string>>(new Set());
  const idRef = useRef(0);
  const { token, ready, alertLevel, setAlertLevel } = useAuth();

  // Load the field map (real vs decoy shadow fields) — privileged, needs a token.
  useEffect(() => {
    if (!ready) return;
    if (!token) {
      setMapError("Sign in to view the decoy map.");
      return;
    }
    getFieldMap(token)
      .then((m) => {
        setFieldMap(m);
        setMapError(null);
      })
      .catch((err) => setMapError(err.message || "Failed to load"));
  }, [ready, token]);

  // Demo reset — clear all panels and reload the (rotated) field map.
  useEffect(() => {
    const socket = getSocket();
    const onReset = () => {
      setTrustFeed([]);
      setScanFeed([]);
      setDecoyFeed([]);
      setTrippedTypes(new Set());
      setRisk({ level: "low", reasons: [] });
      if (token) getFieldMap(token).then(setFieldMap).catch(() => {});
    };
    socket.on("demo-reset", onReset);
    return () => {
      socket.off("demo-reset", onReset);
    };
  }, [token]);

  useEffect(() => {
    const socket = getSocket();
    const push = (
      setter: React.Dispatch<React.SetStateAction<FeedItem[]>>,
      text: string,
      tone: FeedItem["tone"],
    ) =>
      setter((rows) =>
        [{ id: ++idRef.current, text, tone, ts: Date.now() }, ...rows].slice(0, MAX_ROWS),
      );

    setConnected(socket.connected);
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    // trust-score-update → Trust Score Feed (with full signals breakdown)
    const offTrust = onEvent(socket, EVENTS.trustScore, (p) => {
      const d = (p ?? {}) as { user?: string; score?: number; signals?: string[] };
      const score = d.score ?? 0;
      const sig = d.signals?.length ? ` [${d.signals.join(", ")}]` : "";
      push(
        setTrustFeed,
        `${d.user ?? "user"} → trust ${score}/100${sig}`,
        score >= 80 ? "ok" : score >= 40 ? "warn" : "bad",
      );
    });

    // message-scanned → Message Scan Log
    const offScan = onEvent(socket, EVENTS.messageScanned, (p) => {
      const d = (p ?? {}) as { verdict?: string; intent?: string; messageId?: string };
      const verdict = d.verdict ?? d.intent ?? "clean";
      const bad = verdict === "scam" || verdict === "suspicious";
      push(
        setScanFeed,
        `${d.messageId ?? "msg"} → ${bad ? "SCAM" : "clean"}`,
        bad ? "bad" : "ok",
      );
    });

    // decoy-touched → Decoy Status + light up the tripped shadow field on the map
    const offDecoy = onEvent(socket, EVENTS.decoyTouched, (p) => {
      const d = (p ?? {}) as { account?: string; state?: string; field_type?: string };
      const tripped = d.state === "tripped" || d.state === undefined;
      push(
        setDecoyFeed,
        `${d.field_type ? d.field_type + " " : ""}${d.account ?? "decoy"} → ${tripped ? "TRIPPED" : "armed"}`,
        tripped ? "bad" : "ok",
      );
      if (tripped && d.field_type) {
        setTrippedTypes((prev) => new Set(prev).add(d.field_type!));
      }
    });

    // risk-level-change → Fused Risk Level (only fires on a real transition)
    const offRisk = onEvent(socket, EVENTS.riskLevel, (p) => {
      const d = (p ?? {}) as { level?: string; reasons?: string[] };
      setRisk({ level: (d.level ?? "LOW").toLowerCase(), reasons: d.reasons ?? [] });
    });

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      offTrust();
      offScan();
      offDecoy();
      offRisk();
    };
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Judge Dashboard</h1>
          <p className="mt-0.5 text-base text-slate-500">SentinelIQ · live security operations feed</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Demographic alert language toggle — affects all future alerts this session. */}
          <label className="flex items-center gap-2 text-sm text-slate-500">
            <span className="hidden sm:inline">Alert language</span>
            <select
              value={alertLevel ?? "auto"}
              onChange={(e) => setAlertLevel(e.target.value === "auto" ? null : e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-ubblue"
            >
              {LANG_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <span
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
              connected
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-slate-300 text-slate-500"
            }`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${connected ? "animate-pulse bg-emerald-400" : "bg-slate-600"}`}
            />
            {connected ? "Live" : "Connecting…"}
          </span>
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <FeedPanel title="Trust Score Feed" hint="Live per-user trust scores" items={trustFeed} />
        <FeedPanel title="Message Scan Log" hint="NLP scam-classification events" items={scanFeed} />
        <FeedPanel title="Decoy Status" hint="Honeytoken access events" items={decoyFeed} />
        <RiskPanel risk={risk} />
      </div>

      <DecoyMap map={fieldMap} tripped={trippedTypes} error={mapError} />
    </main>
  );
}

// The "decoy map": real fields the app serves vs the shadow decoy layer that lives
// only in a breach-reachable namespace. Rendered as two visibly separate columns.
function DecoyMap({
  map,
  tripped,
  error,
}: {
  map: FieldMap | null;
  tripped: Set<string>;
  error: string | null;
}) {
  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold text-slate-900">Decoy Map</h2>
        <span className="text-xs text-slate-400">shadow fields live outside the user surface</span>
      </div>

      {!map && error && (
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
          {error}
        </p>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {/* Real layer */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Real fields · served to the app
          </p>
          <dl className="space-y-2 text-sm">
            {(map?.real ?? []).map((f) => (
              <div key={f.label} className="flex justify-between gap-4">
                <dt className="text-slate-500">{f.label}</dt>
                <dd className="font-mono text-slate-800">{f.value}</dd>
              </div>
            ))}
            {!map && !error && <p className="text-sm text-slate-400">Loading…</p>}
          </dl>
        </div>

        {/* Shadow / decoy layer — visually distinct: dashed, amber, "ghost" */}
        <div className="rounded-xl border border-dashed border-amber-400 bg-amber-50 p-4">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
            <span aria-hidden>👻</span> Decoy shadow fields · never shown to users
          </p>
          <ul className="space-y-2 text-sm">
            {(map?.decoy ?? []).map((d) => {
              const hot = tripped.has(d.field_type) || d.trips > 0;
              return (
                <li
                  key={d.id}
                  className={`flex items-center justify-between gap-4 rounded-lg px-2 py-1.5 ${
                    hot ? "bg-red-100 ring-1 ring-red-300" : ""
                  }`}
                >
                  <span className="text-slate-500">{d.field_type}</span>
                  <span className="font-mono text-slate-700">{d.value_masked}</span>
                  {hot ? (
                    <span className="rounded-full bg-red-200 px-2 py-0.5 text-xs font-semibold text-red-700">
                      TRIPPED{d.trips > 0 ? ` ×${d.trips}` : ""}
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs text-amber-800">
                      armed
                    </span>
                  )}
                </li>
              );
            })}
            {!map && !error && <p className="text-sm text-slate-400">Loading…</p>}
          </ul>
        </div>
      </div>

      <p className="mt-4 rounded-lg bg-slate-100 p-3 text-xs text-slate-500">
        Decoys are stored in a separate table and never appear in the user UI or any
        legitimate API response. They only exist in the layer a breach would reach —
        so any touch of a shadow field is, by definition, an intrusion.
      </p>
    </section>
  );
}

function toneClass(tone: FeedItem["tone"]) {
  return tone === "bad"
    ? "text-red-600"
    : tone === "warn"
      ? "text-amber-600"
      : "text-emerald-600";
}

function FeedPanel({
  title,
  hint,
  items,
}: {
  title: string;
  hint: string;
  items: FeedItem[];
}) {
  return (
    <section className="flex min-h-56 flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <span
          className={`h-2.5 w-2.5 rounded-full ${items.length ? "bg-ubblue" : "bg-slate-300"}`}
          aria-hidden
        />
      </div>
      <p className="text-sm text-slate-500">{hint}</p>

      {items.length === 0 ? (
        <div className="mt-4 flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 text-base text-slate-400">
          Waiting for events…
        </div>
      ) : (
        <ul className="mt-3 space-y-1.5 font-mono text-sm">
          {items.map((it) => (
            <li key={it.id} className="flex justify-between gap-3">
              <span className={toneClass(it.tone)}>{it.text}</span>
              <span className="shrink-0 text-slate-400">
                {new Date(it.ts).toLocaleTimeString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RiskPanel({ risk }: { risk: { level: string; reasons: string[] } | null }) {
  const level = risk?.level ?? "—";
  const color =
    level === "critical"
      ? "from-red-700 to-rose-950 border-red-400/70 animate-pulse"
      : level === "high"
        ? "from-red-600 to-red-800 border-red-500/50"
        : level === "medium"
          ? "from-amber-600 to-amber-800 border-amber-500/50"
          : level === "low"
            ? "from-emerald-600 to-emerald-800 border-emerald-500/50"
            : "from-slate-400 to-slate-500 border-slate-300";

  return (
    <section
      className={`flex min-h-56 flex-col rounded-2xl border bg-gradient-to-br ${color} p-6`}
    >
      <h2 className="text-lg font-semibold text-white">Fused Risk Level</h2>
      <p className="text-sm text-white/70">Aggregate risk across signals</p>
      <div className="mt-4 flex flex-1 flex-col items-center justify-center text-center">
        <span className="text-6xl font-black uppercase tracking-tight text-white drop-shadow">
          {level}
        </span>
        {risk && risk.reasons.length > 0 && (
          <span className="mt-2 text-sm text-white/90">{risk.reasons.join(" · ")}</span>
        )}
      </div>
    </section>
  );
}
