// Unit test for the cross-layer risk fusion. `npm run test:fusion`
const assert = require("assert");
const { fuseRisk, fusedRisk, createRiskTracker } = require("../lib/riskFusion");

const cases = [
  // [name, inputs, expectedLevel]
  ["decoy always CRITICAL", { trustScore: 95, decoyTriggered: true }, "CRITICAL"],
  ["decoy beats everything", { trustScore: 10, scanIntent: "suspicious", scanUrgency: 10, decoyTriggered: true }, "CRITICAL"],
  ["trust low + scam → HIGH", { trustScore: 30, scanIntent: "suspicious", scanUrgency: 9 }, "HIGH"],
  ["trust low alone → HIGH", { trustScore: 28 }, "HIGH"],
  ["severe scam alone → HIGH", { trustScore: 90, scanIntent: "suspicious", scanUrgency: 9 }, "HIGH"],
  ["trust medium alone → MEDIUM", { trustScore: 70 }, "MEDIUM"],
  ["mild scam alone → MEDIUM", { trustScore: 90, scanIntent: "suspicious", scanUrgency: 4 }, "MEDIUM"],
  ["all clear → LOW", { trustScore: 100, scanIntent: "legitimate", scanUrgency: 1 }, "LOW"],
  ["no signals → LOW", {}, "LOW"],
];

let pass = 0;
for (const [name, inputs, expected] of cases) {
  const { level } = fuseRisk(inputs);
  const ok = level === expected;
  console.log(`${ok ? "✓" : "✗"} ${name.padEnd(34)} → ${level}${ok ? "" : ` (expected ${expected})`}`);
  if (ok) pass++;
  else assert.fail(`${name}: got ${level}, expected ${expected}`);
}

// Tracker only fires onChange when the level transitions.
const emitted = [];
const tracker = createRiskTracker((c) => emitted.push(c.level));
tracker.update({ trustScore: 100 }); // LOW (no change from initial LOW) → no emit
tracker.update({ trustScore: 70 }); // → MEDIUM (emit)
tracker.update({ scanIntent: "suspicious", scanUrgency: 3 }); // still MEDIUM → no emit
tracker.update({ trustScore: 20 }); // → HIGH (emit)
tracker.update({ decoyTriggered: true }); // → CRITICAL (emit)
assert.deepStrictEqual(emitted, ["MEDIUM", "HIGH", "CRITICAL"], "tracker should emit only on transitions");
console.log(`✓ tracker emits only on transitions       → [${emitted.join(", ")}]`);

// Agreed public signature: fusedRisk(trustScore, nlpResult, decoyTriggered).
const susp = { intent: "suspicious", urgency_score: 9 };
const legit = { intent: "legitimate", urgency_score: 1 };
assert.strictEqual(fusedRisk(95, null, true), "CRITICAL", "decoy → CRITICAL");
assert.strictEqual(fusedRisk(30, susp, false), "HIGH", "low trust + scam → HIGH");
assert.strictEqual(fusedRisk(28, null, false), "HIGH", "low trust alone → HIGH");
assert.strictEqual(fusedRisk(70, null, false), "MEDIUM", "medium trust alone → MEDIUM");
assert.strictEqual(fusedRisk(100, legit, false), "LOW", "all clear → LOW");
assert.strictEqual(fusedRisk(null, null, false), "LOW", "no inputs → LOW");
console.log("✓ fusedRisk(trustScore, nlpResult, decoyTriggered) signature       → all 6 pass");

console.log(`\n✓ ${pass}/${cases.length} fusion cases + tracker + fusedRisk passed`);
