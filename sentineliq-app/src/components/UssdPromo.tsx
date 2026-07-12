// "Do it all with *826#" promotional block from Union Bank Online — the banner
// plus the grid of USSD quick-code cards.

interface UssdItem {
  label: string;
  code: string;
}

const ITEMS: UssdItem[] = [
  { label: "Buy airtime for yourself", code: "*826*Amount#" },
  { label: "Buy airtime for others", code: "*826*Amount*Mobile Number#" },
  { label: "Transfer money to Union Bank", code: "*826*1*Amount*Account No#" },
  { label: "Transfer money to other banks", code: "*826*2*Amount*Account No#" },
  { label: "Block account", code: "*826*6#" },
  { label: "Locate a branch/UnionDirect Agent", code: "*826*19#" },
  { label: "Request a debit card", code: "*826*21#" },
  { label: "UnionKash", code: "*826*41#" },
  { label: "Check balance", code: "*826*4#" },
  { label: "Pay merchant (mCash)", code: "*826*22*MerchantCode*Amount#" },
  { label: "Data purchase", code: "*826*9#" },
];

export default function UssdPromo() {
  return (
    <section aria-label="USSD banking with *826#" className="w-full max-w-xl">
      {/* Banner */}
      <div className="flex items-center justify-between overflow-hidden rounded-lg bg-ubblue px-6 py-8">
        <p className="text-3xl font-extrabold leading-tight text-white sm:text-4xl">
          Do it all
          <br />
          with
        </p>
        <div className="relative flex items-center justify-center">
          {/* Yellow sunburst behind the code, as in the reference. */}
          <svg
            viewBox="0 0 100 100"
            aria-hidden
            className="absolute h-32 w-32 text-amber-300 sm:h-36 sm:w-36"
            fill="currentColor"
          >
            <polygon points="50,0 57.8,21 75,6.7 71.2,28.8 93.3,25 79,42.2 100,50 79,57.8 93.3,75 71.2,71.2 75,93.3 57.8,79 50,100 42.2,79 25,93.3 28.8,71.2 6.7,75 21,57.8 0,50 21,42.2 6.7,25 28.8,28.8 25,6.7 42.2,21" />
          </svg>
          <p className="relative z-10 text-4xl font-black text-ubblue drop-shadow-sm sm:text-5xl">
            *826#
          </p>
        </div>
      </div>

      {/* Code grid */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ITEMS.map((item) => (
          <article
            key={item.label}
            className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 text-center shadow-sm"
          >
            <p className="text-xs text-slate-600">{item.label}</p>
            <p className="mt-1 break-words text-xs font-bold text-ubblue">{item.code}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        <p className="text-slate-600">
          Terms &amp; Conditions apply
          <br />
          <span className="font-semibold text-slate-800">www.unionbankng.com</span>
        </p>
        <p className="font-semibold italic text-ubblue">Your Simpler, Smarter Bank.</p>
      </div>
    </section>
  );
}
