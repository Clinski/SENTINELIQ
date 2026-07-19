# SentinelIQ — Pitch Deck Content

Full slide-by-slide content, ready to paste into Google Slides or a design tool.
Demo screenshots referenced below are in `pitch-assets/` in this repo.

---

## Slide 1 — Problem

**Headline:** Fraud isn't slowing down — it's changing shape.

**Body:**
- Nigeria lost **₦25.85 billion** to digital payment fraud in 2025 (NIBSS) — down 51% from ₦52.26bn in 2024, but still tens of thousands of victims: **67,518 fraud incidents** in 2025 alone.
- Three tier-1 banks (Access, GTCO, UBA) lost a combined **₦2.13 billion** to fraud and forgery in 2025.
- **Social engineering — not hacking — is the most prevalent technique.** Scam SMS, phishing links, and impersonation trick real customers into handing over their own credentials.
- Lagos alone accounts for **63% of all fraud activity** in the country.
- In response, the CBN now *mandates* liveness verification and device-binding for account onboarding — regulators are already pointing at what SentinelIQ does; today it just stops at onboarding, not everyday transactions.

**Bottom line:** Nigerian banks already run OTPs, PINs, and transaction limits — static, rule-based defenses. What's missing is behavioral: is *this* transaction, from *this* device, at *this* moment, actually consistent with how this customer behaves?

*(Sources: NIBSS 2025 fraud report via nibss-plc.com.ng; TechCabal, Legit.ng coverage of 2025 tier-1 bank fraud losses.)*

---

## Slide 2 — Solution

**Headline:** SentinelIQ — a fraud layer the bank runs, invisible until it isn't.

**Body:**
SentinelIQ isn't a bank. It's a protection layer a bank like Union360 runs *on top of* its own app — fusing trust scoring, scam-message detection, and honeytoken breach alerts into one risk signal, without changing how customers already bank.

**Three escalating response tiers, matched to risk:**

1. **Soft Step-Up** (medium risk) — an action-bound one-time code, delivered the way a real bank text would arrive: to the user's messages, never leaked back through the app itself.
2. **Hard Step-Up** (high risk) — facial verification, confirming this is really the account holder, on-device.
3. **Liveness Check** (last resort) — before a transfer is fully blocked, a guided step-by-step facial check (center your face, turn your head, open your mouth) gives a genuine user one more chance — instead of a dead-end "contact your bank."

**Plus, two silent layers that only speak up when something's wrong:**
- **NLP scam-message detection** — screens SMS at the phone/device level (not just inside the bank app — real Nigerian banks don't have an inbound-SMS tab), flagging phishing/smishing before a customer taps a bad link.
- **Honeytoken breach detection** — decoy account fields that exist nowhere a legitimate user would ever touch them; any access is definitionally an intrusion, triggering an immediate account freeze.

**For the bank:** a live security-operations dashboard showing active sessions, risk-tier counts, and a real-time event feed — visibility a static rules engine can't give.

*(Suggested screenshot: `pitch-assets/04-soft-stepup-otp.png`, `05-hard-stepup-facial-verification.png`, `06-liveness-check.png`, `07-breach-detected.png`)*

---

## Slide 3 — Tech Stack

**Headline:** Built for a live demo, architected for production.

| Layer | Technology | Why |
|---|---|---|
| Frontend | **React** (Next.js 16, App Router) | Server components by default, fast iteration, real-time UI updates |
| Backend | **Node.js** (Express) | Lightweight REST API, easy to reason about for a judged demo |
| Real-time | **Socket.IO** | Pushes trust-score events, scam-scan results, and breach alerts live to the admin dashboard — no polling |
| Database | **PostgreSQL** (Neon serverless) | Relational integrity for accounts/transactions/decoy fields; serverless so it scales to zero between demo runs |
| NLP / scam classification | **Google Gemini** (`gemini-2.5-flash`) | Structured-output classification of inbound messages into legitimate/suspicious with per-literacy-level alert copy |
| Auth | **JWT** | Stateless session tokens, no server-side session store needed |

**Note on the NLP layer:** scam-message classification was originally designed for the Claude API; we switched to Gemini during the hackathon build due to account credit constraints. The prompt, output schema, and test suite are model-agnostic — swapping back to Claude is a same-shape change, not a rebuild. (See "What Comes Next.")

*(Fill in your actual team names/roles here if the slide needs them — e.g. "Frontend: X · Backend: Y · NLP: Z")*

---

## Slide 4 — Architecture

**Headline:** How it all connects.

**Text/diagram description** (recreate as boxes + arrows in your design tool):

```
┌─────────────────────┐        HTTPS (REST)        ┌──────────────────────────┐
│   Union360 Frontend   │ ──────────────────────────▶ │   SentinelIQ Backend     │
│   (Next.js / React)   │ ◀──────────────────────────  │   (Node.js / Express)    │
│                        │                              │                          │
│  Login · Dashboard ·   │        WebSocket (live)      │  /api/auth  /api/trust-  │
│  Transfer · Messages · │ ◀════════════════════════════│  score  /api/scan-      │
│  Admin dashboard       │        (Socket.IO)            │  message  /api/otp/*    │
└─────────────────────┘                              └────────────┬─────────────┘
                                                                     │
                                     ┌───────────────────────────────┼───────────────────────────────┐
                                     ▼                               ▼                               ▼
                         ┌──────────────────────┐        ┌────────────────────────┐      ┌───────────────────────┐
                         │   PostgreSQL (Neon)   │        │   Google Gemini API     │      │  Simulated SMS inbox   │
                         │  accounts · txns ·     │        │  (scam-message NLP      │      │  (OTP delivery target, │
                         │  decoy_fields ·        │        │   classification)       │      │  demo-grade — no real  │
                         │  trust_events          │        └────────────────────────┘      │  SMS gateway yet)      │
                         └──────────────────────┘                                          └───────────────────────┘
```

**Flow to call out on the slide:**
1. Customer initiates a transfer in the Union360 app.
2. Backend scores it in real time against device, location, velocity, and recipient-risk signals.
3. Depending on the score: proceed silently, OTP step-up, facial verification, or a last-resort liveness check.
4. Every event streams live over Socket.IO to the bank's security-operations Admin dashboard.
5. A decoy (honeytoken) field touched anywhere trips an immediate breach alert, independent of the trust score.

*(Suggested screenshot to pair with this slide: `pitch-assets/09-admin-dashboard.png`, showing the live event feed the architecture above feeds into.)*

---

## Slide 5 — Demo Screenshots

**Headline:** See it in action.

Suggested screenshots (all in `pitch-assets/`), one per row/panel:

1. `01-login.png` — Union360 login, SentinelIQ invisible during normal use
2. `02-dashboard.png` — Dashboard, balance + recent transactions
3. `03-transaction-history.png` — Full transaction history
4. `04-soft-stepup-otp.png` — Medium-risk: OTP step-up, delivered via simulated SMS
5. `05-hard-stepup-facial-verification.png` — High-risk: facial verification with "why am I seeing this?" signal breakdown
6. `06-liveness-check.png` — Last-resort guided liveness check instead of a dead-end block
7. `07-breach-detected.png` — Full-screen breach alert from a honeytoken trip
8. `08-messages-device-protection.png` — SentinelIQ at the device/SMS level, not a bank-app feature
9. `09-admin-dashboard.png` — Bank security-ops live dashboard

**Suggested layout:** 3×3 grid, or a "normal use → escalating response → admin visibility" left-to-right narrative strip (mirrors the flow on the architecture slide).

---

## Slide 6 — What Comes After the Hackathon

**Headline:** From demo to deployment.

- **Real SMS gateway integration** — replace the simulated SMS inbox with an actual carrier gateway (e.g. Termii, Africa's Talking) so OTPs arrive as real texts.
- **Production biometric SDK** — swap the simulated facial verification/liveness flow for a certified on-device biometric SDK (e.g. Apple/Android native APIs, or a vendor like FaceTec) for real liveness-spoofing resistance.
- **Claude API migration** — move the NLP scam classifier from Gemini back to Claude as originally designed, once account access allows; the prompt/schema/tests are already model-agnostic.
- **Multi-language scam detection** — extend classification beyond English to Pidgin, Yoruba, Hausa, and Igbo, matching how scam SMS actually arrives in Nigeria.
- **Bank-side rollout** — package the trust-scoring engine + admin dashboard as an integration a bank's existing fraud team can adopt without replacing their core banking system.
- **Regulatory alignment** — pursue CBN/NDPR compliance review, positioning SentinelIQ as ready for the liveness-verification and device-binding mandates already being introduced industry-wide.
- **Expanded fraud-scenario coverage** — mule-account detection, cross-bank recipient risk scoring, and behavioral biometrics (typing rhythm, session patterns) beyond the current device/location/velocity signals.
