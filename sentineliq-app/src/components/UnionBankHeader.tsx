// Union Bank Online top bar: cyan header with the "UnionOnline" wordmark on the
// left and the horse emblem on the right, plus the quick-link pill row beneath.
import UnionHorseLogo from "@/components/UnionHorseLogo";

const QUICK_LINKS = [
  "ATM Locator / Branch",
  "Frequently Asked Questions",
  "Open an Account",
];

export default function UnionBankHeader() {
  return (
    <header>
      <div className="bg-ubblue">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <span className="text-2xl font-bold text-white sm:text-3xl">
            Union<span className="font-normal">Online</span>
          </span>
          <UnionHorseLogo />
        </div>
      </div>

      {/* Quick-link pills */}
      <nav aria-label="Quick links" className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
        <ul className="flex flex-wrap justify-center gap-3 sm:justify-end">
          {QUICK_LINKS.map((label) => (
            <li key={label}>
              <a
                href="#"
                className="inline-block rounded-full bg-ubblue px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-ubblue-deep"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
