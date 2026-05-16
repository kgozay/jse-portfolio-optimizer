import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StageShell } from './StageShell';
import { DEFAULT_MAX_WEIGHT, DEFAULT_PERIOD, DEFAULT_ESTIMATOR, DEFAULT_N_SIMS } from '../lib/constants';

export function StageCompute({ rfData, logs, status, onParamsChange }) {
  const [rfOverride, setRfOverride] = useState(null);
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const [maxWeight, setMaxWeight] = useState(DEFAULT_MAX_WEIGHT);
  const [estimator, setEstimator] = useState(DEFAULT_ESTIMATOR);
  const [nSims, setNSims] = useState(DEFAULT_N_SIMS);

  const effectiveRfPct = rfOverride ?? rfData.rate_pct;
  const params = { rf_rate: effectiveRfPct / 100, period, max_weight: maxWeight, estimator, n_simulations: nSims };

  return (
    <StageShell number="02" label="PARAMETERS">
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
              value={effectiveRfPct.toFixed(2)}
              onChange={e => setRfOverride(parseFloat(e.target.value))}
              className="w-16 bg-transparent text-right font-mono text-sm text-nb-text
                         border border-nb-border focus:border-nb-cyan outline-none px-1"
            />
            <span className="font-mono text-xs text-nb-muted">%</span>
            {rfData.source === 'FRED' && rfOverride === null && (
              <span className="font-mono text-[8px] text-nb-cyan border border-nb-cyan px-1 py-px">FRED LIVE</span>
            )}
            {rfData.source === 'fallback' && (
              <span className="font-mono text-[8px] text-amber-500 border border-amber-500 px-1 py-px">FALLBACK</span>
            )}
            {rfOverride !== null && (
              <button onClick={() => setRfOverride(null)}
                      className="font-mono text-[8px] text-nb-dim border border-nb-border px-1 py-px
                                 hover:border-nb-border-bright hover:text-nb-muted">
                RESET
              </button>
            )}
          </div>
        </div>
        {rfData.source === 'FRED' && rfData.date && rfData.date !== 'fallback' && (
          <p className="font-mono text-[8px] text-nb-dim text-right">
            IRLTLT01ZAM156N · as of {rfData.date}
          </p>
        )}

        {/* Lookback period */}
        <div className="flex justify-between items-center">
          <span className="font-mono text-[9px] tracking-widest text-nb-muted">LOOKBACK</span>
          <div className="flex gap-1">
            {['1y','2y','3y','5y'].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                      className={`font-mono text-[9px] px-2 py-1 border ${
                        period === p ? 'border-nb-cyan text-nb-cyan' : 'border-nb-border text-nb-dim'
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
          <div className="flex gap-1">
            {[['ledoit_wolf','LEDOIT-WOLF'],['sample','SAMPLE']].map(([val, label]) => (
              <button key={val} onClick={() => setEstimator(val)}
                      className={`font-mono text-[9px] px-2 py-1 border ${
                        estimator === val ? 'border-nb-cyan text-nb-cyan' : 'border-nb-border text-nb-dim'
                      }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Monte Carlo sims */}
        <div className="flex justify-between items-center">
          <span className="font-mono text-[9px] tracking-widest text-nb-muted">MC SIMULATIONS</span>
          <div className="flex gap-1">
            {[[1000,'1K'],[5000,'5K'],[10000,'10K']].map(([val, label]) => (
              <button key={val} onClick={() => setNSims(val)}
                      className={`font-mono text-[9px] px-2 py-1 border ${
                        nSims === val ? 'border-nb-cyan text-nb-cyan' : 'border-nb-border text-nb-dim'
                      }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Execution log */}
        {(status === 'running' || logs.length > 0) && (
          <div className="mt-4 pt-4 border-t border-nb-border space-y-[2px]">
            <AnimatePresence initial={false}>
              {logs.map((log, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-center gap-2 font-mono text-[10px] py-[3px]"
                >
                  <span className={log.status === 'ok' ? 'text-nb-emerald' : 'text-nb-red'}>
                    {log.status === 'ok' ? '✓' : '⚠'}
                  </span>
                  <span className="text-nb-muted">{log.msg ?? log.ticker}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            {status === 'running' && (
              <span className="font-mono text-[10px] text-nb-dim cursor">▌</span>
            )}
          </div>
        )}
      </div>

      {/* App.jsx reads params from this hidden input at optimize-click time */}
      <input type="hidden" data-params={JSON.stringify(params)} id="compute-params" />
    </StageShell>
  );
}
