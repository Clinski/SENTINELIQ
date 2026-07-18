"use client";

// App-wide auth state. Holds the JWT + user in React state/context only — never
// localStorage, so an XSS in this app can't read a persisted token. Trade-off: a
// hard page refresh drops the session and requires signing in again.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { login as apiLogin, type AuthUser } from "./api";

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  ready: boolean; // has the alert-level preference finished hydrating?
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  /** Session override for alert language (null = use the user's profile level). */
  alertLevel: string | null;
  setAlertLevel: (level: string | null) => void;
  /** Level all alerts should actually use: override, else profile, else standard. */
  effectiveLevel: string;
}

const ALERT_LEVEL_KEY = "sentineliq.alertLevel";
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [alertLevel, setAlertLevelState] = useState<string | null>(null);

  // Hydrate once on mount. Only the (non-sensitive) alert-level preference is
  // persisted — the token/user never touch storage, so there's nothing to
  // restore for auth; the user just signs in again after a refresh.
  useEffect(() => {
    try {
      const savedLevel = localStorage.getItem(ALERT_LEVEL_KEY);
      if (savedLevel) setAlertLevelState(savedLevel);
    } catch {
      /* ignore corrupt storage */
    }
    setReady(true);
  }, []);

  const setAlertLevel = useCallback((level: string | null) => {
    setAlertLevelState(level);
    if (level) localStorage.setItem(ALERT_LEVEL_KEY, level);
    else localStorage.removeItem(ALERT_LEVEL_KEY);
  }, []);

  const effectiveLevel = alertLevel ?? user?.tech_literacy_level ?? "standard";

  const signIn = useCallback(async (email: string, password: string) => {
    const { user, token } = await apiLogin(email, password);
    setToken(token);
    setUser(user);
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ token, user, ready, signIn, signOut, alertLevel, setAlertLevel, effectiveLevel }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
