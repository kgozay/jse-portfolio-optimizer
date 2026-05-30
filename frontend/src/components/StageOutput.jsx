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
import { AttributionDonut } from './AttributionDonut';
import { RiskDecompositionBar } from './RiskDecompositionBar';
import { ComparisonPanel } from './ComparisonPanel';

const TABS = [
  { key: 'frontier',    label: 'FRONTIER' },
  { key: 'correlation', label: 'CORRELATION' },
  { key: 'backtest',    label: 'BACKTEST' },
  { key: 'attribution', label: 'ATTRIBUTION' },
];

const SECTOR_MAP = {
  // Consumer Discretionary
  "MRP": "Consumer Discretionary", "TFG": "Consumer Discretionary",
  "TRU": "Consumer Discretionary", "BID": "Consumer Discretionary",
  "PPH": "Consumer Discretionary", "MCG": "Consumer Discretionary",
  "SUI": "Consumer Discretionary", "TSG": "Consumer Discretionary",
  "CLH": "Consumer Discretionary",

  // Consumer Staples
  "SHP": "Consumer Staples", "PIK": "Consumer Staples",
  "WHL": "Consumer Staples", "DCP": "Consumer Staples",
  "CLS": "Consumer Staples", "SPAR": "Consumer Staples",
  "RCL": "Consumer Staples", "RFG": "Consumer Staples",
  "OCE": "Consumer Staples", "AVI": "Consumer Staples",
  "TBS": "Consumer Staples",

  // Financials
  "SBK": "Financials", "FSR": "Financials", "NED": "Financials",
  "ABG": "Financials", "DSY": "Financials", "SLM": "Financials",
  "CPI": "Financials", "REM": "Financials", "OML": "Financials",
  "OMU": "Financials", "OUT": "Financials", "INP": "Financials",
  "INL": "Financials", "MCF": "Financials", "PMG": "Financials",
  "PSG": "Financials", "JSE": "Financials", "SNT": "Financials",

  // Resources
  "AGL": "Resources", "BHP": "Resources", "SOL": "Resources",
  "SAP": "Resources", "SSW": "Resources", "IMP": "Resources",
  "GFI": "Resources", "HAR": "Resources", "AMS": "Resources",
  "EXX": "Resources", "KIO": "Resources", "CFR": "Resources",
  "ANG": "Resources", "GLN": "Resources", "ARI": "Resources",
  "DGC": "Resources", "PAN": "Resources", "THA": "Resources",
  "MER": "Resources", "REN": "Resources", "AFT": "Resources",

  // Industrials
  "BTI": "Industrials", "APN": "Industrials", "BVT": "Industrials",
  "MNP": "Industrials", "PPC": "Industrials", "RLO": "Industrials",
  "KAP": "Industrials", "SPG": "Industrials", "MOT": "Industrials",
  "ZED": "Industrials", "ADH": "Industrials", "CUR": "Industrials",
  "LHS": "Industrials", "NTC": "Industrials",

  // Technology
  "NPN": "Technology", "PRX": "Technology", "KST": "Technology",
  "ALH": "Technology", "BYI": "Technology",

  // Telecommunications
  "MTN": "Telecommunications", "VOD": "Telecommunications",
  "TKG": "Telecommunications", "BLU": "Telecommunications",

  // Real Estate
  "GRT": "Real Estate", "RDF": "Real Estate", "NEPI": "Real Estate",
  "RES": "Real Estate", "HYP": "Real Estate", "VKE": "Real Estate",
  "ATT": "Real Estate", "EQU": "Real Estate",
};

export function StageOutput({ result, runId, backtestResult, backtestStatus, isActive, benchmark, setBenchmark }) {
  const [activeTab, setActiveTab] = useState('frontier'); // frontier | correlation | backtest | attribution
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [manualWeights, setManualWeights] = useState({});
  const [savedRuns, setSavedRuns] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('jse_saved_runs') || '[]');
    } catch {
      return [];
    }
  });

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

  const handleFrontierClick = (clickedWeights) => {
    const updated = {};
    result.weights.forEach(w => {
      updated[w.ticker] = clickedWeights[w.ticker] ?? 0.0;
    });
    setManualWeights(updated);
    setIsAdjusting(true);
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
    
    // Recalculate component contribution to risk dynamically
    const contributions_to_risk = {};
    if (riskValue > 0) {
      tickersList.forEach(t1 => {
        const w1 = manualWeights[t1] || 0;
        let covSum = 0;
        tickersList.forEach(t2 => {
          const w2 = manualWeights[t2] || 0;
          covSum += w2 * (riskMatrix[t1]?.[t2] || 0);
        });
        contributions_to_risk[t1] = (w1 * covSum) / riskValue;
      });
    }
    
    return {
      expected_return: expectedReturn,
      risk_value: riskValue,
      ratio: ratio,
      contributions_to_risk
    };
  }, [isAdjusting, manualWeights, result, rfRate]);

  const hhi = useMemo(() => {
    const weightsList = isAdjusting
      ? Object.values(manualWeights)
      : result ? result.weights.map(w => w.weight) : [];
    return weightsList.reduce((sum, w) => sum + w * w, 0);
  }, [result, manualWeights, isAdjusting]);

  const displaySectorExposure = useMemo(() => {
    if (!result?.weights) return [];
    
    const weightsToUse = isAdjusting
      ? result.weights.map(w => ({
          ticker: w.ticker,
          weight: manualWeights[w.ticker] ?? w.weight
        }))
      : result.weights;

    const exposureMap = {};
    weightsToUse.forEach(w => {
      const sector = SECTOR_MAP[w.ticker] || 'Other';
      exposureMap[sector] = (exposureMap[sector] || 0) + w.weight;
    });

    return Object.entries(exposureMap)
      .map(([sector, weight]) => ({ sector, weight: Math.max(0, Math.min(1, weight)) }))
      .sort((a, b) => b.weight - a.weight);
  }, [isAdjusting, manualWeights, result]);

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
      contribution_to_return: isAdjusting ? (manualWeights[w.ticker] ?? w.weight) * (result.asset_returns?.[w.ticker] ?? 0) : w.contribution_to_return,
      contribution_to_risk: isAdjusting && customMetrics?.contributions_to_risk
        ? (customMetrics.contributions_to_risk[w.ticker] ?? 0)
        : w.contribution_to_risk
    })),
    expected_return: displayReturn,
    volatility: displayVolatility,
    downside_risk: displayDownsideRisk,
    sharpe_ratio: displaySharpe,
    sortino_ratio: displaySortino,
    sector_exposure: displaySectorExposure
  };

  const handleSaveRun = () => {
    const run = {
      result: exportResult,
      backtestResult,
      timestamp: Date.now(),
      label: `RUN ${savedRuns.length + 1}`,
    };
    const updated = [...savedRuns.slice(-1), run]; // keep max 2 runs (FIFO)
    setSavedRuns(updated);
    localStorage.setItem('jse_saved_runs', JSON.stringify(updated));
  };

  const handleClearRuns = () => {
    setSavedRuns([]);
    localStorage.removeItem('jse_saved_runs');
  };

  const handleRenameRun = (index, newLabel) => {
    const updated = [...savedRuns];
    if (updated[index]) {
      updated[index] = { ...updated[index], label: newLabel };
      setSavedRuns(updated);
      localStorage.setItem('jse_saved_runs', JSON.stringify(updated));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <StageShell number="03" label="OUTPUT" id="stage-output" isActive={isActive}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            {/* View Switcher Tabs & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div role="tablist" aria-label="Portfolio analysis views" className="flex-1 flex border border-nb-border font-mono text-[9px] tracking-wider bg-nb-bg">
                {TABS.map(({ key, label }, i) => (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={activeTab === key}
                    aria-controls={`tabpanel-${key}`}
                    onClick={() => setActiveTab(key)}
                    className={`flex-grow flex-shrink flex-1 py-3 text-center min-w-0 overflow-hidden text-ellipsis whitespace-nowrap transition-colors ${
                      i < TABS.length - 1 ? 'border-r border-nb-border' : ''
                    } ${
                      activeTab === key
                        ? 'text-nb-cyan font-bold border-b-2 border-b-nb-cyan bg-nb-surface/60'
                        : 'text-nb-muted hover:text-nb-text'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              
              <button
                onClick={handleSaveRun}
                className={`font-mono text-[9px] tracking-widest px-3 py-1.5 border transition-all nb-pop-btn bg-nb-bg shrink-0 ${
                  savedRuns.length === 1
                    ? 'border-nb-amber text-nb-amber'
                    : savedRuns.length === 2
                    ? 'border-nb-muted text-nb-muted hover:text-nb-text'
                    : 'border-nb-border text-nb-muted hover:text-nb-text'
                }`}
              >
                {savedRuns.length === 0 && 'SAVE RUN'}
                {savedRuns.length === 1 && '+ SAVE & COMPARE'}
                {savedRuns.length === 2 && `REPLACE ${savedRuns[0].label}`}
              </button>
            </div>

            {activeTab === 'frontier' && (
              <FrontierChart 
                result={result} 
                customPoint={isAdjusting && customMetrics ? { 
                  vol: isSortino ? displayDownsideRisk : displayVolatility, 
                  ret: displayReturn 
                } : null}
                onFrontierClick={handleFrontierClick}
              />
            )}
            {activeTab === 'correlation' && (
              <CorrelationMatrix result={result} />
            )}
            {activeTab === 'backtest' && (
              <div className="min-h-[340px] space-y-4 animate-fade">
                {/* Benchmark Selection Bar */}
                <div className="flex justify-between items-center border border-nb-border px-3 py-2 bg-nb-surface/40">
                  <span className="font-mono text-[10px] tracking-widest text-nb-muted uppercase font-bold">SELECT BENCHMARK</span>
                  <select
                    value={benchmark}
                    onChange={(e) => setBenchmark(e.target.value)}
                    className="bg-nb-bg border border-nb-border font-mono text-[9px] text-nb-text px-2 py-0.5 outline-none focus:border-nb-cyan"
                  >
                    <option value="J203">JSE TOP 40 INDEX (J203)</option>
                    <option value="J200">JSE ALL SHARE INDEX (J200)</option>
                    <option value="EQUAL_WEIGHT">EQUAL-WEIGHTED (1/N)</option>
                  </select>
                </div>

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
            {activeTab === 'attribution' && (
              <div className="space-y-6 animate-fade">
                <AttributionDonut weights={exportResult.weights} />
                <div className="border-t border-nb-border pt-6">
                  <RiskDecompositionBar weights={exportResult.weights} />
                </div>
              </div>
            )}

            {displaySectorExposure.length > 0 && <SectorBreakdown sectors={displaySectorExposure} />}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <MetricCard
                label="EXP. RETURN"
                value={displayReturn * 100}
                runId={runId}
                ariaLabel={`Expected annual return: ${(displayReturn * 100).toFixed(2)}%`}
              />
              <MetricCard 
                label={isSortino ? "DOWNSIDE RISK" : "VOLATILITY"}  
                value={(isSortino ? displayDownsideRisk : displayVolatility) * 100}      
                runId={runId}
                ariaLabel={`${isSortino ? 'Expected downside risk' : 'Expected volatility'}: ${((isSortino ? displayDownsideRisk : displayVolatility) * 100).toFixed(2)}%`}
              />
              <MetricCard 
                label={isSortino ? "SORTINO RATIO" : "SHARPE RATIO"} 
                value={isSortino ? displaySortino : displaySharpe} 
                suffix="" 
                runId={runId} 
                isWarning={lowRatio}
                ariaLabel={`${isSortino ? 'Sortino ratio' : 'Sharpe ratio'}: ${(isSortino ? displaySortino : displaySharpe).toFixed(3)}`}
              />
            </div>

            {/* Advanced Risk Metrics Panel */}
            <div className="border border-nb-border p-4 bg-nb-surface/10 space-y-4">
              <div className="font-mono text-[10px] tracking-widest text-nb-muted uppercase font-bold">RISK METRICS</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-1">
                  <div className="font-mono text-[9px] text-nb-dim uppercase tracking-wide">Daily Loss Threshold</div>
                  <div className="font-mono text-base text-nb-text font-bold">
                    {result.var_value !== undefined ? `${(result.var_value * 100).toFixed(2)}%` : 'N/A'}
                  </div>
                  <div className="font-mono text-[11px] text-nb-dim">worst loss on a typical bad day (95%)</div>
                </div>
                <div className="space-y-1">
                  <div className="font-mono text-[9px] text-nb-dim uppercase tracking-wide">Avg Loss in Bad Days</div>
                  <div className="font-mono text-base text-nb-text font-bold">
                    {result.cvar_value !== undefined ? `${(result.cvar_value * 100).toFixed(2)}%` : 'N/A'}
                  </div>
                  <div className="font-mono text-[11px] text-nb-dim">average loss on the worst 5% of days</div>
                </div>
                <div className="space-y-1">
                  <div className="font-mono text-[9px] text-nb-dim uppercase tracking-wide">Market Sensitivity (β)</div>
                  <div className="font-mono text-base text-nb-cyan font-bold">
                    {backtestResult?.beta != null ? backtestResult.beta.toFixed(2) : 'N/A'}
                  </div>
                  <div className="font-mono text-[11px] text-nb-dim">how much portfolio moves vs. the JSE</div>
                </div>
                <div className="space-y-1">
                  <div className="font-mono text-[9px] text-nb-dim uppercase tracking-wide">Diversification Score</div>
                  <div className={`font-mono text-base font-bold ${
                    hhi <= 0.15 ? 'text-nb-emerald' : hhi >= 0.25 ? 'text-nb-amber' : 'text-nb-text'
                  }`}>
                    {hhi.toFixed(3)}
                    <span className="font-mono text-[9px] font-normal ml-2">
                      {hhi <= 0.15 ? '— well spread' : hhi >= 0.25 ? '— concentrated' : '— moderate'}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-nb-dim">lower = more diversified (ideal &lt; 0.15)</div>
                </div>
              </div>
            </div>

            {/* Adjust Weights Toggle Widget */}
            {result.asset_returns && result.covariance && (
              <div className="flex justify-between items-center border border-nb-border px-3 py-2.5 bg-nb-surface/40">
                <span className="font-mono text-[10px] tracking-widest text-nb-muted font-bold">ADJUST WEIGHTS MANUALLY</span>
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
                  className={`font-mono text-[10px] px-2.5 py-1 border transition-all nb-pop-btn bg-nb-bg ${
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
              <div className="border border-nb-amber p-3 mt-2">
                <p className="font-mono text-[10px] text-nb-amber tracking-widest mb-1.5 font-bold">
                  ⚠ TICKERS DROPPED
                </p>
                <p className="font-mono text-[10px] text-nb-amber/70 leading-relaxed">
                  {result.tickers_dropped.join(', ')} — insufficient price history
                  (&lt;252 trading days). Optimisation ran on remaining {result.weights
                    ? result.weights.length
                    : 'available'} tickers.
                </p>
              </div>
            )}

            <ExportButton result={exportResult} />
          </div>
        </div>

        {savedRuns.length === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-6 border-t border-nb-border pt-6"
          >
            <ComparisonPanel
              savedRuns={savedRuns}
              onClear={handleClearRuns}
              onRenameRun={handleRenameRun}
            />
          </motion.div>
        )}
      </StageShell>
    </motion.div>
  );
}

