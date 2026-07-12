// Pre-generate the 5 scam fallback responses and save them to nlp_cache.json.
// Builder B serves these if the model API is unavailable during the live demo.
//   npm run gen:cache
//
// Incremental + resumable: saves after every successful classification and skips
// messages already present in nlp_cache.json. Safe to re-run (optionally with a
// different NLP_MODEL) to fill in whatever is still missing.
const fs = require("fs");
const path = require("path");
const { classifyMessage, MODEL } = require("../lib/classifyMessage");
const { SCAM_MESSAGES } = require("../lib/sampleMessages");

const OUT = path.join(__dirname, "..", "nlp_cache.json");

function loadCache() {
  if (fs.existsSync(OUT)) {
    try {
      return JSON.parse(fs.readFileSync(OUT, "utf8"));
    } catch {
      /* fall through to fresh cache */
    }
  }
  return { _meta: {}, responses: {} };
}

function save(cache) {
  cache._meta = {
    ...cache._meta,
    updated_at: new Date().toISOString(),
    count: Object.keys(cache.responses).length,
    models: Array.from(new Set([...(cache._meta.models || []), MODEL])),
  };
  fs.writeFileSync(OUT, JSON.stringify(cache, null, 2));
}

async function main() {
  require("dotenv").config();
  if (!process.env.GEMINI_API_KEY) {
    console.error("✗ GEMINI_API_KEY not set — add it to server/.env, then re-run.");
    process.exit(1);
  }

  const cache = loadCache();
  const PACING_MS = Number(process.env.NLP_PACING_MS || 20000);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const todo = SCAM_MESSAGES.filter((m) => !cache.responses[m.id]);
  console.log(`${Object.keys(cache.responses).length}/${SCAM_MESSAGES.length} already cached; ${todo.length} to do (model: ${MODEL})`);

  let first = true;
  for (const msg of todo) {
    if (!first) await sleep(PACING_MS);
    first = false;
    process.stdout.write(`Classifying ${msg.id}... `);
    try {
      const result = await classifyMessage(msg.text);
      cache.responses[msg.id] = { input: msg.text, output: result };
      save(cache); // incremental — persist immediately
      console.log(`done (${result.intent}, urgency ${result.urgency_score}) [saved]`);
    } catch (err) {
      console.log(`FAILED: ${err.message.slice(0, 120)}`);
      console.error(
        `\nStopped with ${Object.keys(cache.responses).length}/${SCAM_MESSAGES.length} cached. ` +
          `Re-run (optionally set a different NLP_MODEL in .env) to fill the rest.`,
      );
      process.exit(1);
    }
  }

  const n = Object.keys(cache.responses).length;
  console.log(`\n✓ ${n}/${SCAM_MESSAGES.length} scam fallbacks in ${OUT}`);
  if (n < SCAM_MESSAGES.length) process.exit(1);
}

main().catch((err) => {
  console.error("✗ Cache generation failed:", err.message);
  process.exit(1);
});
