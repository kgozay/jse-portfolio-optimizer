import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StageShell } from './StageShell';

export function StageCompute({
  rfData,
  logs,
  status,
  rfOverride,
  setRfOverride,
  period,
  setPeriod,
  maxWeight,
  setMaxWeight,
  estimator,
  setEstimator,
  nSims,
  setNSims,
  isActive
}) {
  const [rfInput, setRfInput] = useState('');

  const effectiveRfPct = rfOverride ?? rfData?.rate_pct ?? 10.50;

  useEffect(() => {
    if (rfOverride === null) {
      setRfInput((rfData?.rate_pct ?? 10.50).toFixed(2));
    }
  }, [rfOverride, rfData?.rate_pct]);

  const handleRfChange = (e) => {
    const val = e.target.value;
    setRfInput(val);
    if (val === '') {
      setRfOverride(0);
      return;
    }
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) {
      setRfOverride(parsed);
    }
  };

  return (
    <StageShell number="02" label="PARAMETERS" isActive={isActive}>
      <div className="space-y-4">

        {/* Risk-free rate */}
        <div className="flex justify-between items-center">
          <span className="font-mono text-[9px] tracking-widest text-nb-muted">RISK-FREE RATE</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="30"
              step="0.01"
              value={rfInput}
              onChange={handleRfChange}
              className="w-16 bg-transparent text-right font-mono text-sm text-nb-text
                         border border-nb-border focus:border-nb-cyan outline-none px-1"
            />
            <span className="font-mono text-xs text-nb-muted">%</span>
            {rfData?.source === 'FRED' && rfOverride === null && (
              <span className="font-mono text-[8px] text-nb-cyan border border-nb-cyan px-1 py-px">FRED LIVE</span>
            )}
            {rfData?.source === 'fallback' && (
              <span className="font-mono text-[8px] text-amber-500 border border-amber-500 px-1 py-px">FALLBACK</span>
            )}
            {rfOverride !== null && (
              <button onClick={() => setRfOverride(null)}
                      className="font-mono text-[8px] text-nb-dim border border-nb-border px-1 py-px
                                 hover:border-nb-border-bright hover:text-nb-muted nb-pop-btn bg-nb-bg">
                RESET
              </button>
            )}
          </div>
        </div>
        {rfData?.source === 'FRED' && rfData?.date && rfData?.date !== 'fallback' && (
          <p className="font-mono text-[8px] text-nb-dim text-right">
            IRLTLT01ZAM156N · as of {rfData.date}
          </p>
        )}

        {/* Lookback period */}
        <div className="flex justify-between items-center">
          <span className="font-mono text-[9px] tracking-widest text-nb-muted">LOOKBACK</span>
          <div className="flex gap-1.5">
            {['1y','2y','3y','5y'].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                      className={`font-mono text-[9px] px-2 py-1 border transition-all nb-pop-btn ${
                        period === p 
                          ? 'border-nb-cyan text-nb-cyan bg-nb-cyan/5 font-bold shadow-[2px_2px_0px_0px_#00D4FF]' 
                          : 'border-nb-border text-nb-dim hover:text-nb-text bg-nb-bg'
                      }`}>
                {p.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Max weight */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="font-mono text-[9px] tracking-widest text-nb-muted">MAX WEIGHT</span>
            <motion.span className="font-mono text-sm text-nb-text"
              animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 0.12 }} key={maxWeight}>
              {(maxWeight * 100).toFixed(0)}%
            </motion.span>
          </div>
          <input type="range" min="5" max="100" step="5"
                 value={maxWeight * 100}
                 onChange={e => setMaxWeight(parseInt(e.target.value) / 100)}
                 className="w-full accent-nb-cyan" />
        </div>

        {/* Covariance estimator */}
        <div className="flex justify-between items-center">
          <span className="font-mono text-[9px] tracking-widest text-nb-muted">COVARIANCE</span>
          <div className="flex gap-1.5">
            {[['ledoit_wolf','LEDOIT-WOLF'],['sample','SAMPLE']].map(([val, label]) => (
              <button key={val} onClick={() => setEstimator(val)}
                      className={`font-mono text-[9px] px-2 py-1 border transition-all nb-pop-btn ${
                        estimator === val 
                          ? 'border-nb-cyan text-nb-cyan bg-nb-cyan/5 font-bold shadow-[2px_2px_0px_0px_#00D4FF]' 
                          : 'border-nb-border text-nb-dim hover:text-nb-text bg-nb-bg'
                      }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Monte Carlo sims */}
        <div className="flex justify-between items-center">
          <span className="font-mono text-[9px] tracking-widest text-nb-muted">MC SIMULATIONS</span>
          <div className="flex gap-1.5">
            {[[1000,'1K'],[5000,'5K'],[10000,'10K']].map(([val, label]) => (
              <button key={val} onClick={() => setNSims(val)}
                      className={`font-mono text-[9px] px-2 py-1 border transition-all nb-pop-btn ${
                        nSims === val 
                          ? 'border-nb-cyan text-nb-cyan bg-nb-cyan/5 font-bold shadow-[2px_2px_0px_0px_#00D4FF]' 
                          : 'border-nb-border text-nb-dim hover:text-nb-text bg-nb-bg'
                      }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Execution log */}
        {(status === 'running' || logs.length > 0) && (
          <div className="mt-6 border border-nb-border bg-black/60 shadow-inner relative overflow-hidden">
            {/* Terminal Title Bar */}
            <div className="flex items-center justify-between px-3 py-2 bg-nb-surface border-b border-nb-border">
              <div className="flex gap-[6px]">
                <span className="w-2 h-2 rounded-full bg-nb-red/80" />
                <span className="w-2 h-2 rounded-full bg-nb-amber/80" />
                <span className="w-2 h-2 rounded-full bg-nb-emerald/80" />
              </div>
              <span className="font-mono text-[7px] tracking-[0.2em] text-nb-dim uppercase">OPTIMIZATION_ENGINE_v1.0.0 // LIVE_LOG</span>
              <span className="w-8" />
            </div>

            {/* Radar scanner sweep line */}
            {status === 'running' && <div className="scan-line" />}

            {/* Terminal Output Area */}
            <div className="p-3 min-h-[100px] max-h-[200px] overflow-y-auto font-mono text-[9px] space-y-1.5 scrollbar-thin">
              <AnimatePresence initial={false}>
                {logs.map((log, i) => {
                  const isError = log.status === 'error';
                  const isOk = log.status === 'ok';
                  
                  return (
                    <motion.div key={i}
                      initial={{ opacity: 0, x: -8 }} 
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.12 }}
                      className="flex items-start gap-2 py-0.5 leading-relaxed"
                    >
                      <span className={isError ? 'text-nb-red font-bold' : 'text-nb-emerald'}>
                        {isError ? '✖' : '❯'}
                      </span>
                      
                      <div className="flex-1 text-nb-muted">
                        {log.ticker ? (
                          isOk ? (
                            <span>
                              DATA SOURCE: FETCHED <span className="text-nb-cyan font-bold">{log.ticker}</span> • {log.rows} DAILY OBSERVATIONS
                            </span>
                          ) : (
                            <span className="text-nb-red">
                              FETCH ERROR: <span className="font-bold">{log.ticker}</span> — {log.msg}
                            </span>
                          )
                        ) : (
                          <span>{log.msg}</span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {status === 'running' && (
                <div className="flex items-center gap-2 pl-4 py-0.5">
                  <span className="w-[6px] h-3 bg-nb-cyan cursor block" />
                  <span className="text-nb-dim font-mono text-[8px] animate-pulse">RUNNING MODEL MATH...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </StageShell>
  );
}
