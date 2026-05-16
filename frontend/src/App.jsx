import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { StageInput } from './components/StageInput';
import { StageCompute } from './components/StageCompute';
import { StageOutput } from './components/StageOutput';
import { ColdStartBanner } from './components/ColdStartBanner';
import { useOptimizer } from './hooks/useOptimizer';
import { useRfRate } from './hooks/useRfRate';

export default function App() {
  const [tickers, setTickers] = useState([]);
  const [runId, setRunId] = useState(0);
  const { rfData } = useRfRate();
  const { optimize, logs, result, status } = useOptimizer();

  const handleOptimize = async () => {
    const paramsEl = document.getElementById('compute-params');
    const params = paramsEl ? JSON.parse(paramsEl.dataset.params) : {};
    setRunId(id => id + 1);
    
    // Add valid tickers to the request
    const validTickers = tickers.filter(t => t.status === 'valid').map(t => t.ticker);
    
    optimize({
      tickers: validTickers,
      ...params
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
            onParamsChange={() => {}}
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
