import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { StageInput } from './components/StageInput';
import { StageCompute } from './components/StageCompute';
import { StageOutput } from './components/StageOutput';
import { ColdStartBanner } from './components/ColdStartBanner';
import { useOptimizer } from './hooks/useOptimizer';
import { useRfRate } from './hooks/useRfRate';
import { DEFAULT_MAX_WEIGHT, DEFAULT_PERIOD, DEFAULT_ESTIMATOR, DEFAULT_N_SIMS } from './lib/constants';

export default function App() {
  const [tickers, setTickers] = useState([]);
  const [runId, setRunId] = useState(0);
  const { rfData } = useRfRate();
  const { optimize, logs, result, status } = useOptimizer();

  // Lifted parameters state
  const [rfOverride, setRfOverride] = useState(null);
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const [maxWeight, setMaxWeight] = useState(DEFAULT_MAX_WEIGHT);
  const [estimator, setEstimator] = useState(DEFAULT_ESTIMATOR);
  const [nSims, setNSims] = useState(DEFAULT_N_SIMS);

  const handleOptimize = async () => {
    setRunId(id => id + 1);
    
    // Add valid tickers to the request
    const validTickers = tickers.filter(t => t.status === 'valid').map(t => t.ticker);
    const effectiveRfPct = rfOverride ?? rfData?.rate_pct ?? 10.50;
    
    optimize({
      tickers: validTickers,
      rf_rate: effectiveRfPct / 100,
      period,
      max_weight: maxWeight,
      estimator,
      n_simulations: nSims
    });
  };

  const optimizeDisabled = tickers.filter(t => t.status === 'valid').length < 3 || status === 'running';

  return (
    <div className="min-h-screen bg-nb-bg text-nb-text p-4 md:p-8 flex justify-center pb-24">
      <div className="w-full max-w-2xl">
        <header className="mb-8">
          <h1 className="font-mono text-xl tracking-wide text-nb-text">JSE PORTFOLIO OPTIMIZER</h1>
          <p className="font-mono text-xs text-nb-muted mt-2">
            MAXIMUM SHARPE RATIO · EFFICIENT FRONTIER MODELING
          </p>
        </header>

        <ColdStartBanner />

        <div className="flex flex-col mt-6">
          <StageInput 
            tickers={tickers} 
            setTickers={setTickers} 
            onOptimize={handleOptimize}
            optimizeDisabled={optimizeDisabled} 
          />
          
          <StageCompute 
            rfData={rfData}
            logs={logs}
            status={status}
            rfOverride={rfOverride}
            setRfOverride={setRfOverride}
            period={period}
            setPeriod={setPeriod}
            maxWeight={maxWeight}
            setMaxWeight={setMaxWeight}
            estimator={estimator}
            setEstimator={setEstimator}
            nSims={nSims}
            setNSims={setNSims}
          />

          <AnimatePresence>
            {result && status === 'done' && (
              <StageOutput result={result} runId={runId} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
