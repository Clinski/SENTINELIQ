// Manual scenario tests for computeTrustScore. Plain node + assert, no framework.
//   npm test
const assert = require("node:assert");
const { computeTrustScore, DEVICE_TRUST_DAYS } = require("../lib/trustScore");

const USER = {
  known_device_id: "chrome-macbook-001",
  usual_location: "Lagos",
  avg_transaction: 15000, // 3× = 45000
  known_recipients: ["r1", "r2", "r3"],
};

const daysAgo = (d) => new Date(Date.now() - d * 86400000).toISOString();
const minsAgo = (m) => new Date(Date.now() - m * 60000).toISOString();

const scenarios = [
  {
    name: "1. All signals normal",
    ctx: { device_id: "chrome-macbook-001", location: "Lagos", hour: 14, amount: 10000, recipient_id: "r1" },
    expected: 100,
  },
  {
    name: "2. Brand-new device only (−30)",
    ctx: { device_id: "android-pixel-x", location: "Lagos", hour: 14, amount: 10000, recipient_id: "r1" },
    expected: 70,
  },
  {
    name: "3. Wrong location + unusual hour (−20 −10)",
    ctx: { device_id: "chrome-macbook-001", location: "Abuja", hour: 3, amount: 10000, recipient_id: "r2" },
    expected: 70,
  },
  {
    name: "4. Mule: high amount + unknown recipient (−25 −15 −20 combo)",
    ctx: { device_id: "chrome-macbook-001", location: "Lagos", hour: 12, amount: 60000, recipient_id: "stranger-999" },
    expected: 40, // was 60 before the combo rule — the mule pattern now scores lower
  },
  {
    name: "5. Everything wrong → clamps to 0",
    ctx: { device_id: "unknown-device", location: "Kano", hour: 2, amount: 500000, recipient_id: "stranger-999" },
    expected: 0,
  },

  // --- new hardening rules -------------------------------------------------
  {
    name: "6. Impossible travel: London→Lagos 10 min apart (−40)",
    ctx: {
      device_id: "chrome-macbook-001", location: "Lagos", amount: 10000, recipient_id: "r1",
      hour: 14, last_location: "London", last_seen: minsAgo(10), timestamp: new Date().toISOString(),
    },
    expected: 60, // otherwise "normal" — only velocity catches it
  },
  {
    name: "7. Plausible travel: Lagos→Abuja 3 h apart (no penalty)",
    ctx: {
      device_id: "chrome-macbook-001", location: "Abuja", amount: 10000, recipient_id: "r1",
      hour: 14, last_location: "Lagos", last_seen: minsAgo(180), timestamp: new Date().toISOString(),
    },
    // Abuja ≠ usual location Lagos → only the −20 location penalty, NOT impossible_travel
    expected: 80,
  },
  {
    name: "8. Mule combo alone: new recipient + ₦150k (avg-relative + combo)",
    ctx: { device_id: "chrome-macbook-001", location: "Lagos", hour: 12, amount: 150000, recipient_id: "new-mule" },
    expected: 40, // −25 (over 3×) −15 (unknown) −20 (combo)
  },
  {
    name: "9. Decay: brand-new device today → full −30",
    ctx: { device_id: "new-phone", device_first_seen: daysAgo(0), location: "Lagos", hour: 14, amount: 10000, recipient_id: "r1" },
    expected: 70,
  },
  {
    name: "10. Decay: same device seen 7 days → half penalty (−15)",
    ctx: { device_id: "new-phone", device_first_seen: daysAgo(7), location: "Lagos", hour: 14, amount: 10000, recipient_id: "r1" },
    expected: 85, // 30 * (1 - 7/14) = 15
  },
  {
    name: `11. Decay: device seen ${DEVICE_TRUST_DAYS}+ days → trust earned (no penalty)`,
    ctx: { device_id: "new-phone", device_first_seen: daysAgo(DEVICE_TRUST_DAYS + 3), location: "Lagos", hour: 14, amount: 10000, recipient_id: "r1" },
    expected: 100,
  },
  {
    name: "12. Typing rhythm mismatch → tiny −5 nudge only",
    ctx: { device_id: "chrome-macbook-001", location: "Lagos", hour: 14, amount: 10000, recipient_id: "r1", typing_rhythm_match: false },
    expected: 95, // biometric can only nudge — never a big swing
  },
  {
    name: "13. Noisy/absent typing biometric → NO effect (score unchanged)",
    ctx: { device_id: "chrome-macbook-001", location: "Lagos", hour: 14, amount: 10000, recipient_id: "r1", typing_rhythm_match: null },
    expected: 100, // a bad reading on stage must not distort the score
  },
];

let failed = 0;
for (const s of scenarios) {
  const { score, deductions } = computeTrustScore(s.ctx, USER);
  const rules = deductions.map((d) => `${d.rule}${d.points}`).join(", ") || "none";
  try {
    assert.strictEqual(score, s.expected);
    console.log(`✓ ${s.name} → ${score}  [${rules}]`);
  } catch {
    failed++;
    console.error(`✗ ${s.name} → got ${score}, expected ${s.expected}  [${rules}]`);
  }
}

if (failed) {
  console.error(`\n${failed} scenario(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${scenarios.length} scenarios passed`);
