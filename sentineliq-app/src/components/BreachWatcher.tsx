"use client";

// Global listener for the most dramatic demo moment: the instant a decoy /
// honeytoken is touched, Builder B emits `decoy-touched` and the full-screen red
// Breach Alert appears over whatever page the user is on — no refresh, no polling.
import { useEffect, useState } from "react";
import { getSocket, onEvent, EVENTS } from "@/lib/socket";
import BreachAlert from "@/components/overlays/BreachAlert";
import { useAuth } from "@/lib/AuthContext";

export interface DecoyTrace {
  account?: string;
  ip?: string;
  location?: string;
  device?: string;
  ts?: number;
}

export default function BreachWatcher() {
  const [trace, setTrace] = useState<DecoyTrace | null>(null);
  const { effectiveLevel } = useAuth();

  useEffect(() => {
    const socket = getSocket();
    const off = onEvent(socket, EVENTS.decoyTouched, (payload) => {
      const p = (payload ?? {}) as DecoyTrace & { state?: string };
      // Legacy mock emits {state:"armed"} continuously — only fire on a real trip.
      if (p.state && p.state !== "tripped") return;
      setTrace(p);
    });
    return off;
  }, []);

  return (
    <BreachAlert
      open={trace !== null}
      trace={trace}
      level={effectiveLevel}
      onClose={() => setTrace(null)}
    />
  );
}
