// Simple Union Bank wordmark for the demo. Cyan is Union Bank's primary brand colour;
// the rearing horse is its emblem (stylised here as a simple glyph).

export default function UnionBankLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span
        aria-hidden
        className="flex h-9 w-9 items-center justify-center rounded-md bg-cyan-500 text-lg font-black text-slate-950"
      >
        U
      </span>
      <span className="text-lg font-semibold tracking-tight text-white">
        Union<span className="text-cyan-400">Bank</span>
      </span>
    </div>
  );
}
