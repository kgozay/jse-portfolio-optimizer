import { useState, useRef } from 'react';
import tickerList from '../data/jse_tickers.json';

export function TickerAutocomplete({ value, onChange, onSelect, disabled }) {
  const [suggestions, setSuggestions] = useState([]);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const val = e.target.value.toUpperCase();
    onChange(val);
    if (val.length < 1) { setSuggestions([]); return; }
    const matches = tickerList.filter(t =>
      t.ticker.startsWith(val) || t.name.toUpperCase().includes(val)
    ).slice(0, 6);
    setSuggestions(matches);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && value.trim()) {
      const match = suggestions[0];
      onSelect(match?.ticker ?? value.trim(), match?.name ?? null);
      setSuggestions([]);
    }
    if (e.key === 'Escape') setSuggestions([]);
  };

  return (
    <div className="relative flex-1">
      <input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKey}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        disabled={disabled}
        placeholder="TICKER OR COMPANY NAME"
        className="w-full bg-transparent border border-nb-border font-mono text-[10px]
                   tracking-widest px-3 py-2 text-nb-text placeholder:text-nb-dim
                   focus:border-nb-cyan outline-none disabled:opacity-30"
      />
      {focused && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-10 border-2 border-t-0 border-nb-border bg-nb-surface">
          {suggestions.map(s => (
            <button
              key={s.ticker}
              onMouseDown={() => { onSelect(s.ticker, s.name); setSuggestions([]); }}
              className="w-full text-left px-3 py-2 font-mono text-[10px] text-nb-muted hover:bg-nb-border hover:text-nb-text"
            >
              {s.ticker} — {s.name} — {s.cap_tier} cap
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
