"use client";

// On-screen security keyboard, mirroring Union Bank Online. Clicking a key types
// into the currently-focused field (handled by the parent). Special keys map to
// backspace / clear; modifier keys are shown for fidelity but are inert.

interface VirtualKeyboardProps {
  onInput: (char: string) => void;
  onBackspace: () => void;
  onCancel: () => void;
}

const ROW1 = ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="];
const ROW2 = ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"];
const ROW3 = ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'"];
const ROW4 = ["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"];

export default function VirtualKeyboard({ onInput, onBackspace, onCancel }: VirtualKeyboardProps) {
  return (
    <div className="overflow-x-auto rounded-lg bg-ubblue p-2 select-none">
      <div className="min-w-max space-y-1.5">
        {/* Row 1 */}
        <div className="flex justify-center gap-1">
          {ROW1.map((k) => (
            <Key key={k} label={k} onClick={() => onInput(k)} />
          ))}
          <Key label="Bks" wide onClick={onBackspace} />
        </div>
        {/* Row 2 */}
        <div className="flex justify-center gap-1">
          <Key label="Tab" wide />
          {ROW2.map((k) => (
            <Key key={k} label={k} onClick={() => onInput(k)} />
          ))}
        </div>
        {/* Row 3 */}
        <div className="flex justify-center gap-1">
          {ROW3.map((k) => (
            <Key key={k} label={k} onClick={() => onInput(k)} />
          ))}
          <Key label="Enter" wide />
        </div>
        {/* Row 4 */}
        <div className="flex justify-center gap-1">
          <Key label="Shift" wide />
          {ROW4.map((k) => (
            <Key key={k} label={k} onClick={() => onInput(k)} />
          ))}
          <Key label="Shift" wide />
        </div>
        {/* Row 5 */}
        <div className="flex justify-center gap-1">
          <button
            type="button"
            aria-label="Space"
            onClick={() => onInput(" ")}
            className="h-8 w-44 rounded bg-ubkey shadow-sm transition-colors hover:bg-white"
          />
          <Key label="Cancel" wide onClick={onCancel} />
        </div>
      </div>
    </div>
  );
}

function Key({
  label,
  wide = false,
  onClick,
}: {
  label: string;
  wide?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-8 items-center justify-center rounded bg-ubkey text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-white ${
        wide ? "px-2 min-w-11" : "w-6"
      }`}
    >
      {label}
    </button>
  );
}
