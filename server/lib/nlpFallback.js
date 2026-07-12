// Offline NLP fallback (Builder C/B).
// When the live model is unavailable (rate-limited / timed out), classify a message
// from the pre-generated cache instead of failing. Exact text rarely matches on
// stage, so we score token overlap against each cached scam and return the closest
// one above a threshold; otherwise a safe "legitimate" default (so /api/scan-message
// never hard-fails during the demo).

function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s) {
  return new Set(normalize(s).split(" ").filter(Boolean));
}

// Jaccard similarity of token sets: |A∩B| / |A∪B|, in [0,1].
function similarity(a, b) {
  const A = tokens(a);
  const B = tokens(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

const DEFAULT_LEGIT = {
  intent: "legitimate",
  urgency_score: 0,
  reason: "No scam signals detected (offline fallback).",
  alert_text_tech: "No threat indicators found. No action needed.",
  alert_text_standard: "This message looks fine — no action needed.",
  alert_text_elderly: "This message looks safe. You do not need to do anything.",
};

/**
 * Pick the best cached response for a message, or a safe legit default.
 * @returns {{ output:object, cached:true, source:string, similarity:number }}
 */
function fallbackClassify(message, cache, threshold = 0.3) {
  const entries = Object.entries((cache && cache.responses) || {});
  let best = null;
  let bestSim = 0;
  for (const [id, entry] of entries) {
    const sim = similarity(message, entry.input);
    if (sim > bestSim) {
      bestSim = sim;
      best = { id, entry };
    }
  }
  if (best && bestSim >= threshold) {
    return {
      output: best.entry.output,
      cached: true,
      source: `cache:${best.id}`,
      similarity: Number(bestSim.toFixed(2)),
    };
  }
  return {
    output: DEFAULT_LEGIT,
    cached: true,
    source: "default-legit",
    similarity: Number(bestSim.toFixed(2)),
  };
}

module.exports = { fallbackClassify, similarity, normalize };
