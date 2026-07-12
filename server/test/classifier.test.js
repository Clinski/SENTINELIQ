// Classifier accuracy test — 5 scam + 5 legitimate messages.
// Requires ANTHROPIC_API_KEY (makes 10 live API calls).
//   npm run scan:test
const { classifyMessage } = require("../lib/classifyMessage");
const { ALL_MESSAGES } = require("../lib/sampleMessages");

async function main() {
  require("dotenv").config();
  if (!process.env.GEMINI_API_KEY) {
    console.error("✗ GEMINI_API_KEY not set — add it to server/.env, then re-run.");
    process.exit(1);
  }

  // Free tier allows ~5 req/min; space calls to stay under quota.
  const PACING_MS = Number(process.env.NLP_PACING_MS || 13000);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  let failed = 0;
  let first = true;
  for (const msg of ALL_MESSAGES) {
    if (!first) await sleep(PACING_MS);
    first = false;
    try {
      const result = await classifyMessage(msg.text);
      const ok = result.intent === msg.expected;
      if (!ok) failed++;
      const mark = ok ? "✓" : "✗";
      console.log(
        `${mark} ${msg.id.padEnd(22)} → ${result.intent.padEnd(11)} ` +
          `(urgency ${result.urgency_score})  expected ${msg.expected}`,
      );
      if (!ok) console.log(`    reason: ${result.reason}`);
    } catch (err) {
      failed++;
      console.error(`✗ ${msg.id.padEnd(22)} → ERROR: ${err.message}`);
    }
  }

  console.log(
    `\n${ALL_MESSAGES.length - failed}/${ALL_MESSAGES.length} classified correctly`,
  );
  if (failed) process.exit(1);
}

main();
