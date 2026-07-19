"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transfer", label: "Transfer" },
  { href: "/messages", label: "Messages" },
  { href: "/admin", label: "Admin" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { token, signOut } = useAuth();

  // The login page renders its own Union360 chrome — hide the app nav there.
  if (pathname === "/login") return null;

  return (
    <nav className="bg-u360-navy text-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-1 px-4 py-3">
        <Link href="/dashboard" className="mr-4 flex items-center gap-2">
          <span className="font-heading text-lg font-extrabold tracking-tight">
            Union<span className="text-u360-blue">360</span>
          </span>
          <span className="hidden rounded bg-white/10 px-1.5 py-0.5 text-xs font-semibold tracking-wide text-u360-blue sm:inline">
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
                active ? "bg-white/15 font-medium text-white" : "text-white/75 hover:bg-white/10"
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
              className="rounded-md px-3 py-1.5 text-sm text-white/75 transition-colors hover:bg-white/10"
            >
              Log out
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-u360-blue px-4 py-1.5 text-sm font-medium text-u360-navy transition-colors hover:brightness-95"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
