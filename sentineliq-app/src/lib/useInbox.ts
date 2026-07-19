"use client";

// Shared inbox state: the static demo messages (phishing scam scenarios) plus
// any OTPs SentinelIQ has "texted" to this user, newest first. Used by both the
// full Messages screen and the in-flow Messages drawer opened from step-up
// overlays, so an OTP reads identically no matter where it's checked from.

import { useEffect, useState } from "react";
import { getOtpInbox } from "@/lib/api";
import { MESSAGES, type Message } from "@/lib/placeholderData";

export function useInbox(token?: string | null): Message[] {
  const [inbox, setInbox] = useState<Message[]>(MESSAGES);

  useEffect(() => {
    if (!token) return;
    getOtpInbox(token)
      .then((otpMessages) => {
        if (otpMessages.length === 0) return;
        setInbox((current) => {
          const known = new Set(current.map((m) => m.id));
          const fresh: Message[] = otpMessages
            .filter((m) => !known.has(m.id))
            .map((m) => ({ id: m.id, sender: m.sender, body: m.body, timestamp: m.timestamp, kind: "legit" }));
          return [...fresh, ...current];
        });
      })
      .catch(() => {}); // best-effort — a failed fetch just means no OTPs shown yet
  }, [token]);

  return inbox;
}
