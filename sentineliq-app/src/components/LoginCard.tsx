"use client";

// Union Bank Online login card. Restyled to match the bank, but still wired to the
// real SentinelIQ auth (signIn). The "Username" field carries the demo email.
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import VirtualKeyboard from "@/components/VirtualKeyboard";

const DEMO_EMAIL = "adaeze@unionbank.ng";
const DEMO_PASSWORD = "demo1234";

export default function LoginCard() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [active, setActive] = useState<"username" | "password">("username");
  const [hideKeyboard, setHideKeyboard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setters = useRef({ username: setUsername, password: setPassword });

  function typeChar(char: string) {
    setters.current[active]((v) => v + char);
  }
  function backspace() {
    setters.current[active]((v) => v.slice(0, -1));
  }
  function cancel() {
    setUsername("");
    setPassword("");
  }

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
    <div className="w-full max-w-lg rounded-lg bg-ubblue p-6 text-white shadow-lg sm:p-8">
      <h1 className="text-right text-3xl font-light">Login</h1>

      <form onSubmit={handleLogin} className="mt-5 space-y-4">
        <div className="flex items-center gap-4">
          <label htmlFor="username" className="w-24 shrink-0 text-base">
            Username
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            value={username}
            onFocus={() => setActive("username")}
            onChange={(e) => setUsername(e.target.value)}
            className="h-10 flex-1 rounded bg-white px-3 text-slate-900 outline-none"
          />
        </div>

        <div className="flex items-center gap-4">
          <label htmlFor="password" className="w-24 shrink-0 text-base">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onFocus={() => setActive("password")}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10 flex-1 rounded bg-ubgray px-3 text-slate-900 outline-none"
          />
        </div>

        {!hideKeyboard && (
          <VirtualKeyboard onInput={typeChar} onBackspace={backspace} onCancel={cancel} />
        )}

        <label className="flex items-center justify-end gap-2 text-sm">
          <input
            type="checkbox"
            checked={hideKeyboard}
            onChange={(e) => setHideKeyboard(e.target.checked)}
            className="h-4 w-4 accent-white"
          />
          Hide Virtual Keyboard(Not Recommended)
        </label>

        {error && (
          <p className="rounded bg-white/15 px-3 py-2 text-sm text-white">{error}</p>
        )}

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            className="rounded-full bg-slate-400 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-500"
          >
            Forgot Password
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-white px-8 py-2 text-sm font-semibold text-ubblue transition-colors hover:bg-ubgray disabled:opacity-60"
          >
            {loading ? "…" : "Login"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setUsername(DEMO_EMAIL);
            setPassword(DEMO_PASSWORD);
          }}
          className="block w-full text-center text-xs text-white/80 underline-offset-2 hover:underline"
        >
          Use demo account
        </button>
      </form>
    </div>
  );
}
