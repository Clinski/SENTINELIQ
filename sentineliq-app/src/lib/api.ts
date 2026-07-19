// Central API client for Builder B's backend (Express + Socket.IO on :5000).
// Base URL is configurable so the deployed demo can point elsewhere; must be
// NEXT_PUBLIC_ to be readable in client components.
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:5000";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  /** low | standard | medium | high — drives the demographic alert copy. */
  tech_literacy_level?: string;
}

export interface LoginResult {
  user: AuthUser;
  token: string;
}

// ---- Auth --------------------------------------------------------------
export async function login(email: string, password: string): Promise<LoginResult> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const msg = await safeError(res);
    throw new Error(msg || "Login failed");
  }
  return res.json();
}

// ---- Account / transactions -------------------------------------------
export interface Balance {
  balance: number;
  account_number: string;
  currency: string;
}

export interface RecentTransaction {
  id: string;
  amount: number;
  recipient_id: string | null;
  timestamp: string;
  status: string;
  /** Recipient's real name (e.g. "Chinedu Okafor"), joined server-side. */
  recipient_name?: string | null;
  /** Recipient's bank (e.g. "Guaranty Trust Bank"). */
  recipient_bank?: string | null;
  /** Last 4 digits of the recipient's account number. */
  recipient_account_last4?: string | null;
  /** Merchant/bill label for transactions with no recipient (e.g. "DSTV Subscription"). */
  description?: string | null;
}

export async function getBalance(token: string): Promise<Balance> {
  return authedGet<Balance>("/api/account/balance", token);
}

export async function getRecentTransactions(token: string): Promise<RecentTransaction[]> {
  return authedGet<RecentTransaction[]>("/api/transactions/recent", token);
}

// ---- Trust scoring (Send Money) ---------------------------------------
export type TrustAction = "proceed" | "soft-step-up" | "hard-step-up" | "block";

export interface TrustScoreResult {
  score: number;
  action: TrustAction;
  signals: string[];
  explanation: string;
  deductions?: { rule: string; points: number }[];
}

/**
 * Ask the backend to score a proposed transfer. `scenario` lets the demo force
 * a normal / unusual / fraudulent context so all three security states can be
 * shown on demand. Builder B computes the real score server-side.
 */
export async function scoreTransfer(
  token: string,
  body: { recipient: string; amount: number; scenario?: string },
): Promise<TrustScoreResult> {
  const res = await fetch(`${API_URL}/api/trust-score`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await safeError(res)) || "Trust scoring failed");
  return res.json();
}

// ---- Action-bound OTP (Hard Step-Up) ----------------------------------
export interface OtpChallenge {
  message: string; // "OTP - 654231 to authorize your transfer of ₦X to Y…"
  purpose: string;
  expires_in: number;
  code?: string; // demo only — omitted in production
}

export async function sendOtp(
  token: string,
  body: { purpose: string; amount?: number; recipient?: string },
): Promise<OtpChallenge> {
  const res = await fetch(`${API_URL}/api/otp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await safeError(res)) || "Could not send OTP");
  return res.json();
}

export async function verifyOtp(
  token: string,
  code: string,
): Promise<{ ok: boolean; error?: string; purpose?: string }> {
  const res = await fetch(`${API_URL}/api/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ code }),
  });
  return res.json();
}

// ---- NLP message scan (Messages) --------------------------------------
export interface ScanResult {
  intent: "legitimate" | "suspicious";
  urgency_score: number;
  reason: string;
  alert_text_tech: string;
  alert_text_standard: string;
  alert_text_elderly: string;
  /** true when served from nlp_cache.json instead of a live model call */
  cached?: boolean;
}

export async function scanMessage(text: string, token?: string): Promise<ScanResult> {
  const res = await fetch(`${API_URL}/api/scan-message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message: text }),
  });
  if (!res.ok) throw new Error((await safeError(res)) || "Scan failed");
  return res.json();
}

// ---- Admin: field map (real vs decoy shadow fields) -------------------
export interface FieldMap {
  user: string | null;
  real: { label: string; value: string }[];
  decoy: {
    id: string;
    field_type: string;
    value_masked: string;
    trips: number;
    last_trip: string | null;
  }[];
}

// SECURITY/SOC view only — the shadow decoy layer is never exposed by user APIs.
// Requires an authenticated token (endpoint is behind requireAuth).
export async function getFieldMap(token: string): Promise<FieldMap> {
  return authedGet<FieldMap>("/api/admin/field-map", token);
}

// ---- helpers -----------------------------------------------------------
async function authedGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await safeError(res)) || `GET ${path} failed`);
  return res.json();
}

async function safeError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data?.error || "";
  } catch {
    return "";
  }
}
