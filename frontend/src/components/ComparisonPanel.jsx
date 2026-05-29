import { useMemo, useState } from 'react';

export function ComparisonPanel({ savedRuns, onClear, onRenameRun }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState('');

  const run1 = savedRuns[0];
  const run2 = savedRuns[1];

  const formattedDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + d.toLocaleDateString([], { day: '2-digit', month: 'short' });
  };

  const calculateHhi = (weights) => {
    return weights.reduce((sum, w) => sum + w.weight * w.weight, 0);
  };

  const getSectorCount = (sectors) => {
    return sectors ? sectors.filter(s => s.weight > 0.0001).length : 0;
  };

  // Compare values and return color class
  const getComparisonColors = (v1, v2, higherIsBetter) => {
    if (v1 === v2) return { c1: 'text-nb-text', c2: 'text-nb-text' };
    const w1 = higherIsBetter ? v1 > v2 : v1 < v2;
    return {
      c1: w1 ? 'text-nb-emerald font-bold' : 'text-nb-amber',
      c2: w1 ? 'text-nb-amber' : 'text-nb-emerald font-bold',
    };
  };

  // Tickers list union
  const allTickers = useMemo(() => {
    if (!run1 || !run2) return [];
    const set = new Set();
    run1.result.weights.forEach(w => set.add(w.ticker));
    run2.result.weights.forEach(w => set.add(w.ticker));
    return Array.from(set).sort();
  }, [run1, run2]);

  if (!run1 || !run2) return null;

  const r1Hhi = calculateHhi(run1.result.weights);
  const r2Hhi = calculateHhi(run2.result.weights);

  const r1SectorCount = getSectorCount(run1.result.sector_exposure);
  const r2SectorCount = getSectorCount(run2.result.sector_exposure);

  // Colors for rows
  const returnColors = getComparisonColors(run1.result.expected_return, run2.result.expected_return, true);
  
  // Decide what risk metric is compared (standard volatility, unless both are max_sortino, then downside risk)
  const isBothSortino = run1.result.objective === 'max_sortino' && run2.result.objective === 'max_sortino';
  const risk1 = isBothSortino ? run1.result.downside_risk : run1.result.volatility;
  const risk2 = isBothSortino ? run2.result.downside_risk : run2.result.volatility;
  const riskLabel = isBothSortino ? 'DOWNSIDE RISK' : 'VOLATILITY';
  const riskColors = getComparisonColors(risk1, risk2, false);

  const ratio1 = isBothSortino ? run1.result.sortino_ratio : run1.result.sharpe_ratio;
  const ratio2 = isBothSortino ? run2.result.sortino_ratio : run2.result.sharpe_ratio;
  const ratioLabel = isBothSortino ? 'SORTINO RATIO' : 'SHARPE RATIO';
  const ratioColors = getComparisonColors(ratio1, ratio2, true);

  const mdd1 = run1.backtestResult?.max_drawdown_pct ?? 0;
  const mdd2 = run2.backtestResult?.max_drawdown_pct ?? 0;
  const mddColors = getComparisonColors(mdd1, mdd2, true); // less negative (higher number) is better

  const hhiColors = getComparisonColors(r1Hhi, r2Hhi, false);
  const sectorColors = getComparisonColors(r1SectorCount, r2SectorCount, true); // exposure across more sectors is generally diversified

  const startEdit = (idx, label) => {
    setEditingIndex(idx);
    setEditValue(label);
  };

  const saveEdit = (idx) => {
    if (editValue.trim()) {
      onRenameRun(idx, editValue.trim());
    }
    setEditingIndex(null);
  };

  return (
    <div className="relative border-2 border-nb-border p-4 bg-nb-surface/10 space-y-4">
      {/* Blueprint Corner Brackets */}
      <div className="absolute top-[-2px] left-[-2px] w-1.5 h-1.5 border-t-2 border-l-2 border-nb-cyan" />
      <div className="absolute top-[-2px] right-[-2px] w-1.5 h-1.5 border-t-2 border-r-2 border-nb-cyan" />
      <div className="absolute bottom-[-2px] left-[-2px] w-1.5 h-1.5 border-b-2 border-l-2 border-nb-cyan" />
      <div className="absolute bottom-[-2px] right-[-2px] w-1.5 h-1.5 border-b-2 border-r-2 border-nb-cyan" />

      {/* Header */}
      <div className="flex justify-between items-center border-b border-nb-border pb-2">
        <span className="font-mono text-xs tracking-widest text-nb-cyan font-bold uppercase">
          PORTFOLIO COMPARISON
        </span>
        <button
          onClick={onClear}
          className="font-mono text-[9px] px-2 py-1 border border-nb-red/40 text-nb-red bg-nb-bg hover:bg-nb-red/5 hover:border-nb-red transition-colors nb-pop-btn"
        >
          CLEAR COMPARISON
        </button>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-7 gap-4 items-start pt-2">
        {/* Run A Column */}
        <div className="col-span-3 space-y-2 border-r border-nb-border/40 pr-2">
          {editingIndex === 0 ? (
            <div className="flex gap-1.5 items-center">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => saveEdit(0)}
                onKeyDown={(e) => e.key === 'Enter' && saveEdit(0)}
                className="bg-nb-bg border border-nb-cyan font-mono text-xs px-1 text-nb-text w-full outline-none"
                autoFocus
              />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 cursor-pointer hover:text-nb-cyan" onClick={() => startEdit(0, run1.label)}>
              <span className="font-mono text-xs font-bold text-nb-text uppercase tracking-wide border-b border-dashed border-nb-dim">
                {run1.label}
              </span>
              <svg className="w-2.5 h-2.5 text-nb-muted fill-current" viewBox="0 0 24 24">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </div>
          )}
          <div className="font-mono text-[9px] text-nb-dim">{formattedDate(run1.timestamp)}</div>
          <div className="space-y-1 pt-1 font-mono text-[9px] text-nb-muted">
            <div>Target: <span className="text-nb-text">{run1.result.objective.replace('_', ' ').toUpperCase()}</span></div>
            <div>Period: <span className="text-nb-text">{run1.result.period_used}</span></div>
            <div>Rf rate: <span className="text-nb-text">{(run1.result.rf_rate_used * 100).toFixed(2)}%</span></div>
          </div>
        </div>

        {/* VS Spacer */}
        <div className="col-span-1 flex flex-col items-center justify-center h-full pt-4">
          <span className="font-mono text-[10px] text-nb-dim font-bold tracking-widest">VS</span>
        </div>

        {/* Run B Column */}
        <div className="col-span-3 space-y-2 pl-2">
          {editingIndex === 1 ? (
            <div className="flex gap-1.5 items-center">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => saveEdit(1)}
                onKeyDown={(e) => e.key === 'Enter' && saveEdit(1)}
                className="bg-nb-bg border border-nb-cyan font-mono text-xs px-1 text-nb-text w-full outline-none"
                autoFocus
              />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 cursor-pointer hover:text-nb-cyan" onClick={() => startEdit(1, run2.label)}>
              <span className="font-mono text-xs font-bold text-nb-text uppercase tracking-wide border-b border-dashed border-nb-dim">
                {run2.label}
              </span>
              <svg className="w-2.5 h-2.5 text-nb-muted fill-current" viewBox="0 0 24 24">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </div>
          )}
          <div className="font-mono text-[9px] text-nb-dim">{formattedDate(run2.timestamp)}</div>
          <div className="space-y-1 pt-1 font-mono text-[9px] text-nb-muted">
            <div>Target: <span className="text-nb-text">{run2.result.objective.replace('_', ' ').toUpperCase()}</span></div>
            <div>Period: <span className="text-nb-text">{run2.result.period_used}</span></div>
            <div>Rf rate: <span className="text-nb-text">{(run2.result.rf_rate_used * 100).toFixed(2)}%</span></div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Key Metrics Table */}
      <div className="border border-nb-border bg-nb-surface/40 px-3 py-1 mt-4">
        {/* Table Rows */}
        <div className="grid grid-cols-7 py-2 border-b border-nb-border/40 font-mono text-[9px] text-nb-muted uppercase font-bold tracking-wider">
          <div className="col-span-3 text-left">METRIC</div>
          <div className="col-span-2 text-right">{run1.label}</div>
          <div className="col-span-2 text-right">{run2.label}</div>
        </div>

        {/* Expected Return Row */}
        <div className="grid grid-cols-7 py-2 border-b border-nb-border/30 items-center font-mono text-[10px]">
          <div className="col-span-3 text-nb-muted">Expected Annual Return</div>
          <div className={`col-span-2 text-right ${returnColors.c1}`}>
            +{(run1.result.expected_return * 100).toFixed(2)}%
          </div>
          <div className={`col-span-2 text-right ${returnColors.c2}`}>
            +{(run2.result.expected_return * 100).toFixed(2)}%
          </div>
        </div>

        {/* Risk Row */}
        <div className="grid grid-cols-7 py-2 border-b border-nb-border/30 items-center font-mono text-[10px]">
          <div className="col-span-3 text-nb-muted">{riskLabel}</div>
          <div className={`col-span-2 text-right ${riskColors.c1}`}>
            {(risk1 * 100).toFixed(2)}%
          </div>
          <div className={`col-span-2 text-right ${riskColors.c2}`}>
            {(risk2 * 100).toFixed(2)}%
          </div>
        </div>

        {/* Ratio Row */}
        <div className="grid grid-cols-7 py-2 border-b border-nb-border/30 items-center font-mono text-[10px]">
          <div className="col-span-3 text-nb-muted">{ratioLabel}</div>
          <div className={`col-span-2 text-right ${ratioColors.c1}`}>
            {ratio1.toFixed(3)}
          </div>
          <div className={`col-span-2 text-right ${ratioColors.c2}`}>
            {ratio2.toFixed(3)}
          </div>
        </div>

        {/* Max DD Row */}
        <div className="grid grid-cols-7 py-2 border-b border-nb-border/30 items-center font-mono text-[10px]">
          <div className="col-span-3 text-nb-muted">Max Backtest Drawdown</div>
          <div className={`col-span-2 text-right ${mddColors.c1}`}>
            {mdd1.toFixed(2)}%
          </div>
          <div className={`col-span-2 text-right ${mddColors.c2}`}>
            {mdd2.toFixed(2)}%
          </div>
        </div>

        {/* HHI Diversification Row */}
        <div className="grid grid-cols-7 py-2 border-b border-nb-border/30 items-center font-mono text-[10px]">
          <div className="col-span-3 text-nb-muted">Concentration Score (HHI)</div>
          <div className={`col-span-2 text-right ${hhiColors.c1}`}>
            {r1Hhi.toFixed(3)}
          </div>
          <div className={`col-span-2 text-right ${hhiColors.c2}`}>
            {r2Hhi.toFixed(3)}
          </div>
        </div>

        {/* Sector Count Row */}
        <div className="grid grid-cols-7 py-2 items-center font-mono text-[10px]">
          <div className="col-span-3 text-nb-muted">Active Sector Count</div>
          <div className={`col-span-2 text-right ${sectorColors.c1}`}>
            {r1SectorCount}
          </div>
          <div className={`col-span-2 text-right ${sectorColors.c2}`}>
            {r2SectorCount}
          </div>
        </div>
      </div>

      {/* Comparative Weight Allocations Chart */}
      <div className="space-y-2 mt-4">
        <div className="font-mono text-[9px] tracking-widest text-nb-muted font-bold uppercase border-b border-nb-border pb-1">
          WEIGHT ALLOCATION COMPARISON
        </div>

        <div className="max-h-60 overflow-y-auto pr-1 space-y-1">
          {allTickers.map((ticker) => {
            const w1 = run1.result.weights.find(w => w.ticker === ticker)?.weight ?? 0;
            const w2 = run2.result.weights.find(w => w.ticker === ticker)?.weight ?? 0;

            return (
              <div key={ticker} className="grid grid-cols-7 items-center gap-2 py-1 border-b border-nb-border/10 last:border-b-0">
                {/* Run A Weight & Bar (Right-aligned) */}
                <div className="col-span-3 flex items-center justify-end gap-2">
                  <span className="font-mono text-[10px] text-nb-text">
                    {w1 > 0 ? `${(w1 * 100).toFixed(1)}%` : '—'}
                  </span>
                  <div className="w-16 sm:w-24 bg-nb-surface h-1.5 relative overflow-hidden flex justify-end">
                    {w1 > 0 && (
                      <div
                        className="bg-nb-emerald h-full"
                        style={{ width: `${w1 * 100}%` }}
                      />
                    )}
                  </div>
                </div>

                {/* Ticker Name */}
                <div className="col-span-1 text-center font-mono text-[10px] font-bold text-nb-muted">
                  {ticker}
                </div>

                {/* Run B Weight & Bar (Left-aligned) */}
                <div className="col-span-3 flex items-center justify-start gap-2">
                  <div className="w-16 sm:w-24 bg-nb-surface h-1.5 relative overflow-hidden flex justify-start">
                    {w2 > 0 && (
                      <div
                        className="bg-nb-cyan h-full"
                        style={{ width: `${w2 * 100}%` }}
                      />
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-nb-text">
                    {w2 > 0 ? `${(w2 * 100).toFixed(1)}%` : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
