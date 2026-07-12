// Shared sample messages for classifier testing and fallback-cache generation.
// 5 scam + 5 legitimate. `expected` is the ground-truth intent.

const SCAM_MESSAGES = [
  {
    id: "urgency_sms",
    text: "FINAL NOTICE: Your Union Bank account shows suspicious activity. Reply STOP within 30 minutes or it will be permanently locked.",
    expected: "suspicious",
  },
  {
    id: "fake_prize",
    text: "Congratulations! Your number won ₦2,000,000 in the Union Bank Anniversary Promo. Send your BVN and card PIN to claim your prize now.",
    expected: "suspicious",
  },
  {
    id: "account_suspension",
    text: "Dear customer, your BVN has been suspended. Re-validate immediately at http://union-bank-secure.link/verify to avoid account closure.",
    expected: "suspicious",
  },
  {
    id: "otp_request",
    text: "This is Union Bank support. We are fixing your account. Please read me the 6-digit code we just sent so we can verify you.",
    expected: "suspicious",
  },
  {
    id: "delivery_fee",
    text: "Your parcel is held at customs. Pay a ₦3,500 clearance fee to 0812XXInvalidPay or it will be returned. Click bit.ly/clear-parcel.",
    expected: "suspicious",
  },
];

const LEGIT_MESSAGES = [
  {
    id: "balance_notification",
    text: "Union Bank: A credit of NGN 350,000.00 was made to your account **4821 on 28-Jun. Available balance: NGN 482,650.75.",
    expected: "legitimate",
  },
  {
    id: "statement_ready",
    text: "Your June account statement is now ready. Log in to the Union Bank app to view or download it. Do not share your login details with anyone.",
    expected: "legitimate",
  },
  {
    id: "transaction_receipt",
    text: "Transaction successful: NGN 12,500.00 debit to SHOPRITE IKEJA on 01-Jul. Ref 99A2. Balance: NGN 470,150.75.",
    expected: "legitimate",
  },
  {
    id: "schedule_reminder",
    text: "Reminder: your standing order of NGN 45,000 to Chidi O. is scheduled for tomorrow. No action is needed if this is expected.",
    expected: "legitimate",
  },
  {
    id: "loan_update",
    text: "Good news — your Union Bank personal loan application has been approved. Visit any branch or the app for next steps. We will never ask for your PIN.",
    expected: "legitimate",
  },
];

const ALL_MESSAGES = [...SCAM_MESSAGES, ...LEGIT_MESSAGES];

module.exports = { SCAM_MESSAGES, LEGIT_MESSAGES, ALL_MESSAGES };
