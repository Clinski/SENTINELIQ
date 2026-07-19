"use client";

// In-flow Messages drawer — lets a step-up overlay's user read the real SMS
// inbox (where an OTP actually lands) without navigating away and losing the
// transfer underneath. Same data as the full Messages screen (useInbox), just
// presented as a slide-over so the step-up modal stays mounted behind it.

import { useInbox } from "@/lib/useInbox";

interface MessagesDrawerProps {
  open: boolean;
  onClose: () => void;
  token?: string | null;
}

export default function MessagesDrawer({ open, onClose, token }: MessagesDrawerProps) {
  // Refetch every time the drawer opens — it stays mounted behind the step-up
  // overlay the whole time, so a plain mount-only fetch would miss an OTP that
  // arrived after the drawer's first render.
  const inbox = useInbox(token, open);

  return (
    <div
      className={`fixed inset-0 z-[60] transition-opacity duration-300 ${
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-u360-navy/40" onClick={onClose} />
      <div
        className={`absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-u360-page shadow-[-8px_0_30px_rgba(0,0,0,0.18)] transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 border-b border-u360 bg-white px-5 py-4">
          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-u360-navy text-xs text-white">
            🛡
          </span>
          <span className="font-heading text-xs font-extrabold tracking-wide text-u360-navy">
            Messages
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close messages"
            className="ml-auto text-xl leading-none text-u360-muted transition-colors hover:text-u360-navy"
          >
            ×
          </button>
        </div>

        <ul className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
          {inbox.map((msg) => (
            <li
              key={msg.id}
              className="rounded-2xl bg-white p-4 shadow-[0_6px_18px_rgba(11,42,69,0.06)]"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13.5px] font-semibold text-u360-navy">{msg.sender}</span>
                <span className="shrink-0 text-[11px] text-u360-muted-2">{msg.timestamp}</span>
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-u360-muted">{msg.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
