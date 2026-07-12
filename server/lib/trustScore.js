// Trust score calculation (Builder B).
// Start at 100 and subtract per triggered risk signal. Floor at 0.
//
//   wrong device            −30  (DECAY-AWARE: a brand-new device pays the full
//                                  penalty and earns it back over ~14 days, so
//                                  mimicry gets no instant access)
//   wrong location          −20
//   unusual hour            −10
//   amount > 3× average     −25
//   unknown recipient       −15
//   new recipient + high $  −20  (COMBO: first-time payee receiving a large sum —
//                                  the classic money-mule pattern)
//   impossible travel       −40  (VELOCITY: two locations too far apart for the
//                                  elapsed time — you can't be in Lagos and London
//                                  10 minutes apart)
//   typing rhythm           −5   (BEHAVIOURAL BIOMETRIC, intentionally LOW weight:
//                                  keystroke cadence is noisy, so it can only nudge
//                                  the score — the hard signals above drive the big
//                                  swings. Only a clear mismatch deducts; an absent
//                                  or noisy reading changes nothing.)
//
// The base + compound rules can exceed 100; Math.max(0, …) clamps the floor.

const DEDUCTIONS = {
  wrong_device: 30,
  wrong_location: 20,
  unusual_hour: 10,
  amount_over_3x_avg: 25,
  unknown_recipient: 15,
  new_recipient_high_amount: 20,
  impossible_travel: 40,
  typing_rhythm: 5, // deliberately the smallest weight of any signal
};

// Tuning knobs -------------------------------------------------------------
const DEVICE_TRUST_DAYS = 14; // a new device fully earns trust after ~2 weeks
const HIGH_AMOUNT_ABS = 100000; // ₦ absolute "large" threshold for the mule combo
const MAX_PLAUSIBLE_KMH = 900; // faster than a commercial jet ⇒ physically impossible
const MIN_TRAVEL_KM = 100; // ignore intra-city GPS noise
const MIN_TRAVEL_HOURS = 1 / 60; // floor elapsed time at 1 min (avoid div-by-zero blowups)

// Coordinates for the cities used in the demo (lat, lon). Unknown cities skip the
// impossible-travel check rather than risk a false positive.
const CITY_COORDS = {
  lagos: [6.5244, 3.3792],
  abuja: [9.0765, 7.3986],
  kano: [12.0022, 8.592],
  "port harcourt": [4.8156, 7.0498],
  ibadan: [7.3776, 3.947],
  accra: [5.6037, -0.187],
  london: [51.5074, -0.1278],
  "new york": [40.7128, -74.006],
  nairobi: [-1.2921, 36.8219],
  johannesburg: [-26.2041, 28.0473],
  dubai: [25.2048, 55.2708],
};

// "Normal" banking hours are 06:00–22:59; anything else is flagged unusual.
function isUnusualHour(hour) {
  return hour < 6 || hour > 22;
}

// Great-circle distance in km between two [lat, lon] points.
function haversineKm([lat1, lon1], [lat2, lon2]) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

// Decay-aware device penalty: full for a brand-new device, linearly earning trust
// to zero over DEVICE_TRUST_DAYS. The registered device is always fully trusted.
function devicePenalty(ctx, user) {
  if (ctx.device_id === user.known_device_id) return 0;

  let ageDays;
  if (typeof ctx.device_age_days === "number") {
    ageDays = ctx.device_age_days;
  } else if (ctx.device_first_seen) {
    ageDays = (Date.now() - new Date(ctx.device_first_seen).getTime()) / 86400000;
  } else {
    ageDays = 0; // unknown history ⇒ treat as brand new (safest)
  }
  if (!(ageDays >= 0)) ageDays = 0;

  const factor = Math.max(0, Math.min(1, 1 - ageDays / DEVICE_TRUST_DAYS));
  return Math.round(DEDUCTIONS.wrong_device * factor);
}

// Velocity / impossible-travel: compares the current location+time against the
// previous known location+time. Returns true only when both cities are known,
// the hop is non-trivial, and the implied speed is physically impossible.
function isImpossibleTravel(ctx) {
  const from = CITY_COORDS[(ctx.last_location || "").toLowerCase()];
  const to = CITY_COORDS[(ctx.location || "").toLowerCase()];
  if (!from || !to || !ctx.last_seen) return false;

  const distKm = haversineKm(from, to);
  if (distKm < MIN_TRAVEL_KM) return false;

  const nowMs = ctx.timestamp ? new Date(ctx.timestamp).getTime() : Date.now();
  const lastMs = new Date(ctx.last_seen).getTime();
  if (Number.isNaN(lastMs)) return false;

  const elapsedHours = Math.max((nowMs - lastMs) / 3600000, MIN_TRAVEL_HOURS);
  const impliedKmh = distKm / elapsedHours;
  return impliedKmh > MAX_PLAUSIBLE_KMH;
}

/**
 * @param {object} ctx  - the transaction / login attempt:
 *   { device_id, device_first_seen?|device_age_days?, location, hour|timestamp,
 *     amount, recipient_id, last_location?, last_seen? }
 * @param {object} user - the account owner's profile:
 *   { known_device_id, usual_location, avg_transaction, known_recipients[] }
 * @returns {{ score:number, deductions:Array<{rule:string, points:number}> }}
 */
function computeTrustScore(ctx, user) {
  const hour =
    typeof ctx.hour === "number" ? ctx.hour : new Date(ctx.timestamp).getHours();
  const avg = Number(user.avg_transaction) || 0;
  const amount = Number(ctx.amount) || 0;
  const unknownRecipient = !(user.known_recipients || []).includes(ctx.recipient_id);
  const overAvg = amount > 3 * avg;
  const highAmount = overAvg || amount >= HIGH_AMOUNT_ABS;

  // Each entry is [rule, pointsToDeduct] — points can be dynamic (device decay).
  const applied = [];
  const devicePts = devicePenalty(ctx, user);
  if (devicePts > 0) applied.push(["wrong_device", devicePts]);
  if (ctx.location !== user.usual_location) applied.push(["wrong_location", DEDUCTIONS.wrong_location]);
  if (isUnusualHour(hour)) applied.push(["unusual_hour", DEDUCTIONS.unusual_hour]);
  if (overAvg) applied.push(["amount_over_3x_avg", DEDUCTIONS.amount_over_3x_avg]);
  if (unknownRecipient) applied.push(["unknown_recipient", DEDUCTIONS.unknown_recipient]);
  if (unknownRecipient && highAmount)
    applied.push(["new_recipient_high_amount", DEDUCTIONS.new_recipient_high_amount]);
  if (isImpossibleTravel(ctx)) applied.push(["impossible_travel", DEDUCTIONS.impossible_travel]);
  // Low-weight behavioural biometric — ONLY penalise a clear mismatch. Absent or
  // noisy readings (undefined / null) never move the score, so a bad reading on
  // stage can't distort it. `false` means the biometric is confident it's off.
  if (ctx.typing_rhythm_match === false) applied.push(["typing_rhythm", DEDUCTIONS.typing_rhythm]);

  let score = 100;
  const deductions = [];
  for (const [rule, pts] of applied) {
    score -= pts;
    deductions.push({ rule, points: -pts });
  }

  return { score: Math.max(0, score), deductions };
}

// ---------------------------------------------------------------------------
// assessTrust — richer wrapper the API returns. Turns the raw rule hits into the
// agreed contract: { score, action, signals, explanation, deductions }.
//   signals:     friendly signal names, e.g. ["new_device","unusual_hour"]
//   action:      "allow" | "soft-step-up" | "hard-step-up"   (hyphenated per API)
//   explanation: one plain-language sentence for the user
// ---------------------------------------------------------------------------

// rule name (from computeTrustScore) → friendly signal name (API/emit payload)
const SIGNAL_NAMES = {
  wrong_device: "new_device",
  wrong_location: "new_location",
  unusual_hour: "unusual_hour",
  amount_over_3x_avg: "large_amount",
  unknown_recipient: "unknown_recipient",
  new_recipient_high_amount: "new_recipient_high_amount",
  impossible_travel: "impossible_travel",
  typing_rhythm: "typing_rhythm",
};

// friendly signal → sentence fragment used to build the explanation
const SIGNAL_PHRASES = {
  new_device: "a new device we don't recognise",
  new_location: "an unfamiliar location",
  unusual_hour: "late at night",
  large_amount: "an unusually large amount",
  unknown_recipient: "a recipient you've never paid before",
  new_recipient_high_amount: "a large payment to a brand-new recipient",
  impossible_travel: "a location you couldn't have reached in the time since your last activity",
  typing_rhythm: "a slightly unfamiliar typing rhythm",
};

function actionForScore(score) {
  if (score >= 80) return "allow";
  if (score >= 40) return "soft-step-up";
  return "hard-step-up";
}

function buildExplanation(signals) {
  if (signals.length === 0) {
    return "This transfer looks normal for your account, so we let it through.";
  }
  const phrases = signals.map((s) => SIGNAL_PHRASES[s] || s);
  let list;
  if (phrases.length === 1) list = phrases[0];
  else if (phrases.length === 2) list = `${phrases[0]} and ${phrases[1]}`;
  else list = `${phrases.slice(0, -1).join(", ")}, and ${phrases[phrases.length - 1]}`;
  return `We noticed this transfer is coming from ${list}. For your safety we've asked for extra verification before it can continue.`;
}

function assessTrust(ctx, user) {
  const { score, deductions } = computeTrustScore(ctx, user);
  const signals = deductions.map((d) => SIGNAL_NAMES[d.rule] || d.rule);
  const action = actionForScore(score);
  return { score, action, signals, explanation: buildExplanation(signals), deductions };
}

module.exports = {
  computeTrustScore,
  assessTrust,
  actionForScore,
  isUnusualHour,
  devicePenalty,
  isImpossibleTravel,
  haversineKm,
  DEDUCTIONS,
  SIGNAL_NAMES,
  DEVICE_TRUST_DAYS,
};
