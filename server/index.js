// SentinelIQ backend — Day 1 (Builder B).
// Express + Socket.IO. REST stubs + live judge-dashboard feeds over Socket.IO.
// Runs alongside the Next.js app (frontend :3000, this backend :5000).
//
//   npm install        # deps already in package.json
//   npm run dev        # auto-restart on save (node --watch)
//
// Real auth/DB/trust-scoring/NLP land on Day 2 — shapes here match the frontend.

require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const { faker } = require("@faker-js/faker");
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const { assessTrust } = require("./lib/trustScore");
const { classifyMessage } = require("./lib/classifyMessage");
const { createRiskTracker } = require("./lib/riskFusion");
const { makeDecoyGuard } = require("./lib/decoyGuard");
const { seedDatabase } = require("./db/seed");
const { scheduleDecoyRotation } = require("./lib/decoyRotation");
const { fallbackClassify } = require("./lib/nlpFallback");
const { generateOtp, verifyOtp } = require("./lib/otp");

// API action ("hard-step-up") → trust_events.action_taken enum ("hard_step_up").
const ACTION_TO_ENUM = {
  proceed: "none",
  "soft-step-up": "soft_step_up",
  "hard-step-up": "hard_step_up",
  block: "block",
  "breach-alert": "breach_alert",
};

// Pre-generated NLP fallbacks (Builder C) — served if the live model is rate-limited.
let NLP_CACHE = { responses: {} };
try {
  NLP_CACHE = JSON.parse(fs.readFileSync(path.join(__dirname, "nlp_cache.json"), "utf8"));
} catch {
  console.warn("[nlp] nlp_cache.json not found — live model only, no fallback");
}

const PORT = process.env.PORT || 5000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

const app = express();
app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());

// ---------------------------------------------------------------------------
// Postgres — pool is created but NOT connected at boot, so the server runs
// without a live DB today. TODO(Day 2): point DATABASE_URL at a real Postgres.
// ---------------------------------------------------------------------------
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      // Hosted Postgres (Neon/Supabase) requires SSL; local usually doesn't.
      ssl: /@(localhost|127\.0\.0\.1)/.test(process.env.DATABASE_URL)
        ? false
        : { rejectUnauthorized: false },
    })
  : null;

// pg.Pool emits 'error' for problems on an IDLE client (e.g. Neon terminating a
// background connection). Without a listener, Node treats that as an uncaught
// exception and kills the whole process — fatal for a live demo. Log and continue;
// the pool transparently opens a fresh connection on the next query.
if (pool) {
  pool.on("error", (err) => {
    console.error("[db] idle client error (pool recovers automatically):", err.message);
  });
}

// ---------------------------------------------------------------------------
// Socket.IO — created early so middleware (decoy guard) and the risk tracker can
// emit. The connection handler + mock loop are set up further down.
// ---------------------------------------------------------------------------
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: FRONTEND_ORIGIN } });

// Cross-layer risk fusion. Emits 'risk-level-change' ONLY when the fused level
// actually transitions (LOW ↔ MEDIUM ↔ HIGH ↔ CRITICAL).
const riskTracker = createRiskTracker((change) => {
  io.emit("risk-level-change", change);
  console.log(`[risk] level → ${change.level} (was ${change.previous}) [${change.reasons.join(", ")}]`);
});

// Decoy honeytoken listener — runs on EVERY request. A match trips Layer 3.
app.use(
  makeDecoyGuard({
    pool,
    io,
    onTrip: () => riskTracker.update({ decoyTriggered: true }),
  }),
);

// ---------------------------------------------------------------------------
// Placeholder data — mirrors src/lib/placeholderData.ts on the frontend.
// TODO(Day 2): replace with real queries via `pool`.
// ---------------------------------------------------------------------------
const DEMO_USER = {
  id: "user-001",
  name: "Ada Demo",
  email: "demo@unionbank.ng",
  password: "demo1234", // demo only — never store plaintext for real
};

const ACCOUNT = {
  holder: "Ada Demo",
  number: "•••• 4821",
  balance: 482650.75,
  currency: "NGN",
};

const TRANSACTIONS = [
  { id: "t1", description: "Shoprite Ikeja", date: "2026-07-01", amount: -12500 },
  { id: "t2", description: "Salary — Unilag", date: "2026-06-28", amount: 350000 },
  { id: "t3", description: "MTN Airtime", date: "2026-06-27", amount: -2000 },
  { id: "t4", description: "Transfer to Chidi O.", date: "2026-06-25", amount: -45000 },
  { id: "t5", description: "Refund — Jumia", date: "2026-06-24", amount: 8990 },
];

const MESSAGES = [
  { id: "m1", sender: "Union Bank", body: "Your OTP is 483920. Do not share it with anyone.", timestamp: "2026-07-02 09:14" },
  { id: "m2", sender: "+234 809 555 0142", body: "URGENT: Your account will be BLOCKED today. Verify now at union-bank-secure.link/verify.", timestamp: "2026-07-02 08:47" },
  { id: "m3", sender: "Mum", body: "Did you get the transfer I sent yesterday?", timestamp: "2026-07-01 19:32" },
  { id: "m4", sender: "REWARDS", body: "Congratulations! You've WON ₦2,000,000. Send your BVN and card PIN to claim.", timestamp: "2026-07-01 14:05" },
];

// ---------------------------------------------------------------------------
// REST API
// ---------------------------------------------------------------------------
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "sentineliq-backend", db: !!pool, time: new Date().toISOString() });
});

// POST /api/demo/reset — the panic button. Re-seeds fresh data (which clears
// trust_events, access_logs, and resets/regenerates decoy_fields) and resets the
// in-memory fused-risk state, so a broken rehearsal recovers in seconds.
// Optionally gated by DEMO_RESET_KEY (sent as x-demo-key) to avoid accidents.
app.post("/api/demo/reset", async (req, res) => {
  if (process.env.DEMO_RESET_KEY && req.headers["x-demo-key"] !== process.env.DEMO_RESET_KEY) {
    return res.status(403).json({ error: "Invalid or missing x-demo-key" });
  }
  if (!pool) return res.status(503).json({ error: "Database not configured" });

  const client = await pool.connect();
  try {
    const summary = await seedDatabase(client); // TRUNCATEs + re-seeds in one txn
    riskTracker.reset(); // clear fused-risk memory → LOW
    io.emit("demo-reset", { ts: Date.now() });
    io.emit("risk-level-change", { level: "LOW", reasons: [], initial: true, ts: Date.now() });
    console.log("[demo] reset complete — fresh seed, risk state cleared");
    res.json({ ok: true, reseeded: true, ...summary });
  } catch (err) {
    console.error("[demo] reset failed:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// JWT auth middleware — expects `Authorization: Bearer <token>`.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// POST /api/auth/login — DB-backed. Looks the user up by email and checks a shared
// demo password (there's no password column yet). TODO(Day 2): real hashed passwords.
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "demo1234";
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!pool) return res.status(503).json({ error: "Database not configured" });
  const { rows } = await pool.query(
    "SELECT id, name, email, tech_literacy_level FROM users WHERE email = $1",
    [email?.trim().toLowerCase()],
  );
  const user = rows[0];
  if (user && password === DEMO_PASSWORD) {
    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: "1h" });
    return res.json({ user, token });
  }
  return res.status(401).json({ error: "Invalid credentials" });
});

// POST /api/otp/send — issue an action-bound OTP for the caller. The `message` is
// personalised to the action ("OTP - 654231 to authorize your transfer of ₦X to Y").
// NOTE: `code` is returned here for the DEMO only (no real SMS gateway). In
// production the code is delivered by SMS and never appears in the API response.
app.post("/api/otp/send", requireAuth, (req, res) => {
  const { purpose = "transfer", amount, recipient } = req.body ?? {};
  const rec = generateOtp(req.auth.sub, purpose, { amount, recipient });
  res.json({ message: rec.message, purpose: rec.purpose, expires_in: 300, code: rec.code });
});

// POST /api/otp/verify — check the caller's OTP (single-use, action-bound).
app.post("/api/otp/verify", requireAuth, (req, res) => {
  const result = verifyOtp(req.auth.sub, (req.body ?? {}).code);
  res.status(result.ok ? 200 : 400).json(result);
});

// GET /api/account/balance — authed; returns the caller's account balance.
app.get("/api/account/balance", requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    "SELECT balance, account_number FROM accounts WHERE user_id = $1 LIMIT 1",
    [req.auth.sub],
  );
  if (!rows[0]) return res.status(404).json({ error: "No account for user" });
  res.json({ balance: Number(rows[0].balance), account_number: rows[0].account_number, currency: "NGN" });
});

// GET /api/transactions/recent — authed; caller's most recent transactions.
app.get("/api/transactions/recent", requireAuth, async (req, res) => {
  // Enrich each row with the recipient's real name, bank and masked account so
  // the statement reads naturally. LEFT JOINs keep rows even if a recipient (or
  // their account) is missing.
  const { rows } = await pool.query(
    `SELECT t.id, t.amount, t.recipient_id, t.timestamp, t.status, t.description,
            ru.name                         AS recipient_name,
            ra.bank_name                    AS recipient_bank,
            RIGHT(ra.account_number, 4)     AS recipient_account_last4
       FROM transactions t
       JOIN accounts a  ON a.id = t.from_account
       LEFT JOIN users ru    ON ru.id = t.recipient_id
       LEFT JOIN accounts ra ON ra.user_id = ru.id
      WHERE a.user_id = $1
      ORDER BY t.timestamp DESC
      LIMIT 10`,
    [req.auth.sub],
  );
  res.json(rows);
});

// POST /api/trust-score — authed. Scores a proposed transfer with the real
// computeTrustScore engine and streams the result to the judge dashboard.
// `scenario` (normal|unusual|fraud|decoy) shapes a demo context so all three
// security states can be shown on demand; a real client would send the true ctx.
function scenarioContext(scenario, user, amount) {
  const base = {
    device_id: user.known_device_id,
    location: user.usual_location,
    hour: 12,
    amount: amount || Number(user.avg_transaction) || 15000,
    recipient_id: (user.known_recipients || [])[0] ?? null,
  };
  switch (scenario) {
    case "unusual": // new location + odd hour  → −20 −10 = 70 (soft)
      return { ...base, location: "Abuja", hour: 3 };
    case "fraud": // wrong device + big amount + unknown recipient → hard
    case "decoy":
      return {
        ...base,
        device_id: "unknown-device-xyz",
        device_first_seen: new Date().toISOString(),
        amount: (Number(user.avg_transaction) || 15000) * 5,
        recipient_id: "unknown-recipient",
      };
    case "impossible_travel": // "acts normal" but can't be two places at once → −40
      return {
        ...base,
        last_location: "London",
        last_seen: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 min ago
        timestamp: new Date().toISOString(),
      };
    case "mule": // first-time recipient + large amount → combo penalty
      return {
        ...base,
        recipient_id: "brand-new-mule-acct",
        amount: Math.max(Number(amount) || 0, 150000),
      };
    case "mimic": // attacker mimics profile on a brand-new device → full device penalty
      return {
        ...base,
        device_id: "cloned-device-" + Date.now(),
        device_first_seen: new Date().toISOString(),
      };
    case "aged_device": // same new device, but used consistently for 20 days → trust earned
      return {
        ...base,
        device_id: "returning-device-abc",
        device_first_seen: new Date(Date.now() - 20 * 86400000).toISOString(),
      };
    default: // "normal" → 100 (silent)
      return base;
  }
}

app.post("/api/trust-score", requireAuth, async (req, res) => {
  const body = req.body ?? {};
  const { rows } = await pool.query(
    `SELECT id, name, known_device_id, usual_location, avg_transaction, known_recipients,
            last_location, last_seen_at
       FROM users WHERE id = $1`,
    [req.auth.sub],
  );
  const user = rows[0];
  if (!user) return res.status(404).json({ error: "User not found" });

  // Demo scenarios are self-contained (no DB side-effects); a real event both
  // reads persisted history and writes it back.
  const realEvent = hasExplicitCtx(body);

  // Build the transaction/login-event context.
  const ctx = realEvent
    ? {
        device_id: body.device_id,
        location: body.location,
        hour: body.hour,
        timestamp: body.timestamp,
        amount: Number(body.amount) || 0,
        recipient_id: body.recipient_id,
        typing_rhythm_match: body.typing_rhythm_match,
      }
    : scenarioContext(body.scenario || "normal", user, Number(body.amount));

  // For a real event, hydrate the velocity + device-decay inputs from PERSISTED
  // history (previous location/time, this device's true first-seen) unless the
  // caller supplied them explicitly.
  if (realEvent) {
    if (ctx.last_location == null) ctx.last_location = user.last_location;
    if (ctx.last_seen == null) ctx.last_seen = user.last_seen_at;
    if (ctx.device_first_seen == null && ctx.device_id) {
      const dev = await pool.query(
        "SELECT first_seen FROM devices WHERE user_id = $1 AND device_id = $2",
        [user.id, ctx.device_id],
      );
      if (dev.rows[0]) ctx.device_first_seen = dev.rows[0].first_seen;
    }
  }

  // Layer 1 assessment → { score, action, signals, explanation, deductions }
  const assessment = assessTrust(ctx, user);
  const { score, action, signals, explanation, deductions } = assessment;

  // Persist the trust event (audit trail).
  try {
    await pool.query(
      `INSERT INTO trust_events (user_id, score, signals_json, action_taken)
       VALUES ($1, $2, $3, $4)`,
      [user.id, score, JSON.stringify({ signals, deductions }), ACTION_TO_ENUM[action] || "none"],
    );
  } catch (err) {
    console.error("[trust] trust_events insert failed:", err.message);
  }

  // Write-back for real events: upsert the device (first_seen is set once and kept,
  // so trust accrues from true first contact) and advance the user's last known
  // location/time so the NEXT event's velocity check compares against this one.
  if (realEvent) {
    try {
      const eventTime = ctx.timestamp ? new Date(ctx.timestamp) : new Date();
      if (ctx.device_id) {
        await pool.query(
          `INSERT INTO devices (user_id, device_id, first_seen, last_seen)
           VALUES ($1, $2, $3, $3)
           ON CONFLICT (user_id, device_id) DO UPDATE SET last_seen = EXCLUDED.last_seen`,
          [user.id, ctx.device_id, eventTime],
        );
      }
      if (ctx.location) {
        await pool.query(
          "UPDATE users SET last_location = $1, last_seen_at = $2 WHERE id = $3",
          [ctx.location, eventTime, user.id],
        );
      }
    } catch (err) {
      console.error("[trust] history write-back failed:", err.message);
    }
  }

  // Emit 'trust-score-update' with the FULL signals breakdown for the dashboard.
  io.emit("trust-score-update", {
    user: user.name,
    userId: user.id,
    score,
    action,
    signals,
    deductions,
    explanation,
    ts: Date.now(),
  });

  // Feed Layer 1 into the fusion tracker (may emit risk-level-change).
  riskTracker.update({ trustScore: score });

  // Response contract: { score, action, signals, explanation }.
  res.json({ score, action, signals, explanation, deductions });
});

// True when the client sent a real event context (vs. just a demo scenario).
function hasExplicitCtx(body) {
  return (
    "device_id" in body ||
    "location" in body ||
    "hour" in body ||
    "timestamp" in body ||
    "recipient_id" in body
  );
}

// Circuit breaker: once a live scan fails, skip the (slow) live call for a cooldown
// window and serve cache instantly — so only the FIRST scan is slow when the API is
// down, not every one. Reopens after the window to retry live if it recovers.
let nlpBreakerOpenUntil = 0;
const NLP_BREAKER_MS = Number(process.env.NLP_BREAKER_MS || 60000);

// POST /api/scan-message — classify an incoming message. Tries the live model,
// falls back to the pre-generated cache, and streams the verdict to the dashboard.
app.post("/api/scan-message", async (req, res) => {
  const message = (req.body?.message ?? "").toString();
  if (!message.trim()) return res.status(400).json({ error: "message is required" });

  let result;
  let cached = false;
  const breakerOpen = Date.now() < nlpBreakerOpenUntil;

  if (breakerOpen) {
    // Recent failure — don't wait on the live call, serve cache immediately.
    const fb = fallbackClassify(message, NLP_CACHE);
    result = fb.output;
    cached = true;
  } else {
    try {
      // Race the live model against a timeout so a hung/slow API can't stall the demo.
      const timeoutMs = Number(process.env.NLP_TIMEOUT_MS || 8000);
      result = await Promise.race([
        classifyMessage(message),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`scan timed out after ${timeoutMs}ms`)), timeoutMs),
        ),
      ]);
    } catch (err) {
      // Live model failed/timed out — trip the breaker and resolve from cache (closest
      // match, safe legit default). Never hard-fails during the demo.
      nlpBreakerOpenUntil = Date.now() + NLP_BREAKER_MS;
      const fb = fallbackClassify(message, NLP_CACHE);
      result = fb.output;
      cached = true;
      console.log(
        `[nlp] live scan failed (${err.message}) — ${fb.source} (sim=${fb.similarity}); ` +
          `breaker open ${NLP_BREAKER_MS / 1000}s`,
      );
    }
  }

  // Emit 'message-scanned' every time a message is classified.
  io.emit("message-scanned", {
    intent: result.intent,
    verdict: result.intent === "suspicious" ? "scam" : "clean",
    urgency: result.urgency_score,
    reason: result.reason,
    cached,
    ts: Date.now(),
  });

  // Feed Layer 2 into the fusion tracker (may emit risk-level-change).
  riskTracker.update({ scanIntent: result.intent, scanUrgency: result.urgency_score });

  res.json({ ...result, cached });
});

// GET /api/admin/field-map — the SECURITY / SOC view of a user's data surface.
// It deliberately reveals the SHADOW (decoy) layer alongside the real fields so the
// judge dashboard can show they live in a separate namespace.
//
// ARCHITECTURE INVARIANT: decoy_fields are shadow fields. They are NEVER rendered
// in the user UI and NEVER returned by user-facing endpoints (/api/account/*,
// /api/transactions/*, /api/messages). They only surface here, on this explicitly
// privileged endpoint (in production: gated behind an admin role), and in the raw
// DB — i.e. only in the layer a breach would actually reach. Values are masked.
function maskAccount(acct) {
  if (!acct) return "••••";
  return "•••• " + String(acct).slice(-4);
}
function maskValue(fieldType, value) {
  const v = String(value ?? "");
  if (fieldType === "email_alias") {
    const [name, domain] = v.split("@");
    return (name?.[0] ?? "") + "•••@" + (domain ?? "");
  }
  if (v.length <= 6) return v[0] + "•••" + v.slice(-1);
  return v.slice(0, 4) + "•".repeat(Math.max(3, v.length - 6)) + v.slice(-2);
}

app.get("/api/admin/field-map", requireAuth, async (_req, res) => {
  try {
    // Demo subject: the user who owns decoys (Adaeze).
    const { rows: urows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.usual_location, u.last_location,
              a.account_number, a.balance
         FROM users u
         JOIN decoy_fields d ON d.user_id = u.id
         LEFT JOIN accounts a ON a.user_id = u.id
        GROUP BY u.id, a.account_number, a.balance
        LIMIT 1`,
    );
    const u = urows[0];
    if (!u) return res.json({ user: null, real: [], decoy: [] });

    // Real fields — exactly what the app legitimately serves to the user.
    const real = [
      { label: "Account holder", value: u.name },
      { label: "Email", value: u.email },
      { label: "Account number", value: maskAccount(u.account_number) },
      { label: "Home location", value: u.usual_location },
    ];

    // Decoy shadow fields — with how many times each has been tripped.
    const { rows: drows } = await pool.query(
      `SELECT d.id, d.field_type, d.decoy_value, d.created_at,
              COUNT(al.id) FILTER (WHERE al.triggered_alert) AS trips,
              MAX(al.timestamp) AS last_trip
         FROM decoy_fields d
         LEFT JOIN access_logs al ON al.field_id = d.id
        WHERE d.user_id = $1 AND d.is_decoy = true
        GROUP BY d.id
        ORDER BY d.field_type`,
      [u.id],
    );
    const decoy = drows.map((r) => ({
      id: r.id,
      field_type: r.field_type,
      value_masked: maskValue(r.field_type, r.decoy_value),
      trips: Number(r.trips) || 0,
      last_trip: r.last_trip,
    }));

    res.json({ user: u.name, real, decoy });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Legacy placeholder endpoints (still used by the frontend today).
app.get("/api/account", (_req, res) => res.json(ACCOUNT));
app.get("/api/transactions", (_req, res) => res.json(TRANSACTIONS));
app.get("/api/messages", (_req, res) => res.json(MESSAGES));

// POST /api/transfer — a transfer attempt. The global decoy guard has already run
// by now; if it flagged a honeytoken (req.decoyHits) we BLOCK the transaction —
// this is what the attacker-simulation script hits during the demo.
app.post("/api/transfer", (req, res) => {
  const { recipient, amount } = req.body ?? {};
  if (req.decoyHits && req.decoyHits.length) {
    return res.status(423).json({
      status: "blocked",
      overlay: "breach",
      reason: "Decoy account accessed — transaction blocked and account frozen.",
      recipient,
      amount,
    });
  }
  res.json({ status: "pending", overlay: null, recipient, amount });
});

// ---------------------------------------------------------------------------
// Socket.IO connection handler (io + server were created up top).
// Canonical channels map to the Admin panels: trust-score-update,
// message-scanned, decoy-touched, risk-level-change.
// Client: import { io } from "socket.io-client"; io("http://localhost:5000")
// ---------------------------------------------------------------------------
io.on("connection", (socket) => {
  console.log(`[io] judge dashboard connected: ${socket.id}`);
  socket.emit("system", { event: "connected", ts: Date.now() });
  // Send the current fused risk level so a freshly-opened dashboard isn't blank.
  socket.emit("risk-level-change", { level: riskTracker.level, reasons: [], initial: true, ts: Date.now() });
  socket.on("disconnect", () => console.log(`[io] disconnected: ${socket.id}`));
});

// Mock event generator so the judge dashboard has ambient data between real
// actions. Uses the canonical event names. NOTE: decoy is only ever emitted as
// "armed" here — a real "tripped" (which fires the breach overlay) comes solely
// from an actual decoy transfer via POST /api/trust-score.
//
// Set MOCK_FEED=off in .env for a clean scripted demo where only real user
// actions drive the dashboard (recommended when presenting the fraud/breach flow,
// so ambient noise doesn't overwrite the dramatic high-risk moment).
// Only ambient trust/message chatter here. `decoy-touched` and `risk-level-change`
// are now authoritative — driven solely by the decoy guard and the fusion tracker
// — so the mock never emits them (no false breaches, no fake risk transitions).
function emitMockEvent() {
  const risk = faker.number.int({ min: 0, max: 70 }); // keep ambient noise sub-breach
  const events = [
    ["trust-score-update", { user: DEMO_USER.name, score: 100 - risk, signals: [], ambient: true }],
    ["message-scanned", { messageId: faker.helpers.arrayElement(MESSAGES).id, verdict: risk > 60 ? "scam" : "clean", ambient: true }],
  ];
  const [channel, payload] = faker.helpers.arrayElement(events);
  io.emit(channel, { ...payload, ts: Date.now() });
}

if (process.env.MOCK_FEED !== "off") {
  setInterval(emitMockEvent, 2500);
} else {
  console.log("[io] MOCK_FEED=off — dashboard driven by real actions only");
}

// Decoy rotation — regenerate all honeytoken values every 24h (prototype cron).
if (pool) {
  scheduleDecoyRotation(pool);
  console.log("[decoy] rotation scheduled every 24h");
}

// ---------------------------------------------------------------------------
server.listen(PORT, () => {
  console.log(`SentinelIQ backend on http://localhost:${PORT}`);
  console.log(`Socket.IO feed on ws://localhost:${PORT} (path /socket.io)`);
});
