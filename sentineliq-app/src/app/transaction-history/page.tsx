"use client";

// Transaction History — same clean Union360 list style as the Dashboard's
// "Recent Transactions", just the full list (up to what /api/transactions/recent
// returns) with its own page chrome, reached from the Transfer menu.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getBalance, getRecentTransactions, type Balance, type RecentTransaction } from "@/lib/api";
import { TransactionRow } from "@/app/dashboard/page";

export default function TransactionHistoryPage() {
  const router = useRouter();
  const { token, ready } = useAuth();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [txns, setTxns] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !token) router.replace("/login");
  }, [ready, token, router]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    Promise.all([getBalance(token), getRecentTransactions(token)])
      .then(([b, t]) => {
        if (cancelled) return;
        setBalance(b);
        setTxns(t);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex max-w-5xl items-center gap-3.5 px-6 pt-8">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="text-xl text-u360-navy"
        >
          ‹
        </button>
        <h1 className="font-heading text-base font-bold text-u360-navy">Transfer History</h1>
      </div>

      <div className="mx-auto mt-6 max-w-5xl px-6 pb-10">
        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}
        {!loading && txns.length === 0 ? (
          <p className="rounded-xl border border-u360 bg-u360-page px-4 py-6 text-center text-sm text-u360-muted">
            No transactions yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {txns.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} currency={balance?.currency} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
