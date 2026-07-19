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
  primary: string;
  secondary: string;
  tone: "ok" | "warn" | "bad" | "critical";
  ts: number;
}

const MAX_ROWS = 8;

// Union360/SentinelIQ admin severity palette (from the redesign reference).
const TONE_STYLES: Record<FeedItem["tone"], { bg: string; text: string; label: string }> = {
  critical: { bg: "rgba(166,51,51,0.18)", text: "#E8605F", label: "Critical" },
  bad: { bg: "rgba(193,89,46,0.15)", text: "#E27A46", label: "High" },
  warn: { bg: "rgba(201,138,46,0.15)", text: "#E0A94B", label: "Medium" },
  ok: { bg: "rgba(46,156,90,0.15)", text: "#3DE58C", label: "Low" },
};

export default function AdminPage() {
  const [connected, setConnected] = useState(false);
  const [trustFeed, setTrustFeed] = useState<FeedItem[]>([]);
  const [scanFeed, setScanFeed] = useState<FeedItem[]>([]);
  const [decoyFeed, setDecoyFeed] = useState<FeedItem[]>([]);
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
      primary: string,
      secondary: string,
      tone: FeedItem["tone"],
    ) =>
      setter((rows) =>
        [{ id: ++idRef.current, primary, secondary, tone, ts: Date.now() }, ...rows].slice(
          0,
          MAX_ROWS,
        ),
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
      const sig = d.signals?.length ? d.signals.join(", ") : "no anomalies";
      push(
        setTrustFeed,
        `${d.user ?? "user"} · trust ${score}/100`,
        sig,
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
        d.messageId ?? "Message scan",
        bad ? "NLP flagged inbound SMS as scam" : "Classified clean",
        bad ? "bad" : "ok",
      );
    });

    // decoy-touched → Decoy Status + light up the tripped shadow field on the map
    const offDecoy = onEvent(socket, EVENTS.decoyTouched, (p) => {
      const d = (p ?? {}) as { account?: string; state?: string; field_type?: string };
      const tripped = d.state === "tripped" || d.state === undefined;
      push(
        setDecoyFeed,
        tripped ? "Decoy account accessed" : "Decoy field armed",
        `${d.field_type ? d.field_type + " · " : ""}${d.account ?? "decoy"} · session ${
          tripped ? "frozen" : "armed"
        }`,
        tripped ? "critical" : "ok",
      );
      if (tripped && d.field_type) {
        setTrippedTypes((prev) => new Set(prev).add(d.field_type!));
      }
    });

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      offTrust();
      offScan();
      offDecoy();
    };
  }, []);

  const allEvents = [...trustFeed, ...scanFeed, ...decoyFeed].sort((a, b) => b.ts - a.ts);
  const counts = {
    active: trustFeed.length + scanFeed.length + decoyFeed.length,
    low: allEvents.filter((e) => e.tone === "ok").length,
    medium: allEvents.filter((e) => e.tone === "warn").length,
    high: allEvents.filter((e) => e.tone === "bad").length,
    critical: allEvents.filter((e) => e.tone === "critical").length,
  };

  return (
    <div className="min-h-screen bg-u360-navy font-sans text-white">
      <div className="mx-auto max-w-6xl px-8 pb-8 pt-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-u360-blue text-sm text-u360-navy">
              🛡
            </span>
            <span className="font-heading text-[17px] font-extrabold text-white">
              SentinelIQ
              <span className="ml-2 text-xs font-semibold text-u360-admin-accent">ADMIN</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-u360-admin-accent">
              <span className="hidden sm:inline">Alert language</span>
              <select
                value={alertLevel ?? "auto"}
                onChange={(e) => setAlertLevel(e.target.value === "auto" ? null : e.target.value)}
                className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-white outline-none focus:border-u360-blue"
              >
                {LANG_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="text-u360-navy">
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <span className="text-xs text-u360-admin-accent">
              System health ·{" "}
              <span style={{ color: connected ? "#3DE58C" : "#8FA9BE" }}>●</span>{" "}
              {connected ? "Operational" : "Connecting…"}
            </span>
          </div>
        </div>

        {/* Stat tile row */}
        <div className="mt-5 flex flex-wrap gap-4">
          <StatTile value={counts.active} label="Active sessions" bg="rgba(255,255,255,0.06)" />
          <StatTile value={counts.low} label="Low" bg={TONE_STYLES.ok.bg} color={TONE_STYLES.ok.text} />
          <StatTile
            value={counts.medium}
            label="Medium"
            bg={TONE_STYLES.warn.bg}
            color={TONE_STYLES.warn.text}
          />
          <StatTile value={counts.high} label="High" bg={TONE_STYLES.bad.bg} color={TONE_STYLES.bad.text} />
          <StatTile
            value={counts.critical}
            label="Critical"
            bg={TONE_STYLES.critical.bg}
            color={TONE_STYLES.critical.text}
          />
        </div>

        {/* Live feeds */}
        <div className="mt-5 flex flex-wrap items-start gap-5">
          <Panel title="Live risk event feed" className="flex-[1.4] min-w-[320px]">
            {allEvents.length === 0 ? (
              <EmptyRow>Waiting for events…</EmptyRow>
            ) : (
              allEvents
                .slice(0, MAX_ROWS)
                .map((e, i) => <EventRow key={e.id} item={e} isLast={i === Math.min(allEvents.length, MAX_ROWS) - 1} />)
            )}
          </Panel>

          <Panel title="Honeytoken trigger log" className="flex-1 min-w-[260px]">
            {decoyFeed.length === 0 ? (
              <EmptyRow>Waiting for events…</EmptyRow>
            ) : (
              decoyFeed.map((d, i) => (
                <div
                  key={d.id}
                  className={`px-[18px] py-[14px] text-[12.5px] leading-relaxed text-[#D7E4EC] ${
                    i < decoyFeed.length - 1 ? "border-b border-white/[0.06]" : ""
                  }`}
                >
                  {new Date(d.ts).toLocaleTimeString()} · {d.primary} · {d.secondary.split(" · ").pop()}
                </div>
              ))
            )}
          </Panel>
        </div>

        <DecoyMap map={fieldMap} tripped={trippedTypes} error={mapError} />
      </div>
    </div>
  );
}

function StatTile({
  value,
  label,
  bg,
  color,
}: {
  value: number;
  label: string;
  bg: string;
  color?: string;
}) {
  return (
    <div className="flex-1 min-w-[110px] rounded-2xl p-4" style={{ background: bg }}>
      <div className="font-heading text-[22px] font-extrabold" style={{ color: color ?? "#fff" }}>
        {value}
      </div>
      <div className="mt-0.5 text-[11.5px] text-u360-admin-muted">{label}</div>
    </div>
  );
}

function Panel({
  title,
  className = "",
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl bg-white/[0.04] overflow-hidden ${className}`}>
      <div className="border-b border-white/[0.08] px-[18px] py-[14px] text-xs font-bold uppercase tracking-wide text-u360-admin-muted">
        {title}
      </div>
      {children}
    </section>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <div className="px-[18px] py-8 text-center text-sm text-u360-admin-muted">{children}</div>;
}

function EventRow({ item, isLast }: { item: FeedItem; isLast: boolean }) {
  const tone = TONE_STYLES[item.tone];
  return (
    <div
      className={`flex items-center justify-between px-[18px] py-[14px] ${
        isLast ? "" : "border-b border-white/[0.06]"
      }`}
    >
      <div>
        <div className="text-[13.5px] font-semibold text-white">{item.primary}</div>
        <div className="mt-0.5 text-[11.5px] text-u360-admin-muted">{item.secondary}</div>
      </div>
      <div className="text-[11.5px] font-extrabold uppercase" style={{ color: tone.text }}>
        {tone.label}
      </div>
    </div>
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
    <section className="mt-5 rounded-2xl bg-white/[0.04] p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-heading text-sm font-bold text-white">Decoy Map</h2>
        <span className="text-xs text-u360-admin-muted">shadow fields live outside the user surface</span>
      </div>

      {!map && error && (
        <p className="mt-4 rounded-lg bg-white/5 p-3 text-sm text-u360-admin-muted">{error}</p>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {/* Real layer */}
        <div className="rounded-xl p-4" style={{ background: "rgba(46,156,90,0.1)" }}>
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "#3DE58C" }}>
            <span className="h-2 w-2 rounded-full" style={{ background: "#3DE58C" }} /> Real fields · served to the app
          </p>
          <dl className="space-y-2 text-sm">
            {(map?.real ?? []).map((f) => (
              <div key={f.label} className="flex justify-between gap-4">
                <dt className="text-u360-admin-muted">{f.label}</dt>
                <dd className="font-mono text-white">{f.value}</dd>
              </div>
            ))}
            {!map && !error && <p className="text-sm text-u360-admin-muted">Loading…</p>}
          </dl>
        </div>

        {/* Shadow / decoy layer — visually distinct: dashed, amber, "ghost" */}
        <div
          className="rounded-xl border border-dashed p-4"
          style={{ background: "rgba(201,138,46,0.1)", borderColor: "#E0A94B" }}
        >
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "#E0A94B" }}>
            <span aria-hidden>👻</span> Decoy shadow fields · never shown to users
          </p>
          <ul className="space-y-2 text-sm">
            {(map?.decoy ?? []).map((d) => {
              const hot = tripped.has(d.field_type) || d.trips > 0;
              return (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-4 rounded-lg px-2 py-1.5"
                  style={hot ? { background: "rgba(166,51,51,0.18)" } : undefined}
                >
                  <span className="text-u360-admin-muted">{d.field_type}</span>
                  <span className="font-mono text-white">{d.value_masked}</span>
                  {hot ? (
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{ background: "rgba(166,51,51,0.3)", color: "#E8605F" }}
                    >
                      TRIPPED{d.trips > 0 ? ` ×${d.trips}` : ""}
                    </span>
                  ) : (
                    <span
                      className="rounded-full px-2 py-0.5 text-xs"
                      style={{ background: "rgba(201,138,46,0.2)", color: "#E0A94B" }}
                    >
                      armed
                    </span>
                  )}
                </li>
              );
            })}
            {!map && !error && <p className="text-sm text-u360-admin-muted">Loading…</p>}
          </ul>
        </div>
      </div>

      <p className="mt-4 rounded-lg bg-white/5 p-3 text-xs text-u360-admin-muted">
        Decoys are stored in a separate table and never appear in the user UI or any
        legitimate API response. They only exist in the layer a breach would reach —
        so any touch of a shadow field is, by definition, an intrusion.
      </p>
    </section>
  );
}
