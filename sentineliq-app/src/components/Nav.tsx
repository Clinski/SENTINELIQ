"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import UnionHorseLogo from "@/components/UnionHorseLogo";
import { useAuth } from "@/lib/AuthContext";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/send-money", label: "Send Money" },
  { href: "/messages", label: "Messages" },
  { href: "/admin", label: "Admin" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { token, signOut } = useAuth();

  // The login page renders its own Union Bank Online chrome — hide the app nav there.
  if (pathname === "/login") return null;

  return (
    <nav className="bg-ubblue text-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-1 px-4 py-3">
        <Link href="/dashboard" className="mr-4 flex items-center gap-2">
          <UnionHorseLogo />
          <span className="hidden rounded bg-white/20 px-1.5 py-0.5 text-xs font-semibold tracking-wide text-white sm:inline">
            SentinelIQ
          </span>
        </Link>

        {links.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                active ? "bg-white/20 font-medium text-white" : "text-white/85 hover:bg-white/10"
              }`}
            >
              {label}
            </Link>
          );
        })}

        <div className="ml-auto">
          {token ? (
            <button
              type="button"
              onClick={() => {
                signOut();
                router.push("/login");
              }}
              className="rounded-md px-3 py-1.5 text-sm text-white/85 transition-colors hover:bg-white/10"
            >
              Log out
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-white px-4 py-1.5 text-sm font-medium text-ubblue transition-colors hover:bg-ubgray"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
