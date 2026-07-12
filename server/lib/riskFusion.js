// Cross-layer risk fusion (Builder B).
// Combines the three detection layers into a single fused risk level:
//   Layer 1 — trust score (login/transaction anomaly)
//   Layer 2 — NLP message scan (scam classification)
//   Layer 3 — decoy / honeytoken trigger
//
// Rules (highest wins):
//   decoy triggered ...................................... CRITICAL
//   Layer 1 low  AND  Layer 2 suspicious ................. HIGH
//   Layer 1 low  (alone) ................................. HIGH
//   Layer 2 suspicious & high-urgency (alone) ............ HIGH
//   Layer 1 medium (alone)  OR  Layer 2 suspicious ....... MEDIUM
//   otherwise ............................................ LOW

const LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

// Thresholds
const LOW_TRUST = 40; // score < 40  → low trust  (hard step-up territory)
const MED_TRUST = 80; // 40..79      → medium trust (soft step-up territory)
const HIGH_URGENCY = 8; // scam urgency >= 8 → treat as severe on its own

/**
 * @param {object} inputs
 *   trustScore     {number|null}  latest Layer-1 score (0-100), null if unknown
 *   scanIntent     {string|null}  "suspicious" | "legitimate" | null
 *   scanUrgency    {number|null}  Layer-2 urgency 0-10
 *   decoyTriggered {boolean}      Layer-3: has a honeytoken been touched?
 * @returns {{ level: string, reasons: string[] }}
 */
function fuseRisk({ trustScore = null, scanIntent = null, scanUrgency = null, decoyTriggered = false } = {}) {
  const reasons = [];

  if (decoyTriggered) {
    return { level: "CRITICAL", reasons: ["decoy_touched"] };
  }

  const layer1Low = typeof trustScore === "number" && trustScore < LOW_TRUST;
  const layer1Med =
    typeof trustScore === "number" && trustScore >= LOW_TRUST && trustScore < MED_TRUST;
  const layer2Susp = scanIntent === "suspicious";
  const layer2Severe = layer2Susp && (scanUrgency ?? 0) >= HIGH_URGENCY;

  if (layer1Low) reasons.push("trust_low");
  else if (layer1Med) reasons.push("trust_medium");
  if (layer2Susp) reasons.push(layer2Severe ? "scam_high_urgency" : "scam_suspicious");

  // Both layers firing together → HIGH.
  if (layer1Low && layer2Susp) return { level: "HIGH", reasons };
  // Either layer, at severe strength, alone → HIGH.
  if (layer1Low || layer2Severe) return { level: "HIGH", reasons };
  // Either layer at moderate strength → MEDIUM.
  if (layer1Med || layer2Susp) return { level: "MEDIUM", reasons };

  return { level: "LOW", reasons };
}

/**
 * Public, agreed signature handed to Builder B for integration.
 * Lives here in server/lib/riskFusion.js (imported by index.js and the tracker),
 * so there is exactly one fusion implementation.
 *
 *   fusedRisk(trustScore, nlpResult, decoyTriggered) → 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'
 *
 * @param {number|null} trustScore    Layer 1 trust score (0-100)
 * @param {object|null} nlpResult     Layer 2: classifyMessage() output
 *                                     ({ intent, urgency_score, ... }) or null
 * @param {boolean}     decoyTriggered Layer 3: has a honeytoken been touched?
 * @returns {'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'}
 */
function fusedRisk(trustScore, nlpResult, decoyTriggered = false) {
  const { level } = fuseRisk({
    trustScore: typeof trustScore === "number" ? trustScore : null,
    scanIntent: nlpResult?.intent ?? null,
    scanUrgency: nlpResult?.urgency_score ?? null,
    decoyTriggered: !!decoyTriggered,
  });
  return level;
}

/**
 * Stateful tracker: holds the latest inputs from each layer and re-fuses on every
 * update, invoking `onChange(level, payload)` ONLY when the fused level changes.
 * Used by index.js to emit 'risk-level-change' just on transitions.
 */
function createRiskTracker(onChange) {
  const state = {
    trustScore: null,
    scanIntent: null,
    scanUrgency: null,
    decoyTriggered: false,
  };
  let currentLevel = "LOW";

  function update(partial) {
    Object.assign(state, partial);
    const { level, reasons } = fuseRisk(state);
    if (level !== currentLevel) {
      const previous = currentLevel;
      currentLevel = level;
      onChange({ level, previous, reasons, inputs: { ...state }, ts: Date.now() });
    }
    return level;
  }

  function reset() {
    Object.assign(state, {
      trustScore: null,
      scanIntent: null,
      scanUrgency: null,
      decoyTriggered: false,
    });
    currentLevel = "LOW";
  }

  return {
    update,
    reset,
    get level() {
      return currentLevel;
    },
    get state() {
      return { ...state };
    },
  };
}

module.exports = { fuseRisk, fusedRisk, createRiskTracker, LEVELS };
