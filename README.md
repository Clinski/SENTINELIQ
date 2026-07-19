# SentinelIQ

A behavioral fraud-protection layer for **Union360**, a Nigerian digital bank. SentinelIQ isn't a bank — it's a security overlay a bank runs on top of its own app to catch what static defenses (OTPs, PINs, transaction limits) miss: is *this* transaction, from *this* device, at *this* moment, consistent with how *this* customer actually behaves?

Every transfer is scored in real time against device, location, velocity, and recipient-risk signals, then handled by one of three escalating response tiers — plus two silent layers that only speak up when something's wrong. See [PITCH_DECK.md](PITCH_DECK.md) for the full pitch, or [pitch-assets/pitch-deck.html](pitch-assets/pitch-deck.html) for the presentation version.

## What's in this repo

```
sentineliq-app/   Next.js frontend (Union360's banking app + SentinelIQ overlays)
server/           Express + Socket.IO backend, trust-scoring engine, DB layer
pitch-assets/     Demo screenshots + the built pitch deck
BUGS.md           Known bugs found during manual + scripted testing
PITCH_DECK.md     Full pitch deck content (source for the slide deck)
```

## Setup

Requires Node.js and a Postgres database (a free [Neon](https://neon.tech) instance works fine).

**1. Backend**

```bash
cd server
npm install
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, GEMINI_API_KEY
npm run migrate         # applies db/schema.sql
npm run seed             # seeds demo data (destructive — wipes and rebuilds all tables)
npm start                 # runs on http://localhost:5000
```

**2. Frontend**

```bash
cd sentineliq-app
npm install
# .env.local already points NEXT_PUBLIC_API_URL at http://localhost:5000
npm run dev   # runs on http://localhost:3000
```

Open **http://localhost:3000/login**.

## Demo walkthrough

**Login.** Use the demo account: `adaeze@unionbank.ng` / `demo1234` (or click "Use demo account" on the login screen to autofill it).

**Dashboard → Transfer → Single Transfer.** This is where the trust-scoring engine is actually demoed. Fill in any 10-digit account number and an amount, then pick a **demo scenario** before hitting Confirm Transfer — this lets you trigger every response tier on demand without needing real anomalous behavior:

| Scenario | What it simulates | What happens |
|---|---|---|
| Normal | Known device & recipient | Transfer proceeds silently — SentinelIQ stays invisible |
| Unusual | New location / odd hour | **Soft Step-Up**: an OTP is sent to the simulated SMS inbox (read it via "View Messages" in the overlay, or the Messages tab) |
| Impossible travel | Lagos & London 10 minutes apart | **Hard Step-Up**: facial verification, with a "why am I seeing this?" breakdown of the exact signals that fired |
| Fraudulent, Mule payout, Device mimic, Aged device | Wrong device + large amount, new recipient + large amount, cloned device profile, a device trusted too soon | Low trust score → **blocked**, with a guided step-by-step **liveness check** offered as a last resort before the transfer is denied outright |
| Decoy recipient | Honeytoken account touched | Intended to trip the full-screen **Breach Alert** via a real `decoy-touched` event — currently broken, see [BUGS.md, Issue 3](BUGS.md) |

**Messages.** Not a bank-app inbox — real Nigerian banks don't have one. This demonstrates SentinelIQ running at the phone/SMS level: tap **Scan** on any message to run it through the NLP scam classifier. The scam messages in the seeded inbox will trigger a full scam-alert banner.

**Admin** (`/admin`). The bank's security-operations view — live trust-score events, message-scan results, and decoy-field trip alerts stream in over Socket.IO as you drive the demo in another tab. Includes the Decoy Map, showing the real account fields served to users side-by-side with the shadow decoy fields that exist only to catch intruders.

**Transaction History** (from the Transfer menu). Full statement view, all recipients bank with Union Bank of Nigeria in the seed data.

## Known limitations

See [BUGS.md](BUGS.md) for the full list found during testing. The Decoy recipient demo scenario not triggering a real breach alert (Issue 3) is the one most likely to trip up a live demo — trigger a breach via the Decoy Map's real honeytoken values instead, or via `server/scripts/attackerSim.js`.

## Tech stack

React (Next.js 16, App Router) · Node.js (Express) · Socket.IO · PostgreSQL (Neon serverless) · Google Gemini (`gemini-2.5-flash`) for scam-message NLP classification — originally designed for the Claude API, switched during the build due to credit constraints; the prompt/schema/tests are model-agnostic.
