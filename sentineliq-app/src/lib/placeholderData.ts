// Static placeholder data for Day 1. Builder B's API replaces all of this on Day 2.

export interface Account {
  holder: string;
  number: string;
  balance: number;
  currency: string;
}

export interface Transaction {
  id: string;
  description: string;
  date: string;
  amount: number; // negative = debit, positive = credit
}

export interface Message {
  id: string;
  sender: string;
  body: string;
  timestamp: string;
  /** Internal hint only — NOT rendered. Builder C's NLP overlay classifies live on Day 2. */
  kind: "legit" | "scam";
}

export const ACCOUNT: Account = {
  holder: "Ada Demo",
  number: "•••• 4821",
  balance: 482650.75,
  currency: "NGN",
};

export const TRANSACTIONS: Transaction[] = [
  { id: "t1", description: "Shoprite Ikeja", date: "2026-07-01", amount: -12500 },
  { id: "t2", description: "Salary — Unilag", date: "2026-06-28", amount: 350000 },
  { id: "t3", description: "MTN Airtime", date: "2026-06-27", amount: -2000 },
  { id: "t4", description: "Transfer to Chidi O.", date: "2026-06-25", amount: -45000 },
  { id: "t5", description: "Refund — Jumia", date: "2026-06-24", amount: 8990 },
];

export const MESSAGES: Message[] = [
  {
    id: "m1",
    sender: "Union360",
    body: "Your OTP is 483920. Do not share it with anyone, including bank staff.",
    timestamp: "2026-07-02 09:14",
    kind: "legit",
  },
  {
    id: "m2",
    sender: "+234 809 555 0142",
    body: "URGENT: Your account will be BLOCKED today. Verify now at union-bank-secure.link/verify to avoid suspension.",
    timestamp: "2026-07-02 08:47",
    kind: "scam",
  },
  {
    id: "m3",
    sender: "Mum",
    body: "Did you get the transfer I sent yesterday? Call me when you're free.",
    timestamp: "2026-07-01 19:32",
    kind: "legit",
  },
  {
    id: "m4",
    sender: "REWARDS",
    body: "Congratulations! You've WON ₦2,000,000 in the Union360 promo. Send your BVN and card PIN to claim now.",
    timestamp: "2026-07-01 14:05",
    kind: "scam",
  },
];

export function formatCurrency(
  amount: number,
  currency = "NGN",
  fractionDigits = 2,
): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}
