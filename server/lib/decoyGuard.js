// Decoy / honeytoken access listener (Builder B).
// Express middleware that inspects every request for values matching a row in
// decoy_fields WHERE is_decoy = true. A honeytoken is a value NO legitimate flow
// should ever use — so any request carrying one means the "leaked" data is being
// used by an attacker. On a hit we:
//   1. INSERT a row into access_logs (field_id, IP, timestamp, triggered_alert)
//   2. emit a 'decoy-touched' Socket.IO event with the full access trace
//   3. log the IP + timestamp to the server console
//   4. notify the risk tracker (Layer 3 → CRITICAL)

// Pull candidate string values out of body/query/params (recursively, shallow-ish).
function collectValues(...objects) {
  const out = new Set();
  const visit = (v, depth) => {
    if (v == null || depth > 3) return;
    if (typeof v === "string" || typeof v === "number") {
      const s = String(v).trim();
      if (s) {
        out.add(s);
        // Also add a digits-only form so a decoy card matches with/without spaces.
        const digits = s.replace(/[\s-]/g, "");
        if (digits && digits !== s) out.add(digits);
      }
    } else if (Array.isArray(v)) {
      v.forEach((x) => visit(x, depth + 1));
    } else if (typeof v === "object") {
      Object.values(v).forEach((x) => visit(x, depth + 1));
    }
  };
  objects.forEach((o) => visit(o, 0));
  return [...out];
}

function clientIp(req) {
  const fwd = (req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return fwd || req.ip || req.socket?.remoteAddress || null;
}

/**
 * @param {object} deps
 *   pool        - pg Pool
 *   io          - socket.io server
 *   onTrip(hit) - optional callback (e.g. risk tracker) run per decoy hit
 */
function makeDecoyGuard({ pool, io, onTrip }) {
  return async function decoyGuard(req, res, next) {
    try {
      const candidates = collectValues(req.body, req.query, req.params);
      if (candidates.length) {
        const { rows } = await pool.query(
          `SELECT id, user_id, field_type, decoy_value
             FROM decoy_fields
            WHERE is_decoy = true AND decoy_value = ANY($1)`,
          [candidates],
        );
        for (const hit of rows) {
          await recordDecoyAccess({ hit, req, pool, io, onTrip });
        }
        // Attach for downstream handlers (so /api/transfer can block the txn).
        req.decoyHits = rows;
      }
    } catch (err) {
      console.error("[decoy] guard error:", err.message);
    }
    next();
  };
}

async function recordDecoyAccess({ hit, req, pool, io, onTrip }) {
  const ip = clientIp(req);
  const ts = new Date();
  const userAgent = req.headers["user-agent"] || "unknown";

  // 1. persist to access_logs
  let logId = null;
  try {
    const { rows } = await pool.query(
      `INSERT INTO access_logs (field_id, accessed_from_ip, timestamp, triggered_alert)
       VALUES ($1, $2, $3, true) RETURNING id`,
      [hit.id, ip, ts],
    );
    logId = rows[0]?.id ?? null;
  } catch (err) {
    console.error("[decoy] access_logs insert failed:", err.message);
  }

  // 2. full access trace over Socket.IO
  const trace = {
    log_id: logId,
    field_id: hit.id,
    field_type: hit.field_type,
    account: hit.decoy_value, // the honeytoken value that was used
    ip,
    device: userAgent,
    method: req.method,
    path: req.originalUrl,
    state: "tripped",
    ts: ts.getTime(),
  };
  io.emit("decoy-touched", trace);

  // 3. console audit line
  console.log(
    `[decoy] 🚨 HONEYTOKEN TOUCHED field=${hit.field_type} value=${hit.decoy_value} ip=${ip} at=${ts.toISOString()}`,
  );

  // 4. Layer 3 → risk fusion
  if (typeof onTrip === "function") onTrip(hit, trace);

  return trace;
}

module.exports = { makeDecoyGuard, collectValues, recordDecoyAccess };
