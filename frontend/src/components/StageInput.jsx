import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StageShell } from './StageShell';
import { TickerChip } from './TickerChip';
import { TickerAutocomplete } from './TickerAutocomplete';
import { useTickerValidation } from '../hooks/useTickerValidation';
import { MIN_TICKERS, MAX_TICKERS } from '../lib/constants';

export function StageInput({ tickers, setTickers, onOptimize, optimizeDisabled, isActive }) {
  const [input, setInput] = useState('');

  const handleValidationResult = useCallback((ticker, status, name) => {
    setTickers(prev => prev.map(t =>
      t.ticker === ticker ? { ...t, status, name: name ?? t.name } : t
    ));
  }, [setTickers]);

  const { validate } = useTickerValidation(handleValidationResult);

  const addTicker = (ticker, name = null) => {
    const upper = ticker.toUpperCase().trim();
    if (!upper || tickers.length >= MAX_TICKERS) return;
    if (tickers.find(t => t.ticker === upper)) return;
    setTickers(prev => [...prev, { ticker: upper, name, status: 'loading' }]);
    validate(upper);
    setInput('');
  };

  const removeTicker = (ticker) => setTickers(prev => prev.filter(t => t.ticker !== ticker));

  return (
    <StageShell number="01" label="INPUT" isActive={isActive}>
      <div className="flex gap-2 mb-4">
        <TickerAutocomplete
          value={input}
          onChange={setInput}
          onSelect={addTicker}
          disabled={tickers.length >= MAX_TICKERS}
        />
        <button
          onClick={() => setTickers([])}
          disabled={tickers.length === 0}
          className="border border-nb-border font-mono text-[9px] tracking-widest px-3
                     text-nb-dim hover:border-nb-border-bright hover:text-nb-muted
                     disabled:opacity-30 disabled:cursor-not-allowed nb-pop-btn"
        >
          CLEAR ALL
        </button>
      </div>

      <AnimatePresence mode="popLayout">
        <div className="flex flex-wrap gap-2 min-h-[2rem]">
          {tickers.map(t => (
            <motion.div
              key={t.ticker}
              layout
              initial={{ opacity: 0, scale: 0.85, x: -8 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.85, x: 8 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              <TickerChip
                ticker={t.ticker}
                name={t.name}
                status={t.status}
                onRemove={() => removeTicker(t.ticker)}
              />
            </motion.div>
          ))}
        </div>
      </AnimatePresence>

      {tickers.length > 0 && tickers.length < MIN_TICKERS && (
        <p className="font-mono text-[9px] text-nb-amber mt-2">
          Add {MIN_TICKERS - tickers.length} more ticker{MIN_TICKERS - tickers.length > 1 ? 's' : ''} to enable optimization
        </p>
      )}
      {tickers.length >= MAX_TICKERS && (
        <p className="font-mono text-[9px] text-nb-dim mt-2">Maximum {MAX_TICKERS} tickers reached</p>
      )}

      <motion.button
        onClick={onOptimize}
        disabled={optimizeDisabled}
        className="mt-4 w-full border-2 border-nb-cyan font-mono text-[10px] tracking-widest
                   py-3 text-nb-cyan hover:bg-nb-cyan hover:text-nb-bg transition-all
                   disabled:border-nb-border disabled:text-nb-dim disabled:cursor-not-allowed nb-pop-btn"
        whileTap={!optimizeDisabled ? { scale: 0.98 } : {}}
      >
        OPTIMIZE PORTFOLIO
      </motion.button>
    </StageShell>
  );
}
