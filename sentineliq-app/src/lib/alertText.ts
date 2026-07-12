// Demographic alert copy (Builder C).
// Every alert type has three variants tuned to the user's tech literacy:
//   tech     — concise, technical, for tech-native users
//   standard — plain, friendly, the default
//   elderly  — slow, reassuring, explicit about what NOT to do
//
// The DB stores users.tech_literacy_level as one of: low | standard | medium | high.
// variantForLiteracy() maps that to one of the three copy variants.

export type AlertType = "phishing" | "soft_step_up" | "hard_step_up" | "decoy_breach";
export type Variant = "tech" | "standard" | "elderly";

export function variantForLiteracy(level?: string | null): Variant {
  if (level === "high") return "tech";
  if (level === "low") return "elderly";
  return "standard"; // standard, medium, or unknown
}

// 4 alert types × 3 variants = 12 texts.
export const ALERT_TEXTS: Record<AlertType, Record<Variant, string>> = {
  // (1) Phishing SMS blocked
  phishing: {
    tech: "Phishing blocked. This message spoofs Union Bank to harvest credentials via a lookalike link/number. Do not interact — report and delete.",
    standard:
      "We blocked a scam message. It pretends to be Union Bank to steal your details. Don't tap any links, call any numbers, or reply.",
    elderly:
      "This message is fake. It is NOT from your bank. Do not click anything and do not reply. Your account is safe. If you are worried, call the number on your bank card.",
  },

  // (2) Trust score soft step-up
  soft_step_up: {
    tech: "Step-up auth required — anomalous signals on this session. Confirm with biometrics to proceed.",
    standard:
      "Quick check — please confirm it's you with your fingerprint or face to continue this action.",
    elderly:
      "For your safety, please confirm it is really you. Use your fingerprint or face. This is normal and only takes a moment.",
  },

  // (3) Trust score hard step-up
  hard_step_up: {
    tech: "High-risk transaction — multiple trust signals failed. One-time code verification required before it can proceed.",
    standard:
      "This transfer looks unusual, so we've paused it. Enter the one-time code we texted you to continue.",
    elderly:
      "We stopped this transfer to keep your money safe. We sent a code to your phone. Please type it in to continue. If you did NOT start this transfer, do not enter the code and call your bank.",
  },

  // (4) Decoy breach detected
  decoy_breach: {
    tech: "Breach detected — a honeytoken field was accessed from an unrecognised source. Account frozen and session invalidated.",
    standard:
      "We detected a break-in attempt and froze your account to protect your money. Please contact Union Bank now.",
    elderly:
      "Someone tried to get into your account, so we locked it to keep your money safe. Please call Union Bank. Do NOT share any codes or passwords with anyone.",
  },
};

/** Pick the right alert copy for an alert type given a DB literacy level. */
export function alertText(type: AlertType, level?: string | null): string {
  return ALERT_TEXTS[type][variantForLiteracy(level)];
}
