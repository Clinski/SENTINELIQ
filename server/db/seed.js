// Seeds demo data for SentinelIQ. Destructive: TRUNCATEs all tables first so
// re-running gives a clean, deterministic-ish demo dataset.
//   npm run seed
//
// seedDatabase(client) runs the whole seed on a SINGLE pg connection (so the
// BEGIN/COMMIT transaction is valid). It's reused by both the CLI wrapper below
// and POST /api/demo/reset in index.js (which passes a pooled client).
require("dotenv").config();
const { Client } = require("pg");
const { faker } = require("@faker-js/faker");

// Strip a faker credit-card number down to digits (keeps the valid Luhn checksum).
function luhnCardNumber() {
  return faker.finance.creditCardNumber().replace(/\D/g, "");
}

// Realistic Nigerian recipients so the transaction history reads like a real
// account statement (names, bank, masked account) rather than raw UUIDs. All
// recipients bank with Union Bank of Nigeria, same as Adaeze.
const NG_NAMES = [
  "Chinedu Okafor",
  "Aisha Bello",
  "Emeka Nwosu",
  "Folake Adeyemi",
  "Ibrahim Musa",
  "Ngozi Eze",
  "Tunde Bakare",
  "Amina Yusuf",
];
const RECIPIENT_BANK = "Union Bank of Nigeria";

// Local Luhn validator so we can assert the phantom card is well-formed.
function isLuhnValid(num) {
  let sum = 0;
  let dbl = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = Number(num[i]);
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

/**
 * Run the full seed on a single connected pg client. Returns a summary.
 * @param {import('pg').Client|import('pg').PoolClient} c
 */
async function seedDatabase(c) {
  try {
    await c.query("BEGIN");
    await c.query(
      `TRUNCATE trust_events, access_logs, decoy_fields, devices, transactions, accounts, users
       RESTART IDENTITY CASCADE`,
    );

    // --- 5 known recipients (real users so known_recipients IDs resolve) -----
    // Each gets a Nigerian name plus their own account (bank + 10-digit NUBAN) so
    // transaction history can render "Chinedu Okafor · GTBank ••••1234".
    const recipientIds = [];
    for (let i = 0; i < 5; i++) {
      const name = NG_NAMES[i % NG_NAMES.length];
      const email = faker.internet.email({ firstName: name.split(" ")[0] }).toLowerCase();
      const { rows } = await c.query(
        `INSERT INTO users (name, email, tech_literacy_level, usual_location, avg_transaction)
         VALUES ($1, $2, 'standard', $3, $4) RETURNING id`,
        [name, email, faker.location.city(), faker.number.int({ min: 2000, max: 50000 })],
      );
      const recipientId = rows[0].id;
      recipientIds.push(recipientId);
      await c.query(
        `INSERT INTO accounts (user_id, balance, account_number, bank_name)
         VALUES ($1, $2, $3, $4)`,
        [
          recipientId,
          faker.number.int({ min: 5000, max: 900000 }),
          "0" + faker.string.numeric(9),
          RECIPIENT_BANK,
        ],
      );
    }

    // --- Adaeze — full realistic profile ------------------------------------
    // last_location/last_seen_at seed her most recent activity (Lagos, ~2h ago) so
    // the impossible-travel check has real prior state to compare against.
    const { rows: adaezeRows } = await c.query(
      `INSERT INTO users
         (name, email, tech_literacy_level, usual_location, known_device_id, known_recipients,
          avg_transaction, last_location, last_seen_at)
       VALUES ($1, $2, 'standard', 'Lagos', 'chrome-macbook-001', $3, 15000,
               'Lagos', now() - interval '2 hours')
       RETURNING id`,
      ["Adaeze", "adaeze@unionbank.ng", recipientIds],
    );
    const adaezeId = adaezeRows[0].id;

    // --- Adaeze's trusted device (first seen 60 days ago → fully trusted) -----
    await c.query(
      `INSERT INTO devices (user_id, device_id, first_seen, last_seen)
       VALUES ($1, 'chrome-macbook-001', now() - interval '60 days', now())
       ON CONFLICT (user_id, device_id) DO NOTHING`,
      [adaezeId],
    );

    // --- Adaeze's account ----------------------------------------------------
    const accountNumber = "0" + faker.string.numeric(9); // 10-digit NUBAN-style
    const { rows: acctRows } = await c.query(
      `INSERT INTO accounts (user_id, balance, account_number, bank_name)
       VALUES ($1, $2, $3, 'Union Bank of Nigeria') RETURNING id`,
      [adaezeId, 485200.5, accountNumber],
    );
    const accountId = acctRows[0].id;

    // --- A few recent transactions to her known recipients -------------------
    for (let i = 0; i < 6; i++) {
      await c.query(
        `INSERT INTO transactions (from_account, amount, recipient_id, timestamp, status)
         VALUES ($1, $2, $3, $4, 'completed')`,
        [
          accountId,
          -faker.number.int({ min: 3000, max: 40000 }),
          faker.helpers.arrayElement(recipientIds),
          faker.date.recent({ days: 14 }),
        ],
      );
    }

    // --- A recurring bill auto-debit (no recipient_id — a merchant, not a user) --
    await c.query(
      `INSERT INTO transactions (from_account, amount, recipient_id, timestamp, status, description)
       VALUES ($1, $2, NULL, $3, 'completed', $4)`,
      [accountId, -24500, faker.date.recent({ days: 14 }), "DSTV Subscription"],
    );

    // --- 3 decoy fields (all is_decoy = true) --------------------------------
    const card = luhnCardNumber();
    if (!isLuhnValid(card)) throw new Error("generated card failed Luhn check");
    const decoys = [
      ["card_number", card],
      ["email_alias", "adaeze.backup.2024@gmail.com"],
      ["phone", "+2348" + faker.string.numeric(9)],
    ];
    for (const [field_type, decoy_value] of decoys) {
      await c.query(
        `INSERT INTO decoy_fields (user_id, field_type, decoy_value, is_decoy)
         VALUES ($1, $2, $3, true)`,
        [adaezeId, field_type, decoy_value],
      );
    }

    await c.query("COMMIT");

    return {
      adaezeId,
      accountNumber,
      knownRecipients: recipientIds.length,
      decoyCard: card,
      decoyEmail: "adaeze.backup.2024@gmail.com",
      decoyPhone: decoys[2][1],
    };
  } catch (err) {
    await c.query("ROLLBACK");
    throw err;
  }
}

// --- CLI wrapper -----------------------------------------------------------
async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("✗ DATABASE_URL not set");
    process.exit(1);
  }
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: /@(localhost|127\.0\.0\.1)/.test(process.env.DATABASE_URL)
      ? false
      : { rejectUnauthorized: false },
  });
  await c.connect();
  try {
    const s = await seedDatabase(c);
    console.log("✓ Seed complete");
    console.log(`  Adaeze id:       ${s.adaezeId}`);
    console.log(`  account_number:  ${s.accountNumber}`);
    console.log(`  known_recipients: ${s.knownRecipients}`);
    console.log(`  decoy card:      ${s.decoyCard} (Luhn OK)`);
    console.log(`  decoy email:     ${s.decoyEmail}`);
    console.log(`  decoy phone:     ${s.decoyPhone}`);
  } catch (err) {
    console.error("✗ Seed failed:", err.message);
    process.exitCode = 1;
  } finally {
    await c.end();
  }
}

module.exports = { seedDatabase, luhnCardNumber, isLuhnValid };

if (require.main === module) main();
