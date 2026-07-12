// Decoy rotation (Builder B).
// Regenerates every decoy value on a schedule so a leaked honeytoken has a short
// shelf-life — an attacker who skimmed yesterday's decoy card finds it's already
// been rotated out. setInterval is fine for the prototype; in production this
// would be a cron job (e.g. a daily scheduled task).
const { faker } = require("@faker-js/faker");
const { luhnCardNumber } = require("../db/seed");

const DAY_MS = 24 * 60 * 60 * 1000;

// Fresh value appropriate to each decoy field type.
function freshDecoyValue(fieldType) {
  switch (fieldType) {
    case "card_number":
      return luhnCardNumber();
    case "email_alias":
      return `adaeze.backup.${faker.number.int({ min: 1000, max: 9999 })}@gmail.com`;
    case "phone":
      return "+2348" + faker.string.numeric(9);
    default:
      return faker.string.alphanumeric(12);
  }
}

/**
 * Rotate every decoy_fields row in place. Returns the number rotated.
 * @param {import('pg').Pool} pool
 */
async function rotateDecoys(pool) {
  const { rows } = await pool.query(
    "SELECT id, field_type FROM decoy_fields WHERE is_decoy = true",
  );
  for (const row of rows) {
    await pool.query("UPDATE decoy_fields SET decoy_value = $1 WHERE id = $2", [
      freshDecoyValue(row.field_type),
      row.id,
    ]);
  }
  return rows.length;
}

/**
 * Schedule rotation every `intervalMs` (default 24h). Returns the timer so it can
 * be cleared in tests. Unref'd so it never keeps the process alive on its own.
 */
function scheduleDecoyRotation(pool, intervalMs = DAY_MS) {
  const timer = setInterval(() => {
    rotateDecoys(pool)
      .then((n) => console.log(`[decoy] rotated ${n} decoy value(s) at ${new Date().toISOString()}`))
      .catch((err) => console.error("[decoy] rotation failed:", err.message));
  }, intervalMs);
  if (typeof timer.unref === "function") timer.unref();
  return timer;
}

module.exports = { rotateDecoys, scheduleDecoyRotation, freshDecoyValue, DAY_MS };
