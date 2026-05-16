import { motion } from 'framer-motion';
import { StageShell } from './StageShell';
import { FrontierChart } from './FrontierChart';
import { WeightBar } from './WeightBar';
import { MetricCard } from './MetricCard';
import { SectorBreakdown } from './SectorBreakdown';
import { ExportButton } from './ExportButton';

export function StageOutput({ result, runId }) {
  if (!result) return null;
  const lowSharpe = result.sharpe_ratio < 0.5;

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <StageShell number="03" label="OUTPUT" id="stage-output">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <FrontierChart result={result} />
            {result.sector_exposure && <SectorBreakdown sectors={result.sector_exposure} />}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <MetricCard label="EXP. RETURN" value={result.expected_return * 100} runId={runId} />
              <MetricCard label="VOLATILITY"  value={result.volatility * 100}      runId={runId} />
              <MetricCard label="SHARPE RATIO" value={result.sharpe_ratio} suffix="" runId={runId} isWarning={lowSharpe} />
            </div>

            <div className="space-y-2 pt-2">
              {result.weights.map((w, i) => (
                <WeightBar key={w.ticker} ticker={w.ticker} weight={w.weight} delay={i * 0.08} />
              ))}
            </div>

            {result.tickers_dropped?.length > 0 && (
              <p className="font-mono text-[9px] text-nb-amber">
                ⚠ Dropped: {result.tickers_dropped.join(', ')} — insufficient history
              </p>
            )}

            <ExportButton result={result} />
          </div>
        </div>
      </StageShell>
    </motion.div>
  );
}
