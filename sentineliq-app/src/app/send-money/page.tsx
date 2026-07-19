"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { scoreTransfer } from "@/lib/api";
import SoftStepUp from "@/components/overlays/SoftStepUp";
import HardStepUp from "@/components/overlays/HardStepUp";
import LivenessCheck from "@/components/overlays/LivenessCheck";

type Overlay = "soft" | "hard" | "liveness" | null;
type Scenario =
  | "normal"
  | "unusual"
  | "fraud"
  | "decoy"
  | "impossible_travel"
  | "mule"
  | "mimic"
  | "aged_device";

// Nigerian banks the user can transfer to (NIP participants). Kept in-app so the
// recipient is always a real bank + account number — never a free-text username.
const NG_BANKS = [
  "Guaranty Trust Bank",
  "Access Bank",
  "Zenith Bank",
  "First Bank of Nigeria",
  "United Bank for Africa",
  "Union Bank of Nigeria",
  "Fidelity Bank",
  "Sterling Bank",
  "Kuda Microfinance Bank",
  "Opay",
  "Palmpay",
  "Moniepoint",
];

// Which demo context to send with the transfer. Lets judges trigger every
// security state on demand; the real score is still computed server-side.
const SCENARIOS: { id: Scenario; label: string; hint: string }[] = [
  { id: "normal", label: "Normal", hint: "known device & recipient → high score" },
  { id: "unusual", label: "Unusual", hint: "new location / odd hour → medium" },
  { id: "fraud", label: "Fraudulent", hint: "wrong device + big amount → low" },
  { id: "decoy", label: "Decoy recipient", hint: "honeytoken → breach alert" },
  { id: "impossible_travel", label: "Impossible travel", hint: "Lagos & London 10 min apart" },
  { id: "mule", label: "Mule payout", hint: "brand-new recipient + big amount" },
  { id: "mimic", label: "Device mimic", hint: "cloned profile, brand-new device" },
  { id: "aged_device", label: "Aged device", hint: "new device trusted after 20 days" },
];

export default function SendMoneyPage() {
  const router = useRouter();
  const { token, ready, effectiveLevel } = useAuth();
  const [accountNumber, setAccountNumber] = useState("");
  const [bank, setBank] = useState(NG_BANKS[0]);
  const [amount, setAmount] = useState("");
  const [scenario, setScenario] = useState<Scenario>("normal");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [score, setScore] = useState<number | null>(null);
  const [explanation, setExplanation] = useState<string>("");
  const [signals, setSignals] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [livenessKey, setLivenessKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && !token) router.replace("/login");
  }, [ready, token, router]);

  // Combined recipient reference used for scoring, e.g. "Access Bank · 0123456789".
  const recipient = accountNumber ? `${bank} · ${accountNumber}` : "";
  const accountValid = /^\d{10}$/.test(accountNumber);

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setStatus(null);
    setBlocked(null);
    setLoading(true);
    try {
      // Ask Builder B's trust engine to score this transfer.
      const result = await scoreTransfer(token, {
        recipient,
        amount: Number(amount) || 0,
        scenario,
      });
      setScore(result.score);
      setExplanation(result.explanation || "");
      setSignals(result.signals || []);

      // Honor the backend's action decision directly (falls back to score bands).
      // proceed → silent · soft-step-up → Soft overlay (action-bound OTP, texted
      // to the user's simulated SMS inbox) · hard-step-up → Hard overlay (facial
      // verification, higher friction, on-device) · block → a last-resort
      // liveness check (move your head, open your mouth) instead of a dead end;
      // only denied outright if the user cancels that. Three distinct tiers: OTP
      // for medium risk, facial verification for high risk / last-resort block.
      // (A decoy recipient additionally trips the global breach alert via socket.)
      const action =
        result.action ??
        (result.score >= 80
          ? "proceed"
          : result.score >= 40
            ? "soft-step-up"
            : result.score >= 20
              ? "hard-step-up"
              : "block");
      if (action === "proceed") {
        setOverlay(null);
        setStatus(`Transfer sent · trust score ${result.score}/100`);
      } else if (action === "soft-step-up") {
        setOverlay("soft");
      } else if (action === "block") {
        setLivenessKey((k) => k + 1);
        setOverlay("liveness");
      } else {
        setOverlay("hard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not score transfer");
    } finally {
      setLoading(false);
    }
  }

  // Called when a step-up overlay is satisfied ("verify & continue").
  function completeAfterStepUp() {
    setOverlay(null);
    setStatus(`Transfer approved after verification · trust score ${score}/100`);
  }

  // User backed out of the OTP step-up — unlike facial verification's on-device
  // check, this is a real cancel (it must NOT silently approve the transfer).
  function cancelSoftStepUp() {
    setOverlay(null);
    setBlocked(explanation || `Transfer cancelled · trust score ${score}/100`);
  }

  // Liveness check passed — this was the last-resort path for an otherwise
  // blocked transfer, so it gets its own status message.
  function completeAfterLiveness() {
    setOverlay(null);
    setStatus(`Transfer approved after identity verification · trust score ${score}/100`);
  }

  // User backed out of the liveness check — now it's actually denied.
  function cancelLiveness() {
    setOverlay(null);
    setBlocked(explanation || `Transfer blocked · trust score ${score}/100`);
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="flex items-center gap-3.5">
        <Link href="/transfer" aria-label="Back" className="text-xl text-u360-navy">
          ‹
        </Link>
        <h1 className="font-heading text-base font-bold text-u360-navy">Single Transfer</h1>
      </div>

      <form
        onSubmit={handleConfirm}
        className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label htmlFor="bank" className="block text-sm font-medium text-slate-700">
            Recipient bank
          </label>
          <select
            id="bank"
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-u360-blue"
          >
            {NG_BANKS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="account" className="block text-sm font-medium text-slate-700">
            Account number
          </label>
          <input
            id="account"
            inputMode="numeric"
            maxLength={10}
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
            placeholder="10-digit account number"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 tracking-wide text-slate-900 outline-none focus:border-u360-blue"
          />
          {accountNumber.length > 0 && !accountValid && (
            <p className="mt-1 text-xs text-amber-600">Account number must be exactly 10 digits.</p>
          )}
        </div>

        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-slate-700">
            Amount (₦)
          </label>
          <input
            id="amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-u360-blue"
          />
        </div>

        {/* Scenario selector — drives the trust context sent to the backend. */}
        <div>
          <p className="block text-sm font-medium text-slate-700">Demo scenario</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setScenario(s.id)}
                title={s.hint}
                className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                  scenario === s.id
                    ? "border-u360-blue bg-u360-blue/10 text-u360-blue"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="block font-medium">{s.label}</span>
                <span className="block text-[11px] text-slate-400">{s.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !accountValid}
          className="w-full rounded-lg bg-u360-blue px-4 py-2.5 font-medium text-white transition-colors hover:bg-u360-blue disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Checking…" : "Confirm Transfer"}
        </button>

        {status && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {status}
          </p>
        )}
        {blocked && (
          <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-700">
            🚫 {blocked}
          </p>
        )}
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}
      </form>

      <SoftStepUp
        open={overlay === "soft"}
        onClose={cancelSoftStepUp}
        onVerified={completeAfterStepUp}
        token={token ?? ""}
        amount={Number(amount) || 0}
        recipient={recipient}
        level={effectiveLevel}
      />
      <HardStepUp
        open={overlay === "hard"}
        onClose={() => setOverlay(null)}
        onVerified={completeAfterStepUp}
        explanation={explanation}
        signals={signals}
        level={effectiveLevel}
      />
      <LivenessCheck
        key={livenessKey}
        open={overlay === "liveness"}
        onClose={cancelLiveness}
        onVerified={completeAfterLiveness}
        level={effectiveLevel}
      />
    </main>
  );
}
