"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import {
  getBalance,
  getRecentTransactions,
  type Balance,
  type RecentTransaction,
} from "@/lib/api";
import { formatCurrency } from "@/lib/placeholderData";

export default function DashboardPage() {
  const router = useRouter();
  const { token, user, ready } = useAuth();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [txns, setTxns] = useState<RecentTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Redirect out if not signed in (once auth has hydrated).
  useEffect(() => {
    if (ready && !token) router.replace("/login");
  }, [ready, token, router]);

  // Load live account data whenever we have a token.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([getBalance(token), getRecentTransactions(token)])
      .then(([b, t]) => {
        if (cancelled) return;
        setBalance(b);
        setTxns(t);
        setError(null);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!ready || (!token && !error)) {
    return <main className="mx-auto max-w-5xl px-4 py-10 text-u360-muted">Loading…</main>;
  }

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const initials =
    user?.name
      ?.split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "U";

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(180deg, #42B4E6 0%, #FFFFFF 30%)" }}
    >
      <div className="mx-auto max-w-5xl px-6 pb-8 pt-10">
        <div className="flex items-center justify-between">
          <span className="font-heading text-base font-extrabold text-white">
            Union<span className="text-u360-navy">360</span>
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white font-heading text-xs font-bold text-u360-navy">
            {initials}
          </span>
        </div>

        <div className="mt-4">
          <p className="text-sm text-white/85">Good morning,</p>
          <p className="font-heading mt-0.5 text-lg font-bold text-white">{firstName}</p>
        </div>

        <section className="mt-4 rounded-[18px] bg-white p-5 shadow-[0_10px_26px_rgba(11,42,69,0.12)]">
          <div className="flex items-center justify-between">
            <p className="text-xs text-u360-muted-2">Total Balance</p>
            <div className="flex items-center gap-2 text-u360-blue">
              <span aria-hidden>👁</span>
              <span aria-hidden>↻</span>
            </div>
          </div>
          <p className="font-heading mt-1.5 text-2xl font-extrabold text-u360-navy">
            {balance ? formatCurrency(balance.balance, balance.currency) : loading ? "…" : "—"}
          </p>
          <div className="mt-3 flex items-center justify-between text-xs text-u360-muted">
            <span>{user?.name ?? "Account holder"}</span>
            <span>{balance?.account_number ?? "••••"}</span>
          </div>
        </section>
      </div>

      <div className="mx-auto max-w-5xl px-6 pb-10">
        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            Couldn&apos;t load account data: {error}
          </p>
        )}

        <div className="flex gap-3">
          <Link
            href="/transfer"
            className="rounded-full bg-u360-blue px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Transfer
          </Link>
          <Link
            href="/messages"
            className="rounded-full border border-u360 bg-white px-4 py-2.5 text-sm font-medium text-u360-navy transition-colors hover:bg-slate-50"
          >
            Messages
          </Link>
        </div>

        <section className="mt-7">
          <div className="flex items-baseline justify-between">
            <h2 className="font-heading text-[13px] font-bold text-u360-navy">
              Recent Transactions
            </h2>
            <Link href="/transaction-history" className="text-xs font-medium text-u360-blue">
              See all
            </Link>
          </div>
          {txns.length === 0 && !loading ? (
            <p className="mt-3 rounded-xl border border-u360 bg-white px-4 py-6 text-center text-sm text-u360-muted">
              No transactions yet.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {txns.slice(0, 5).map((tx) => (
                <TransactionRow key={tx.id} tx={tx} currency={balance?.currency} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export function TransactionRow({
  tx,
  currency = "NGN",
}: {
  tx: RecentTransaction;
  currency?: string;
}) {
  const isBill = !tx.recipient_id && tx.description;

  return (
    <li className="flex items-center justify-between">
      <div>
        <p className="text-[13.5px] font-semibold text-u360-navy">
          {tx.recipient_name ?? tx.description ?? "Transaction"}
        </p>
        <p className="mt-0.5 text-[11.5px] text-u360-muted-2">
          {isBill
            ? "Bills · Auto-pay"
            : [
                tx.recipient_bank,
                tx.recipient_account_last4 ? `••••${tx.recipient_account_last4}` : null,
              ]
                .filter(Boolean)
                .join(" · ") || "Union360"}
        </p>
      </div>
      <span
        className={`text-[13.5px] ${tx.amount < 0 ? "text-u360-navy" : "text-u360-green"}`}
      >
        {tx.amount < 0 ? "−" : "+"}
        {formatCurrency(Math.abs(tx.amount), currency, 0)}
      </span>
    </li>
  );
}
