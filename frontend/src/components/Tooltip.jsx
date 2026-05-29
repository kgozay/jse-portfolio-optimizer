import { useState } from 'react';

export function Tooltip({ text }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center ml-1">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="font-mono text-[10px] text-nb-dim border border-nb-border w-4 h-4
                   flex items-center justify-center hover:border-nb-cyan hover:text-nb-cyan
                   transition-colors leading-none"
        aria-label="More information"
      >
        ?
      </button>
      {open && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5
                         w-52 bg-nb-surface border border-nb-border p-2
                         font-mono text-[10px] text-nb-muted leading-relaxed
                         shadow-[2px_2px_0px_0px_#2C2C2E] pointer-events-none">
          {text}
        </span>
      )}
    </span>
  );
}
