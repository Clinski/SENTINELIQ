import Link from "next/link";

const routes = [
  { href: "/login", label: "Login", desc: "Sign in as the demo user" },
  { href: "/dashboard", label: "Dashboard", desc: "Balance & recent activity" },
  { href: "/send-money", label: "Send Money", desc: "Trust-scored transfers" },
  { href: "/messages", label: "Messages", desc: "NLP scam detection" },
  { href: "/admin", label: "Judge Dashboard", desc: "Live security operations" },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <div className="flex flex-col items-start gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-ubblue text-2xl font-black text-white">
          U
        </span>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          Sentinel<span className="text-ubblue">IQ</span>
        </h1>
        <p className="max-w-xl text-lg text-slate-600">
          Real-time fraud protection for Union Bank — trust scoring, NLP scam
          detection, and honeytoken breach alerts, fused into one risk signal.
        </p>
      </div>

      <ul className="mt-10 grid gap-3 sm:grid-cols-2">
        {routes.map(({ href, label, desc }) => (
          <li key={href}>
            <Link
              href={href}
              className="block rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-ubblue hover:bg-slate-50"
            >
              <span className="font-semibold text-slate-800">{label}</span>
              <span className="mt-0.5 block text-sm text-slate-500">{desc}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
