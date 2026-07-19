"use client";

// Soft Step-Up — its own verification tier, distinct from Hard Step-Up's
// on-device facial verification. Medium-risk transfers get an action-bound OTP
// (see server/lib/otp.js) that's delivered to the user's simulated SMS inbox,
// not handed back in this component — the code never appears here, so the user
// has to actually check Messages to read it, same as a real bank text. A "View
// Messages" button opens the real inbox as a drawer over this modal so reading
// it doesn't mean navigating away and losing the transfer underneath.

import { useEffect, useRef, useState } from "react";
import { alertText } from "@/lib/alertText";
import { sendOtp, verifyOtp as verifyOtpRequest } from "@/lib/api";
import MessagesDrawer from "./MessagesDrawer";

export interface OverlayProps {
  open: boolean;
  onClose: () => void;
  /** DB tech_literacy_level — selects the demographic copy variant. */
  level?: string | null;
}

interface SoftStepUpProps extends OverlayProps {
  token: string;
  amount?: number;
  recipient?: string;
  /** Called once the OTP is verified. */
  onVerified?: () => void;
}

const CODE_LENGTH = 6;
const EMPTY_CODE = Array(CODE_LENGTH).fill("");

export default function SoftStepUp({
  open,
  onClose,
  onVerified,
  level,
  token,
  amount,
  recipient,
}: SoftStepUpProps) {
  const [digits, setDigits] = useState<string[]>(EMPTY_CODE);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const requestedFor = useRef(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  async function requestCode() {
    setSending(true);
    setError(null);
    setDigits(EMPTY_CODE);
    try {
      const challenge = await sendOtp(token, { purpose: "transfer", amount, recipient });
      setSecondsLeft(challenge.expires_in);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setSending(false);
    }
  }

  // Fire once per time the overlay opens.
  useEffect(() => {
    if (open && !requestedFor.current) {
      requestedFor.current = true;
      requestCode();
    }
    if (!open) requestedFor.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Countdown — re-arms whenever secondsLeft crosses from 0 to positive (a new
  // send), and tears down once it reaches 0, rather than re-running every tick.
  useEffect(() => {
    if (!open || secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, secondsLeft > 0]);

  if (!open) return null;

  const code = digits.join("");
  const complete = code.length === CODE_LENGTH;
  const expired = !sending && secondsLeft <= 0;
  const mm = Math.floor(secondsLeft / 60);
  const ss = String(secondsLeft % 60).padStart(2, "0");

  function setDigit(i: number, raw: string) {
    const v = raw.replace(/\D/g, "").slice(-1);
    setDigits((d) => {
      const next = [...d];
      next[i] = v;
      return next;
    });
    if (v && i < CODE_LENGTH - 1) inputRefs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!text) return;
    e.preventDefault();
    setDigits((d) => {
      const next = [...d];
      for (let i = 0; i < text.length; i++) next[i] = text[i];
      return next;
    });
    inputRefs.current[Math.min(text.length, CODE_LENGTH - 1)]?.focus();
  }

  async function confirm() {
    if (!complete || verifying) return;
    setVerifying(true);
    setError(null);
    try {
      const result = await verifyOtpRequest(token, code);
      if (result.ok) {
        onVerified?.();
      } else {
        setError(result.error || "Incorrect code. Please try again.");
        setDigits(EMPTY_CODE);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError("Could not verify code. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-u360-navy/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-[0_12px_30px_rgba(11,42,69,0.18)]">
        <div className="flex items-center justify-center gap-2">
          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-u360-navy text-xs text-white">
            🛡
          </span>
          <span className="font-heading text-xs font-extrabold tracking-wide text-u360-navy">
            SentinelIQ
          </span>
        </div>

        <div className="mx-auto mt-4 flex h-16 w-16 items-center justify-center rounded-full bg-u360-blue/15">
          <span className="text-3xl" aria-hidden>
            💬
          </span>
        </div>
        <h2 className="font-heading mt-4 text-lg font-bold text-u360-navy">Enter your code</h2>
        <p className="mt-2 text-sm text-u360-muted">{alertText("soft_step_up", level)}</p>
        <p className="mt-1 text-xs text-u360-muted-2">
          Sent to your Messages — this is the phone/SMS-level protection screen.
        </p>
        <button
          type="button"
          onClick={() => setMessagesOpen(true)}
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-u360-blue transition-opacity hover:opacity-80"
        >
          💬 View Messages
        </button>

        <div className="mt-5 flex justify-center gap-2">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              value={d}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              inputMode="numeric"
              maxLength={1}
              disabled={sending || verifying}
              className="h-12 w-9 rounded-lg border border-u360-border-2 text-center text-lg font-semibold text-u360-navy outline-none focus:border-u360-blue disabled:opacity-60"
            />
          ))}
        </div>

        <p className="mt-3 text-xs" style={{ color: expired ? "#A63333" : "#8A9BAA" }}>
          {sending
            ? "Sending code…"
            : expired
              ? "Code expired"
              : `Expires in ${mm}:${ss}`}
        </p>

        {error && (
          <p className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-600">
            {error}
          </p>
        )}

        {expired ? (
          <button
            type="button"
            onClick={requestCode}
            disabled={sending}
            className="mt-4 rounded-[22px] bg-u360-blue py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            Resend code
          </button>
        ) : (
          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={confirm}
              disabled={!complete || sending || verifying}
              className="rounded-[22px] bg-u360-blue py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {verifying ? "Verifying…" : "Confirm with code"}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg py-2 text-sm text-u360-muted transition-colors hover:text-u360-navy"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <MessagesDrawer open={messagesOpen} onClose={() => setMessagesOpen(false)} token={token} />
    </div>
  );
}
