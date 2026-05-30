import { useState, useRef } from 'react';
import tickerList from '../data/jse_tickers.json';

const SECTOR_SHORT = {
  'Financials':             'FIN',
  'Resources':              'RES',
  'Industrials':            'IND',
  'Consumer Discretionary': 'DISC',
  'Consumer Staples':       'STAP',
  'Technology':             'TECH',
  'Telecommunications':     'TELCO',
  'Real Estate':            'REIT',
};

export function TickerAutocomplete({ value, onChange, onSelect, disabled }) {
  const [suggestions, setSuggestions] = useState([]);
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const val = e.target.value.toUpperCase();
    onChange(val);
    if (val.length < 1) { 
      setSuggestions([]); 
      setActiveIndex(-1);
      return; 
    }
    const matches = tickerList.filter(t =>
      t.ticker.startsWith(val) || t.name.toUpperCase().includes(val)
    ).slice(0, 6);
    setSuggestions(matches);
    setActiveIndex(matches.length > 0 ? 0 : -1);
  };

  const handleKey = (e) => {
    if (suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        const match = suggestions[activeIndex];
        onSelect(match.ticker, match.name);
      } else if (value.trim()) {
        onSelect(value.trim(), null);
      }
      setSuggestions([]);
      setActiveIndex(-1);
    } else if (e.key === 'Escape') {
      setSuggestions([]);
      setActiveIndex(-1);
    }
  };

  return (
    <div className="relative flex-1">
      <input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKey}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => { setFocused(false); setActiveIndex(-1); }, 150)}
        disabled={disabled}
        placeholder="TICKER OR COMPANY NAME"
        aria-label="Search JSE ticker or company name"
        aria-autocomplete="list"
        aria-expanded={suggestions.length > 0}
        className="w-full bg-transparent border border-nb-border font-mono text-xs
                   tracking-widest px-3 py-2.5 text-nb-text placeholder:text-nb-dim
                   focus:border-nb-cyan outline-none disabled:opacity-30"
      />
      {focused && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-10 border-2 border-t-0 border-nb-border bg-nb-surface">
          {suggestions.map((s, idx) => {
            const isActive = activeIndex === idx;
            const sectorLabel = SECTOR_SHORT[s.sector] ?? 'JSE';
            
            return (
              <button
                key={s.ticker}
                onMouseDown={() => { onSelect(s.ticker, s.name); setSuggestions([]); }}
                aria-label={`Add ${s.ticker} — ${s.name}`}
                className={`w-full flex items-center justify-between text-left px-3 py-2 font-mono text-xs transition-colors ${
                  isActive ? 'bg-nb-border text-nb-cyan font-bold' : 'text-nb-muted hover:bg-nb-border hover:text-nb-text'
                }`}
              >
                <span className="truncate">
                  {s.ticker} <span className="text-[10px] opacity-60">— {s.name}</span>
                </span>
                <span className={`ml-2 text-[9px] border px-1.5 py-[1px] tracking-wider shrink-0 transition-colors ${
                  isActive ? 'border-nb-cyan text-nb-cyan' : 'border-nb-border text-nb-dim'
                }`}>
                  {sectorLabel}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
