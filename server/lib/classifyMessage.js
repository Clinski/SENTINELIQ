// classifyMessage(messageText) — wraps the Gemini API call for scam classification.
// Builder B imports this and calls it inside POST /api/scan-message on Day 2.
//
//   const { classifyMessage } = require("./lib/classifyMessage");
//   const result = await classifyMessage("URGENT: your account will be BLOCKED...");
//
// Returns the agreed JSON shape (see REQUIRED_KEYS). Throws on API/parse failure so
// the caller can fall back to nlp_cache.json.
//
// NOTE: originally spec'd for Claude (claude-sonnet-4-6); switched to Google Gemini
// because the Anthropic account had no credits. The prompt, output shape, tests, and
// cache are unchanged — only this API layer differs.

require("dotenv").config();
const { GoogleGenAI, Type } = require("@google/genai");
const { NLP_SYSTEM_PROMPT } = require("./nlpPrompt");

const MODEL = process.env.NLP_MODEL || "gemini-2.5-flash";

const REQUIRED_KEYS = [
  "intent",
  "urgency_score",
  "reason",
  "alert_text_tech",
  "alert_text_standard",
  "alert_text_elderly",
];

// Gemini structured-output schema — forces valid JSON with exactly our fields.
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    intent: { type: Type.STRING, enum: ["legitimate", "suspicious"] },
    urgency_score: { type: Type.INTEGER },
    reason: { type: Type.STRING },
    alert_text_tech: { type: Type.STRING },
    alert_text_standard: { type: Type.STRING },
    alert_text_elderly: { type: Type.STRING },
  },
  required: REQUIRED_KEYS,
  propertyOrdering: REQUIRED_KEYS,
};

// Lazily construct the client so importing this module never throws when the
// key is absent (only an actual classifyMessage() call needs it).
let _client = null;
function client() {
  if (!_client) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set — add it to server/.env");
    }
    _client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return _client;
}

// Tolerant JSON extraction — responseMimeType should already give clean JSON,
// but strip any stray fences / prose just in case.
function extractJson(text) {
  const cleaned = text.replace(/```(?:json)?/gi, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON object found in model response");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

function validate(obj) {
  for (const key of REQUIRED_KEYS) {
    if (!(key in obj)) throw new Error(`Classifier response missing key: ${key}`);
  }
  if (obj.intent !== "legitimate" && obj.intent !== "suspicious") {
    throw new Error(`Invalid intent: ${obj.intent}`);
  }
  obj.urgency_score = Number(obj.urgency_score);
  if (Number.isNaN(obj.urgency_score)) throw new Error("urgency_score is not a number");
  obj.urgency_score = Math.max(0, Math.min(10, Math.round(obj.urgency_score)));
  return obj;
}

// Retry on Gemini free-tier rate limits (429 RESOURCE_EXHAUSTED), honoring the
// server-provided retryDelay. Bounded so a live caller never blocks forever.
function retryDelaySeconds(msg) {
  const m = /retry in ([\d.]+)s/i.exec(msg) || /"retryDelay":"([\d.]+)s"/i.exec(msg);
  return m ? Math.ceil(parseFloat(m[1])) : 15;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, maxAttempts = 6) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = (err && err.message) || String(err);
      // Retry rate limits (429), transient overload/unavailable (503), and
      // transient network failures.
      const retryable =
        /RESOURCE_EXHAUSTED|429|quota|503|UNAVAILABLE|overloaded|high demand|fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|socket|network/i.test(
          msg,
        );
      if (!retryable || attempt === maxAttempts) throw err;
      const wait = Math.min(retryDelaySeconds(msg) + 1, 60);
      process.stderr.write(`  [rate-limited; waiting ${wait}s then retrying...]\n`);
      await sleep(wait * 1000);
      lastErr = err;
    }
  }
  throw lastErr;
}

async function classifyMessage(messageText) {
  if (typeof messageText !== "string" || !messageText.trim()) {
    throw new Error("classifyMessage requires a non-empty string");
  }

  const response = await withRetry(() =>
    client().models.generateContent({
      model: MODEL,
      contents: `Classify this message:\n"""${messageText}"""`,
      config: {
        systemInstruction: NLP_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0,
      },
    }),
  );

  const text = response.text;
  if (!text) throw new Error("Empty response from model");

  return validate(extractJson(text));
}

module.exports = { classifyMessage, MODEL, REQUIRED_KEYS };
