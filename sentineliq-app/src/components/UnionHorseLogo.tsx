// Union Bank emblem — the galloping white horse + "unionbank" wordmark, as used in
// the header of Union Bank Online. Colours are inherited (currentColor) so it works
// on the cyan header.

interface UnionHorseLogoProps {
  className?: string;
}

export default function UnionHorseLogo({ className = "" }: UnionHorseLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        viewBox="0 0 128 96"
        role="img"
        aria-label="Union Bank"
        className="h-9 w-auto text-white"
        fill="currentColor"
      >
        {/* Galloping horse silhouette */}
        <path d="M120 20c-2-1-5 0-7 1-3 1-5 4-8 4-2 0-4-2-6-2-3 1-5 4-8 5-3 1-6 0-9 1-4 2-6 6-10 8-3 2-7 2-10 4-4 2-6 6-10 8-3 2-7 2-10 5-3 2-4 6-7 8-2 2-6 2-7 5-1 2 1 4 3 4 3 0 5-3 7-5 2-2 3-6 6-7-1 3-3 6-3 9 0 3 1 7-1 10-1 2-4 2-4 5 0 2 3 3 5 2 3-1 4-5 4-8 1-4 0-9 2-13 4 2 8 2 12 3l4 18c1 3 0 7 3 8 2 1 4-1 4-3 0-4-2-7-2-11-1-3-1-7 0-10 4 0 8-1 12-2l6 16c1 3 0 7 3 8 2 1 4-1 4-4-1-4-3-7-4-11-1-3-2-7-1-10 4-2 7-5 10-8 3-4 4-9 7-13 2-3 6-4 8-7 2-3 1-7 3-10 1-2 4-3 4-6 0-2-2-4-4-4z" />
      </svg>
      <span className="text-lg font-semibold tracking-tight text-white">
        union<span className="font-light">bank</span>
      </span>
    </div>
  );
}
