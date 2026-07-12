# SentinelIQ — Day 1 Source Bundle

All hand-written source for the SentinelIQ app in one file, for review.
Generated 2026-07-02. Each section is one real file; the `//` path header shows its location.

---

## `src/lib/demoUser.ts`

```ts
// Demo credentials only — NO real auth. Builder B wires real authentication on Day 2.
// Keep the shape stable so the real auth layer can drop in behind the same interface.

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  /** plaintext ONLY because this is a throwaway demo account — never do this for real */
  password: string;
}

export const DEMO_USER: DemoUser = {
  id: "user-001",
  name: "Ada Demo",
  email: "demo@unionbank.ng",
  password: "demo1234",
};

/**
 * Stub credential check. Builder B replaces this with a real API call on Day 2.
 * Returns the user (minus password) on success, or null on failure.
 */
export function validateDemoCredentials(
  email: string,
  password: string,
): Omit<DemoUser, "password"> | null {
  if (email.trim().toLowerCase() === DEMO_USER.email && password === DEMO_USER.password) {
    const { password: _pw, ...safe } = DEMO_USER;
    return safe;
  }
  return null;
}
```

---

## `src/lib/placeholderData.ts`

```ts
// Static placeholder data for Day 1. Builder B's API replaces all of this on Day 2.

export interface Account {
  holder: string;
  number: string;
  balance: number;
  currency: string;
}

export interface Transaction {
  id: string;
  description: string;
  date: string;
  amount: number; // negative = debit, positive = credit
}

export interface Message {
  id: string;
  sender: string;
  body: string;
  timestamp: string;
  /** Internal hint only — NOT rendered. Builder C's NLP overlay classifies live on Day 2. */
  kind: "legit" | "scam";
}

export const ACCOUNT: Account = {
  holder: "Ada Demo",
  number: "•••• 4821",
  balance: 482650.75,
  currency: "NGN",
};

export const TRANSACTIONS: Transaction[] = [
  { id: "t1", description: "Shoprite Ikeja", date: "2026-07-01", amount: -12500 },
  { id: "t2", description: "Salary — Unilag", date: "2026-06-28", amount: 350000 },
  { id: "t3", description: "MTN Airtime", date: "2026-06-27", amount: -2000 },
  { id: "t4", description: "Transfer to Chidi O.", date: "2026-06-25", amount: -45000 },
  { id: "t5", description: "Refund — Jumia", date: "2026-06-24", amount: 8990 },
];

export const MESSAGES: Message[] = [
  {
    id: "m1",
    sender: "Union Bank",
    body: "Your OTP is 483920. Do not share it with anyone, including bank staff.",
    timestamp: "2026-07-02 09:14",
    kind: "legit",
  },
  {
    id: "m2",
    sender: "+234 809 555 0142",
    body: "URGENT: Your account will be BLOCKED today. Verify now at union-bank-secure.link/verify to avoid suspension.",
    timestamp: "2026-07-02 08:47",
    kind: "scam",
  },
  {
    id: "m3",
    sender: "Mum",
    body: "Did you get the transfer I sent yesterday? Call me when you're free.",
    timestamp: "2026-07-01 19:32",
    kind: "legit",
  },
  {
    id: "m4",
    sender: "REWARDS",
    body: "Congratulations! You've WON ₦2,000,000 in the Union Bank promo. Send your BVN and card PIN to claim now.",
    timestamp: "2026-07-01 14:05",
    kind: "scam",
  },
];

export function formatCurrency(amount: number, currency = "NGN"): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
```

---

## `src/components/UnionBankLogo.tsx`

```tsx
// Simple Union Bank wordmark for the demo. Cyan is Union Bank's primary brand colour;
// the rearing horse is its emblem (stylised here as a simple glyph).

export default function UnionBankLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span
        aria-hidden
        className="flex h-9 w-9 items-center justify-center rounded-md bg-cyan-500 text-lg font-black text-slate-950"
      >
        U
      </span>
      <span className="text-lg font-semibold tracking-tight text-white">
        Union<span className="text-cyan-400">Bank</span>
      </span>
    </div>
  );
}
```

---

## `src/components/Nav.tsx`

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/send-money", label: "Send Money" },
  { href: "/messages", label: "Messages" },
  { href: "/admin", label: "Admin" },
  { href: "/login", label: "Login" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-slate-800 bg-slate-900 text-slate-200">
      <div className="mx-auto flex max-w-5xl items-center gap-1 px-4 py-3">
        <Link href="/" className="mr-4 font-bold text-white">
          SentinelIQ
        </Link>
        {links.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                active
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

---

## `src/components/overlays/SoftStepUp.tsx`

```tsx
"use client";

// Soft Step-Up: low-friction biometric confirmation prompt.
// Hidden by default — controlled purely by the `open` prop. Triggers wired on Day 2.

export interface OverlayProps {
  open: boolean;
  onClose: () => void;
}

export default function SoftStepUp({ open, onClose }: OverlayProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 text-center shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/15">
          <span className="text-3xl" aria-hidden>
            🖐️
          </span>
        </div>
        <h2 className="mt-4 text-lg font-semibold text-white">Confirm it&apos;s you</h2>
        <p className="mt-2 text-sm text-slate-400">
          Use your fingerprint or face to confirm this action.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={onClose}
            className="rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-medium text-slate-950 transition-colors hover:bg-cyan-400"
          >
            Scan biometrics
          </button>
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-slate-400 transition-colors hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## `src/components/overlays/HardStepUp.tsx`

```tsx
"use client";

// Hard Step-Up: higher-friction OTP challenge WITH an explanation of why it fired.
// Hidden by default — controlled by `open`. Trigger logic + real OTP wired on Day 2.

import type { OverlayProps } from "./SoftStepUp";

export default function HardStepUp({ open, onClose }: OverlayProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-slate-900 p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>
            ⚠️
          </span>
          <h2 className="text-lg font-semibold text-white">Extra verification needed</h2>
        </div>

        <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          This transfer looks unusual for your account. To protect you, enter the
          one-time code we sent to your phone before it can continue.
        </p>

        <label className="mt-5 block text-sm font-medium text-slate-300">
          One-time code
        </label>
        <input
          inputMode="numeric"
          maxLength={6}
          placeholder="••••••"
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-center text-lg tracking-[0.5em] text-white outline-none focus:border-cyan-400"
        />

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={onClose}
            className="rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-medium text-slate-950 transition-colors hover:bg-cyan-400"
          >
            Verify &amp; continue
          </button>
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-slate-400 transition-colors hover:text-white"
          >
            Cancel transfer
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## `src/components/overlays/BreachAlert.tsx`

```tsx
"use client";

// Breach Alert: red full-screen, highest-severity stop. Hidden by default.
// Controlled by `open`. Trigger logic wired on Day 2.

import type { OverlayProps } from "./SoftStepUp";

export default function BreachAlert({ open, onClose }: OverlayProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-red-700 p-6 text-center text-white">
      <span className="text-6xl" aria-hidden>
        🛑
      </span>
      <h2 className="mt-4 text-3xl font-black tracking-tight">Security breach detected</h2>
      <p className="mt-3 max-w-md text-red-100">
        We&apos;ve paused all activity on your account to keep your money safe. Do not
        share any codes. Contact Union Bank support immediately.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={onClose}
          className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50"
        >
          Freeze my account
        </button>
        <button
          onClick={onClose}
          className="rounded-lg border border-white/60 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
```

---

## `src/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SentinelIQ",
  description: "SentinelIQ app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-950">
        <Nav />
        {children}
      </body>
    </html>
  );
}
```

---

## `src/app/page.tsx` — route index

```tsx
import Link from "next/link";

const routes = [
  { href: "/login", label: "Login" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/send-money", label: "Send Money" },
  { href: "/messages", label: "Messages" },
  { href: "/admin", label: "Admin" },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-3xl font-bold text-white">SentinelIQ</h1>
      <p className="mt-2 text-slate-400">Pick a route to get started.</p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {routes.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className="block rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
            >
              {label}
              <span className="ml-2 text-slate-500">{href}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

---

## `src/app/login/page.tsx`

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UnionBankLogo from "@/components/UnionBankLogo";
import { DEMO_USER, validateDemoCredentials } from "@/lib/demoUser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // NO real auth yet — Builder B replaces this with the auth API on Day 2.
    const user = validateDemoCredentials(email, password);
    if (user) {
      setError(null);
      router.push("/dashboard");
    } else {
      setError("Invalid credentials. Use the demo account below.");
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <UnionBankLogo className="justify-center" />

        <h1 className="mt-6 text-center text-xl font-semibold text-white">
          Sign in to your account
        </h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white outline-none focus:border-cyan-400"
              placeholder="you@unionbank.ng"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white outline-none focus:border-cyan-400"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-lg bg-cyan-500 px-4 py-2.5 font-medium text-slate-950 transition-colors hover:bg-cyan-400"
          >
            Sign In
          </button>
        </form>

        <p className="mt-6 rounded-lg bg-slate-800/60 p-3 text-center text-xs text-slate-400">
          Demo account — <span className="text-slate-200">{DEMO_USER.email}</span> /{" "}
          <span className="text-slate-200">{DEMO_USER.password}</span>
        </p>
      </div>
    </main>
  );
}
```

---

## `src/app/dashboard/page.tsx`

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ACCOUNT, TRANSACTIONS, formatCurrency } from "@/lib/placeholderData";

export const metadata: Metadata = {
  title: "Dashboard · SentinelIQ",
};

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      {/* Static placeholder data today — Builder B's API supplies live data on Day 2. */}
      <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-cyan-600 to-cyan-800 p-6 text-white shadow-lg">
        <p className="text-sm text-cyan-100">Available balance</p>
        <p className="mt-1 text-4xl font-bold tracking-tight">
          {formatCurrency(ACCOUNT.balance, ACCOUNT.currency)}
        </p>
        <div className="mt-4 flex items-center justify-between text-sm text-cyan-100">
          <span>{ACCOUNT.holder}</span>
          <span>{ACCOUNT.number}</span>
        </div>
      </section>

      <div className="mt-6 flex gap-3">
        <Link
          href="/send-money"
          className="rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-medium text-slate-950 transition-colors hover:bg-cyan-400"
        >
          Send Money
        </Link>
        <Link
          href="/messages"
          className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
        >
          Messages
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-white">Recent transactions</h2>
        <ul className="mt-3 divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          {TRANSACTIONS.map((tx) => (
            <li key={tx.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-100">{tx.description}</p>
                <p className="text-xs text-slate-500">{tx.date}</p>
              </div>
              <span
                className={`text-sm font-semibold ${
                  tx.amount < 0 ? "text-slate-300" : "text-emerald-400"
                }`}
              >
                {tx.amount < 0 ? "−" : "+"}
                {formatCurrency(Math.abs(tx.amount), ACCOUNT.currency)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
```

---

## `src/app/send-money/page.tsx`

```tsx
"use client";

import { useState } from "react";
import SoftStepUp from "@/components/overlays/SoftStepUp";
import HardStepUp from "@/components/overlays/HardStepUp";
import BreachAlert from "@/components/overlays/BreachAlert";

type Overlay = "soft" | "hard" | "breach" | null;

export default function SendMoneyPage() {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  // Overlay visibility is state-driven only. Day 2: the trust-score engine decides
  // which (if any) of these fires on confirm. For now nothing auto-triggers.
  const [overlay, setOverlay] = useState<Overlay>(null);

  function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    // Trigger logic intentionally left for Day 2 — confirm is a no-op today.
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-bold text-white">Send Money</h1>

      <form
        onSubmit={handleConfirm}
        className="mt-6 space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6"
      >
        <div>
          <label htmlFor="recipient" className="block text-sm font-medium text-slate-300">
            Recipient
          </label>
          <input
            id="recipient"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Account number or @username"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white outline-none focus:border-cyan-400"
          />
        </div>

        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-slate-300">
            Amount (₦)
          </label>
          <input
            id="amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white outline-none focus:border-cyan-400"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-cyan-500 px-4 py-2.5 font-medium text-slate-950 transition-colors hover:bg-cyan-400"
        >
          Confirm Transfer
        </button>
      </form>

      {/* --- DEMO CONTROLS ONLY --- Remove on Day 2 once trust-score triggers drive these. */}
      <div className="mt-8 rounded-xl border border-dashed border-slate-700 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Demo controls · preview security overlays
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOverlay("soft")}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            Soft Step-Up
          </button>
          <button
            type="button"
            onClick={() => setOverlay("hard")}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            Hard Step-Up
          </button>
          <button
            type="button"
            onClick={() => setOverlay("breach")}
            className="rounded-lg border border-red-700 px-3 py-1.5 text-sm text-red-300 hover:bg-red-950"
          >
            Breach Alert
          </button>
        </div>
      </div>

      <SoftStepUp open={overlay === "soft"} onClose={() => setOverlay(null)} />
      <HardStepUp open={overlay === "hard"} onClose={() => setOverlay(null)} />
      <BreachAlert open={overlay === "breach"} onClose={() => setOverlay(null)} />
    </main>
  );
}
```

---

## `src/app/messages/page.tsx`

```tsx
import type { Metadata } from "next";
import { MESSAGES } from "@/lib/placeholderData";

export const metadata: Metadata = {
  title: "Messages · SentinelIQ",
};

export default function MessagesPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-white">Messages</h1>
      <p className="mt-1 text-sm text-slate-400">
        {/* Builder C's NLP overlay attaches scam classification here on Day 2. */}
        Inbox — SMS &amp; alerts
      </p>

      <ul className="mt-6 space-y-3">
        {MESSAGES.map((msg) => (
          <li
            key={msg.id}
            className="rounded-xl border border-slate-800 bg-slate-900 p-4"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium text-slate-100">{msg.sender}</span>
              <span className="shrink-0 text-xs text-slate-500">{msg.timestamp}</span>
            </div>
            <p className="mt-1.5 text-sm text-slate-300">{msg.body}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

---

## `src/app/admin/page.tsx`

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin · Judge Dashboard · SentinelIQ",
};

// Panels judges watch during the demo. Empty by design — Builder B streams data
// into each via WebSocket on Day 2.
const PANELS = [
  { title: "Trust Score Feed", hint: "Live per-user trust scores" },
  { title: "Message Scan Log", hint: "NLP scam-classification events" },
  { title: "Decoy Status", hint: "Active decoy accounts & honeytokens" },
  { title: "Fused Risk Level", hint: "Aggregate risk across signals" },
];

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Judge Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">Live security operations feed</p>
        </div>
        <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">
          Awaiting live feed · Day 2
        </span>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {PANELS.map((panel) => (
          <section
            key={panel.title}
            className="flex min-h-52 flex-col rounded-2xl border border-slate-800 bg-slate-900 p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">{panel.title}</h2>
              <span className="h-2 w-2 rounded-full bg-slate-600" aria-hidden />
            </div>
            <p className="text-xs text-slate-500">{panel.hint}</p>

            <div className="mt-4 flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-700 text-sm text-slate-600">
              No data yet
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
```
