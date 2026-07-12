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
    return <main className="mx-auto max-w-5xl px-4 py-10 text-slate-500">Loading…</main>;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <section className="rounded-2xl bg-gradient-to-br from-[#009fe3] to-[#0088c6] p-6 text-white shadow-lg">
        <p className="text-sm text-white/80">Available balance</p>
        <p className="mt-1 text-4xl font-bold tracking-tight">
          {balance ? formatCurrency(balance.balance, balance.currency) : loading ? "…" : "—"}
        </p>
        <div className="mt-4 flex items-center justify-between text-sm text-white/80">
          <span>{user?.name ?? "Account holder"}</span>
          <span>{balance?.account_number ?? "••••"}</span>
        </div>
      </section>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          Couldn&apos;t load account data: {error}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        <Link
          href="/send-money"
          className="rounded-lg bg-ubblue px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ubblue-deep"
        >
          Send Money
        </Link>
        <Link
          href="/messages"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
        >
          Messages
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Recent transactions</h2>
        {txns.length === 0 && !loading ? (
          <p className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
            No transactions yet.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {txns.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {tx.recipient_name ? `Transfer to ${tx.recipient_name}` : "Transaction"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {[
                      tx.recipient_bank,
                      tx.recipient_account_last4 ? `••••${tx.recipient_account_last4}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    {(tx.recipient_bank || tx.recipient_account_last4) && " · "}
                    {new Date(tx.timestamp).toLocaleString()} · {tx.status}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    tx.amount < 0 ? "text-slate-700" : "text-emerald-600"
                  }`}
                >
                  {tx.amount < 0 ? "−" : "+"}
                  {formatCurrency(Math.abs(tx.amount), balance?.currency ?? "NGN")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
