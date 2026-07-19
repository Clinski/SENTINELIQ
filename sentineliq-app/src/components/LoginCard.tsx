"use client";

// Union360 login card — matches the SentinelIQ redesign reference: a white
// rounded card with underline-style fields sitting over the gradient hero,
// wired to the real SentinelIQ auth (signIn).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

const DEMO_EMAIL = "adaeze@unionbank.ng";
const DEMO_PASSWORD = "demo1234";

export default function LoginCard() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(username.trim(), password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-[20px] bg-white p-5 shadow-[0_12px_30px_rgba(11,42,69,0.12)]">
      <form onSubmit={handleLogin} className="space-y-3.5">
        <div>
          <label htmlFor="username" className="block text-[11.5px] text-u360-muted-2">
            Username
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1.5 w-full border-b border-u360-border-2 pb-2.5 text-sm text-u360-navy outline-none focus:border-u360-blue"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-[11.5px] text-u360-muted-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full border-b border-u360-border-2 pb-2.5 text-sm text-u360-navy outline-none focus:border-u360-blue"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-[26px] bg-u360-blue py-[15px] font-heading text-[15px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Log In"}
        </button>

        <button
          type="button"
          onClick={() => {
            setUsername(DEMO_EMAIL);
            setPassword(DEMO_PASSWORD);
          }}
          className="block w-full text-center text-xs text-u360-muted underline-offset-2 hover:underline"
        >
          Use demo account
        </button>
      </form>
    </div>
  );
}
