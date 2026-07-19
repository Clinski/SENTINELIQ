"use client";

// Union360 Transfer menu — matches the SentinelIQ redesign reference: a plain
// list of transfer types. Only "Single Transfer" is wired up (the rest are
// demo placeholders — this app only implements the one flow SentinelIQ scores).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";

const ITEMS: { label: string; href?: string }[] = [
  { label: "Own Account Transfer" },
  { label: "Single Transfer", href: "/send-money" },
  { label: "Multiple Transfer" },
  { label: "Transfer History", href: "/transaction-history" },
];

export default function TransferPage() {
  const router = useRouter();
  const { token, ready } = useAuth();

  useEffect(() => {
    if (ready && !token) router.replace("/login");
  }, [ready, token, router]);

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
        <h1 className="font-heading text-base font-bold text-u360-navy">Transfer</h1>
      </div>

      <div className="mx-auto mt-6 flex max-w-5xl flex-col px-6">
        {ITEMS.map((item, i) => {
          const row = (
            <div
              className={`flex items-center justify-between py-[18px] ${
                i < ITEMS.length - 1 ? "border-b border-u360" : ""
              }`}
            >
              <span className="text-[14.5px] font-medium text-u360-navy">{item.label}</span>
              <span className="text-slate-300">›</span>
            </div>
          );
          return item.href ? (
            <Link key={item.label} href={item.href}>
              {row}
            </Link>
          ) : (
            <div key={item.label} className="cursor-not-allowed opacity-60" title="Demo placeholder">
              {row}
            </div>
          );
        })}
      </div>
    </div>
  );
}
