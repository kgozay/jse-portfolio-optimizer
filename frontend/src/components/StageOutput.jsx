import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { StageShell } from './StageShell';
import { FrontierChart } from './FrontierChart';
import { WeightBar } from './WeightBar';
import { MetricCard } from './MetricCard';
import { SectorBreakdown } from './SectorBreakdown';
import { ExportButton } from './ExportButton';
import { BacktestChart } from './BacktestChart';
import { CorrelationMatrix } from './CorrelationMatrix';

export function StageOutput({ result, runId, backtestResult, backtestStatus }) {
  const [activeTab, setActiveTab] = useState('frontier'); // frontier | backtest
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [manualWeights, setManualWeights] = useState({});

  useEffect(() => {
    if (result?.weights) {
      const initial = {};
      result.weights.forEach(w => {
        initial[w.ticker] = w.weight;
      });
      setManualWeights(initial);
      setIsAdjusting(false);
      setActiveTab('frontier');
    }
  }, [result, runId]);

  const rfRate = result?.rf_rate_used ?? 0.105;

  const handleWeightChange = (ticker, newValue) => {
    setManualWeights(prev => {
      const updated = { ...prev, [ticker]: newValue };
      
      const otherTickers = Object.keys(updated).filter(t => t !== ticker);
      const otherSum = otherTickers.reduce((sum, t) => sum + updated[t], 0);
      const remainingTarget = Math.max(0, 1.0 - newValue);
      
      if (otherSum > 0) {
        otherTickers.forEach(t => {
          updated[t] = (updated[t] / otherSum) * remainingTarget;
        });
      } else {
        otherTickers.forEach(t => {
          updated[t] = remainingTarget / otherTickers.length;
        });
      }
      
      // Force values to round properly to avoid floating precision drift
      Object.keys(updated).forEach(k => {
        updated[k] = Math.round(updated[k] * 1000000) / 1000000;
      });
      
      return updated;
    });
  };

  const customMetrics = useMemo(() => {
    if (!isAdjusting || !result?.asset_returns || !result?.covariance) return null;
    
    let expectedReturn = 0;
    let variance = 0;
    const tickersList = Object.keys(manualWeights);
    
    tickersList.forEach(t1 => {
      const w1 = manualWeights[t1] || 0;
      const r1 = result.asset_returns[t1] || 0;
      expectedReturn += w1 * r1;
      
      tickersList.forEach(t2 => {
        const w2 = manualWeights[t2] || 0;
        const covVal = result.covariance[t1]?.[t2] || 0;
        variance += w1 * w2 * covVal;
      });
    });
    
    const volatility = Math.sqrt(variance);
    const sharpeRatio = volatility > 0 ? (expectedReturn - rfRate) / volatility : 0;
    
    return {
      expected_return: expectedReturn,
      volatility,
      sharpe_ratio: sharpeRatio
    };
  }, [isAdjusting, manualWeights, result, rfRate]);

  if (!result) return null;

  const displayReturn = isAdjusting && customMetrics ? customMetrics.expected_return : result.expected_return;
  const displayVolatility = isAdjusting && customMetrics ? customMetrics.volatility : result.volatility;
  const displaySharpe = isAdjusting && customMetrics ? customMetrics.sharpe_ratio : result.sharpe_ratio;
  const lowSharpe = displaySharpe < 0.5;

  const exportResult = {
    ...result,
    weights: result.weights.map(w => ({
      ...w,
      weight: isAdjusting ? (manualWeights[w.ticker] ?? w.weight) : w.weight,
      contribution_to_return: isAdjusting ? (manualWeights[w.ticker] ?? w.weight) * (result.asset_returns?.[w.ticker] ?? 0) : w.contribution_to_return
    })),
    expected_return: displayReturn,
    volatility: displayVolatility,
    sharpe_ratio: displaySharpe
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <StageShell number="03" label="OUTPUT" id="stage-output">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            {/* View Switcher Tabs */}
            <div className="flex border border-nb-border mb-4 font-mono text-[9px] tracking-widest bg-nb-bg">
              <button 
                onClick={() => setActiveTab('frontier')}
                className={`flex-1 py-2 text-center transition-colors border-r border-nb-border ${
                  activeTab === 'frontier' ? 'bg-nb-surface text-nb-cyan font-bold' : 'text-nb-muted hover:text-nb-text'
                }`}
              >
                FRONTIER
              </button>
              <button 
                onClick={() => setActiveTab('correlation')}
                className={`flex-1 py-2 text-center transition-colors border-r border-nb-border ${
                  activeTab === 'correlation' ? 'bg-nb-surface text-nb-cyan font-bold' : 'text-nb-muted hover:text-nb-text'
                }`}
              >
                CORRELATION
              </button>
              <button 
                onClick={() => setActiveTab('backtest')}
                className={`flex-1 py-2 text-center transition-colors ${
                  activeTab === 'backtest' ? 'bg-nb-surface text-nb-cyan font-bold' : 'text-nb-muted hover:text-nb-text'
                }`}
              >
                BACKTEST
              </button>
            </div>

            {activeTab === 'frontier' && (
              <FrontierChart 
                result={result} 
                customPoint={isAdjusting && customMetrics ? { vol: displayVolatility, ret: displayReturn } : null}
              />
            )}
            {activeTab === 'correlation' && (
              <CorrelationMatrix result={result} />
            )}
            {activeTab === 'backtest' && (
              <div className="min-h-[260px]">
                {backtestStatus === 'loading' && (
                  <div className="h-[210px] flex flex-col items-center justify-center font-mono text-[10px] text-nb-muted gap-2">
                    <span className="animate-spin inline-block w-4 h-4 border border-nb-muted border-t-transparent rounded-full" />
                    <span>FETCHING BENCHMARK & SIMULATING...</span>
                  </div>
                )}
                {backtestStatus === 'error' && (
                  <div className="h-[210px] flex items-center justify-center font-mono text-[10px] text-nb-red">
                    ⚠ ERROR LOADNG BACKTEST DATA
                  </div>
                )}
                {backtestStatus === 'done' && backtestResult && (
                  <BacktestChart backtestResult={backtestResult} />
                )}
              </div>
            )}

            {result.sector_exposure && <SectorBreakdown sectors={result.sector_exposure} />}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <MetricCard label="EXP. RETURN" value={displayReturn * 100} runId={runId} />
              <MetricCard label="VOLATILITY"  value={displayVolatility * 100}      runId={runId} />
              <MetricCard label="SHARPE RATIO" value={displaySharpe} suffix="" runId={runId} isWarning={lowSharpe} />
            </div>

            {/* Adjust Weights Toggle Widget */}
            {result.asset_returns && result.covariance && (
              <div className="flex justify-between items-center border border-nb-border px-3 py-2 bg-nb-surface/40">
                <span className="font-mono text-[8px] tracking-widest text-nb-muted">SIMULATE MANUAL WEIGHTS</span>
                <button
                  onClick={() => {
                    if (isAdjusting) {
                      const initial = {};
                      result.weights.forEach(w => {
                        initial[w.ticker] = w.weight;
                      });
                      setManualWeights(initial);
                    }
                    setIsAdjusting(!isAdjusting);
                  }}
                  className={`font-mono text-[9px] px-2 py-1 border transition-all nb-pop-btn bg-nb-bg ${
                    isAdjusting 
                      ? 'border-nb-cyan text-nb-cyan bg-nb-cyan/10 font-bold shadow-[2px_2px_0px_0px_#00D4FF] -translate-x-0.5 -translate-y-0.5' 
                      : 'border-nb-border text-nb-muted hover:border-nb-border-bright hover:text-nb-text'
                  }`}
                >
                  {isAdjusting ? 'RESET OPTIMAL' : 'ADJUST'}
                </button>
              </div>
            )}

            <div className="space-y-2 pt-2">
              {result.weights.map((w, i) => (
                <WeightBar 
                  key={w.ticker} 
                  ticker={w.ticker} 
                  weight={isAdjusting ? (manualWeights[w.ticker] ?? w.weight) : w.weight} 
                  delay={i * 0.08} 
                  isAdjusting={isAdjusting}
                  onChange={handleWeightChange}
                />
              ))}
            </div>

            {result.tickers_dropped?.length > 0 && (
              <p className="font-mono text-[9px] text-nb-amber">
                ⚠ Dropped: {result.tickers_dropped.join(', ')} — insufficient history
              </p>
            )}

            <ExportButton result={exportResult} />
          </div>
        </div>
      </StageShell>
    </motion.div>
  );
}
