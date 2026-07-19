// Simulated SMS inbox — the delivery target for action-bound OTPs (see otp.js).
// SentinelIQ has no real SMS gateway, so a "sent" OTP lands here instead, and the
// app's own Messages screen (phone/SMS-level protection, per its own copy) reads
// it back — mirroring how a real OTP only ever arrives by text, never in an API
// response. In-memory, one inbox per user — demo-grade, same as otp.js.

const store = new Map(); // userId -> message[]
const MAX_PER_USER = 20;

function deliver(userId, body) {
  const record = {
    id: `otp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    sender: "Union360",
    body,
    timestamp: new Date().toISOString(),
  };
  const list = store.get(userId) || [];
  list.unshift(record);
  store.set(userId, list.slice(0, MAX_PER_USER));
  return record;
}

function inbox(userId) {
  return store.get(userId) || [];
}

module.exports = { deliver, inbox };
