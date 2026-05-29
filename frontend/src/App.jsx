import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import { StageInput } from './components/StageInput';
import { StageCompute } from './components/StageCompute';
import { StageOutput } from './components/StageOutput';
import { ColdStartBanner } from './components/ColdStartBanner';
import { LandingPage } from './components/LandingPage';
import { useOptimiser } from './hooks/useOptimiser';
import { useRfRate } from './hooks/useRfRate';
import { API_URL, DEFAULT_MAX_WEIGHT, DEFAULT_PERIOD, DEFAULT_ESTIMATOR, DEFAULT_N_SIMS } from './lib/constants';

export default function App() {
  const [tickers, setTickers] = useState([]);
  const [runId, setRunId] = useState(0);
  const [showApp, setShowApp] = useState(false);
  const { rfData } = useRfRate();
  const { optimise, logs, result, status } = useOptimiser();

  const validCount = tickers.filter(t => t.status === 'valid').length;

  // Lifted parameters state
  const [rfOverride, setRfOverride] = useState(null);
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const [maxWeight, setMaxWeight] = useState(DEFAULT_MAX_WEIGHT);
  const [estimator, setEstimator] = useState(DEFAULT_ESTIMATOR);
  const [nSims, setNSims] = useState(DEFAULT_N_SIMS);
  const [objective, setObjective] = useState('max_sharpe');
  const [benchmark, setBenchmark] = useState('J203');

  // Backtest state
  const [backtestResult, setBacktestResult] = useState(null);
  const [backtestStatus, setBacktestStatus] = useState('idle'); // idle | loading | done | error

  const handleOptimise = async () => {
    setRunId(id => id + 1);
    
    // Add valid tickers to the request
    const validTickers = tickers.filter(t => t.status === 'valid').map(t => t.ticker);
    const effectiveRfPct = rfOverride ?? rfData?.rate_pct ?? 10.50;
    
    optimise({
      tickers: validTickers,
      rf_rate: effectiveRfPct / 100,
      period,
      max_weight: maxWeight,
      estimator,
      n_simulations: nSims,
      objective,
      benchmark
    });
  };

  useEffect(() => {
    if (status === 'done' && result) {
      const fetchBacktest = async () => {
        setBacktestStatus('loading');
        setBacktestResult(null);
        try {
          const validTickers = tickers.filter(t => t.status === 'valid').map(t => t.ticker);
          const effectiveRfPct = rfOverride ?? rfData?.rate_pct ?? 10.50;
          
          const payload = {
            tickers: validTickers,
            rf_rate: effectiveRfPct / 100,
            period,
            max_weight: maxWeight,
            estimator,
            n_simulations: nSims,
            objective,
            benchmark
          };
          
          const res = await axios.post(`${API_URL}/backtest`, payload);
          setBacktestResult(res.data);
          setBacktestStatus('done');
        } catch (err) {
          console.error("Backtest fetch failed:", err);
          setBacktestStatus('error');
        }
      };
      fetchBacktest();
    } else if (status === 'running') {
      setBacktestResult(null);
      setBacktestStatus('idle');
    }
  }, [status, result, benchmark]);

  const optimiseDisabled = validCount < 3 || status === 'running';

  // Determine active stages for cyber-border glow
  const stage1Active = status !== 'running' && status !== 'done' && validCount < 3;
  const stage2Active = status === 'running' || (status === 'idle' && validCount >= 3);
  const stage3Active = status === 'done';

  return (
    <AnimatePresence mode="wait">
      {!showApp ? (
        <motion.div
          key="landing"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3 }}
          className="w-full animate-fade"
        >
          <LandingPage onLaunch={() => setShowApp(true)} />
        </motion.div>
      ) : (
        <motion.div
          key="app"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full flex justify-center"
        >
          <div className="min-h-screen bg-nb-bg text-nb-text p-4 md:p-8 flex justify-center pb-24 w-full">
            <div className="w-full max-w-2xl">
              <header className="mb-8 pb-5 border-b border-nb-border">
                <h1 className="font-mono text-2xl tracking-wide text-nb-text font-bold">JSE PORTFOLIO OPTIMISER</h1>
                <p className="font-mono text-[11px] text-nb-cyan mt-2 tracking-widest">
                  {objective === 'max_sortino'
                    ? 'MAXIMUM SORTINO RATIO · MEAN-SEMIVARIANCE MODELLING'
                    : objective === 'min_volatility'
                      ? 'MINIMUM VOLATILITY · EFFICIENT FRONTIER MODELLING'
                      : 'MAXIMUM SHARPE RATIO · MEAN-VARIANCE MODELLING'}
                </p>
              </header>

              <ColdStartBanner />

              <div className="flex flex-col mt-6">
                <StageInput 
                  tickers={tickers} 
                  setTickers={setTickers} 
                  onOptimise={handleOptimise}
                  optimiseDisabled={optimiseDisabled} 
                  isActive={stage1Active}
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
                  objective={objective}
                  setObjective={setObjective}
                  isActive={stage2Active}
                  locked={validCount === 0}
                />

                <AnimatePresence>
                  {result && status === 'done' && (
                    <StageOutput 
                      result={result} 
                      runId={runId} 
                      backtestResult={backtestResult} 
                      backtestStatus={backtestStatus}
                      isActive={stage3Active}
                      benchmark={benchmark}
                      setBenchmark={setBenchmark}
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
