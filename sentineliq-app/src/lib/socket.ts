"use client";

// Single shared Socket.IO connection to Builder B's backend, reused by the Admin
// dashboard and the global BreachWatcher so we only open one socket per browser.
import { io, type Socket } from "socket.io-client";
import { API_URL } from "./api";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, { transports: ["websocket", "polling"] });
  }
  return socket;
}

// Canonical event names (the agreed Day-2 contract). Builder B's current mock loop
// still emits the older short names, so we alias each canonical event to the
// legacy one and normalise on the client — the dashboard lights up either way.
export const EVENTS = {
  trustScore: "trust-score-update",
  messageScanned: "message-scanned",
  decoyTouched: "decoy-touched",
  riskLevel: "risk-level-change",
} as const;

export const LEGACY_ALIASES: Record<string, string> = {
  "trust-score": EVENTS.trustScore,
  "message-scan": EVENTS.messageScanned,
  decoy: EVENTS.decoyTouched,
  "fused-risk": EVENTS.riskLevel,
};

/**
 * Subscribe to a canonical event AND its legacy alias with one handler.
 * Returns an unsubscribe function.
 */
export function onEvent(
  s: Socket,
  canonical: string,
  handler: (payload: unknown) => void,
): () => void {
  const legacy = Object.entries(LEGACY_ALIASES).find(([, c]) => c === canonical)?.[0];
  s.on(canonical, handler);
  if (legacy) s.on(legacy, handler);
  return () => {
    s.off(canonical, handler);
    if (legacy) s.off(legacy, handler);
  };
}
