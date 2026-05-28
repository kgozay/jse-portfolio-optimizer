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
    if (!isAdjusting || !result?.asset_returns) return null;
    
    const isSortino = result.objective === 'max_sortino';
    const riskMatrix = isSortino ? (result.semicovariance || result.covariance) : result.covariance;
    
    if (!riskMatrix) return null;
    
    let expectedReturn = 0;
    let variance = 0;
    const tickersList = Object.keys(manualWeights);
    
    tickersList.forEach(t1 => {
      const w1 = manualWeights[t1] || 0;
      const r1 = result.asset_returns[t1] || 0;
      expectedReturn += w1 * r1;
      
      tickersList.forEach(t2 => {
        const w2 = manualWeights[t2] || 0;
        const covVal = riskMatrix[t1]?.[t2] || 0;
        variance += w1 * w2 * covVal;
      });
    });
    
    const riskValue = Math.sqrt(variance);
    const ratio = riskValue > 0 ? (expectedReturn - rfRate) / riskValue : 0;
    
    return {
      expected_return: expectedReturn,
      risk_value: riskValue,
      ratio: ratio
    };
  }, [isAdjusting, manualWeights, result, rfRate]);

  if (!result) return null;

  const isSortino = result.objective === 'max_sortino';

  const displayReturn = isAdjusting && customMetrics ? customMetrics.expected_return : result.expected_return;
  
  const displayVolatility = isAdjusting && customMetrics 
    ? (isSortino ? result.volatility : customMetrics.risk_value)
    : result.volatility;
    
  const displayDownsideRisk = isAdjusting && customMetrics
    ? (isSortino ? customMetrics.risk_value : (result.downside_risk ?? 0))
    : (result.downside_risk ?? 0);

  const displaySharpe = isAdjusting && customMetrics
    ? (isSortino ? result.sharpe_ratio : customMetrics.ratio)
    : result.sharpe_ratio;

  const displaySortino = isAdjusting && customMetrics
    ? (isSortino ? customMetrics.ratio : (result.sortino_ratio ?? 0))
    : (result.sortino_ratio ?? 0);

  const lowRatio = isSortino ? displaySortino < 0.7 : displaySharpe < 0.5;

  const exportResult = {
    ...result,
    weights: result.weights.map(w => ({
      ...w,
      weight: isAdjusting ? (manualWeights[w.ticker] ?? w.weight) : w.weight,
      contribution_to_return: isAdjusting ? (manualWeights[w.ticker] ?? w.weight) * (result.asset_returns?.[w.ticker] ?? 0) : w.contribution_to_return
    })),
    expected_return: displayReturn,
    volatility: displayVolatility,
    downside_risk: displayDownsideRisk,
    sharpe_ratio: displaySharpe,
    sortino_ratio: displaySortino
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
                customPoint={isAdjusting && customMetrics ? { 
                  vol: isSortino ? displayDownsideRisk : displayVolatility, 
                  ret: displayReturn 
                } : null}
              />
            )}
            {activeTab === 'correlation' && (
              <CorrelationMatrix result={result} />
            )}
            {activeTab === 'backtest' && (
              <div className="min-h-[340px]">
                {backtestStatus === 'loading' && (
                  <div className="h-[280px] flex flex-col items-center justify-center font-mono text-[10px] text-nb-muted gap-2">
                    <span className="animate-spin inline-block w-4 h-4 border border-nb-muted border-t-transparent rounded-full" />
                    <span>FETCHING BENCHMARK & SIMULATING...</span>
                  </div>
                )}
                {backtestStatus === 'error' && (
                  <div className="h-[280px] flex items-center justify-center font-mono text-[10px] text-nb-red">
                    ⚠ ERROR LOADING BACKTEST DATA
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
              <MetricCard 
                label={isSortino ? "DOWNSIDE RISK" : "VOLATILITY"}  
                value={(isSortino ? displayDownsideRisk : displayVolatility) * 100}      
                runId={runId} 
              />
              <MetricCard 
                label={isSortino ? "SORTINO RATIO" : "SHARPE RATIO"} 
                value={isSortino ? displaySortino : displaySharpe} 
                suffix="" 
                runId={runId} 
                isWarning={lowRatio} 
              />
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
              <div className="border border-nb-amber p-2.5 mt-2">
                <p className="font-mono text-[8px] text-nb-amber tracking-widest mb-1">
                  ⚠ WARNING — TICKERS DROPPED
                </p>
                <p className="font-mono text-[8px] text-nb-amber/70 leading-relaxed">
                  {result.tickers_dropped.join(', ')} — insufficient price history
                  (&lt; 252 trading days). Optimization ran on remaining {result.weights
                    ? result.weights.length
                    : 'available'} tickers.
                </p>
              </div>
            )}

            <ExportButton result={exportResult} />
          </div>
        </div>
      </StageShell>
    </motion.div>
  );
}
