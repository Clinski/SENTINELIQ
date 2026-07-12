// Action-bound (contextual) OTP (Builder B).
// Every code is generated for a SPECIFIC action and the message states that action
// — e.g. "OTP - 654231 to change your password". This is an anti-phishing control:
// a scammer can't trick a user into reading out a code when the message spells out
// what it authorises.
//
// In-memory store keyed by user (one active OTP per user). Demo-grade — a real
// deployment would persist with a hash + rate limits, and the code would ONLY ever
// be delivered by SMS, never returned in an API response.

const store = new Map(); // userId -> { code, purpose, message, expiresAt }
const TTL_MS = 5 * 60 * 1000;

function naira(amount) {
  const n = Number(amount);
  return Number.isFinite(n) ? `₦${n.toLocaleString("en-NG")}` : null;
}

// Build the human sentence that describes what the OTP authorises.
function purposeText(purpose, meta = {}) {
  switch (purpose) {
    case "transfer": {
      const amt = naira(meta.amount);
      const to = meta.recipient ? ` to ${meta.recipient}` : "";
      return `authorize your transfer${amt ? ` of ${amt}` : ""}${to}`;
    }
    case "change_password":
      return "change your password";
    case "add_payee":
      return `add ${meta.recipient || "a new payee"} to your account`;
    case "login":
      return "sign in to Union Bank Online";
    default:
      return "authorize this action";
  }
}

function generateOtp(userId, purpose, meta = {}) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const text = purposeText(purpose, meta);
  const message = `OTP - ${code} to ${text}. Do not share this code with anyone, including bank staff.`;
  const rec = { code, purpose, message, expiresAt: Date.now() + TTL_MS };
  store.set(userId, rec);
  return rec;
}

function verifyOtp(userId, code) {
  const rec = store.get(userId);
  if (!rec) return { ok: false, error: "No OTP was requested." };
  if (Date.now() > rec.expiresAt) {
    store.delete(userId);
    return { ok: false, error: "That code has expired. Request a new one." };
  }
  if (String(code).trim() !== rec.code) {
    return { ok: false, error: "Incorrect code. Please try again." };
  }
  store.delete(userId); // single-use
  return { ok: true, purpose: rec.purpose };
}

module.exports = { generateOtp, verifyOtp, purposeText };
