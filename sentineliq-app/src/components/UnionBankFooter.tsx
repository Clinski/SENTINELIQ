// Union Bank Online footer — copyright, policy links, CBN licence line.

const LINKS = [
  "All Rights Reserved",
  "Terms and Conditions",
  "Disclaimer Privacy Policy",
  "FAQs",
];

export default function UnionBankFooter() {
  return (
    <footer className="mt-12 border-t border-slate-200 py-8 text-slate-600">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 text-sm sm:flex-row sm:items-start sm:justify-between">
          <p>
            Copyright 2016-2025 &nbsp;&nbsp; Union Bank Nigeria Plc
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 sm:max-w-md sm:justify-end">
            {LINKS.map((label) => (
              <li key={label}>
                <a href="#" className="hover:text-ubblue hover:underline">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-6 text-sm text-slate-600">Licensed by the Central Bank of Nigeria</p>
      </div>
    </footer>
  );
}
