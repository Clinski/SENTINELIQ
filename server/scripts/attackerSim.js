// Attacker simulation — the Minute-3 demo moment.
//   npm run attack
//
// Story: the database has "leaked". The attacker skims what looks like a real
// card number and tries to spend it — but it's a DECOY (honeytoken) planted in
// decoy_fields. The moment the decoy value hits the API, the server's decoy guard
// fires the 'decoy-touched' Socket.IO event and the frontend flashes the red
// breach alert.
//
// This script:
//   1. reads the decoy card straight from the DB (simulating the leak)
//   2. connects as a Socket.IO client to CONFIRM the breach event fires
//   3. POSTs a transfer using the decoy card → trips the trap
//   4. reports whether the 'decoy-touched' event was received
require("dotenv").config();
const { Client } = require("pg");
const { io } = require("socket.io-client");

const API_URL = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`;

async function readDecoyCard() {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: /@(localhost|127\.0\.0\.1)/.test(process.env.DATABASE_URL)
      ? false
      : { rejectUnauthorized: false },
  });
  await c.connect();
  try {
    const { rows } = await c.query(
      `SELECT decoy_value FROM decoy_fields
        WHERE field_type = 'card_number' AND is_decoy = true
        LIMIT 1`,
    );
    return rows[0]?.decoy_value || null;
  } finally {
    await c.end();
  }
}

async function main() {
  console.log("💀 ATTACKER SIM — leaking the database…");
  const card = await readDecoyCard();
  if (!card) {
    console.error("✗ No decoy card found. Run `npm run seed` first.");
    process.exit(1);
  }
  console.log(`💳 Skimmed 'card' from leak: ${card}`);
  console.log(`   (attacker doesn't know it's a honeytoken)`);

  // Connect as a socket client to confirm the breach event fires.
  const socket = io(API_URL, { transports: ["websocket", "polling"] });
  let breach = null;
  socket.on("decoy-touched", (trace) => {
    if (trace && trace.state === "tripped") breach = trace;
  });

  await new Promise((resolve, reject) => {
    socket.on("connect", resolve);
    socket.on("connect_error", reject);
    setTimeout(() => reject(new Error("socket connect timeout")), 5000);
  });
  console.log(`🔌 Listening for breach events on ${API_URL}…`);

  // Fire the fraudulent transfer using the decoy card.
  console.log("💸 Attempting transfer with the stolen card…");
  const res = await fetch(`${API_URL}/api/transfer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: card, card_number: card, amount: 999999 }),
  });
  const data = await res.json().catch(() => ({}));
  console.log(`   server responded ${res.status}: ${data.status || ""} ${data.reason || ""}`);

  // Give the socket event a moment to arrive.
  await new Promise((r) => setTimeout(r, 1200));
  socket.close();

  console.log("\n──────────────── RESULT ────────────────");
  const httpBlocked = res.status === 423 && data.status === "blocked";
  if (breach) {
    console.log("✅ 'decoy-touched' Socket.IO event FIRED — breach alert triggered");
    console.log("   access trace:", JSON.stringify(breach, null, 2));
  } else {
    console.log("❌ No 'decoy-touched' event received — is the server running?");
  }
  console.log(httpBlocked ? "✅ Transfer was BLOCKED (423)" : `⚠ Transfer not blocked (status ${res.status})`);
  console.log("────────────────────────────────────────");

  process.exit(breach && httpBlocked ? 0 : 1);
}

main().catch((err) => {
  console.error("✗ Attacker sim failed:", err.message);
  process.exit(1);
});
