import { useState, useEffect } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer
} from 'recharts';

function PortfolioTooltip({ active, payload, rfRate, isSortino }) {
  if (!active || !payload?.length) return null;
  const { ret, vol, sharpe, sortino } = payload[0].payload;
  
  let ratioVal = isSortino ? (sortino ?? sharpe) : (sharpe ?? sortino);
  if (ratioVal === undefined && vol > 0) {
    const rf = rfRate ?? 0.105;
    ratioVal = (ret - rf) / vol;
  }

  return (
    <div className="border-2 border-nb-border bg-nb-bg font-mono text-[10px] px-3 py-2 space-y-0.5">
      <div className="flex gap-3"><span className="text-nb-dim">RET</span><span className="text-nb-emerald">{(ret*100).toFixed(2)}%</span></div>
      <div className="flex gap-3">
        <span className="text-nb-dim">{isSortino ? 'DSK' : 'VOL'}</span>
        <span className="text-nb-text">{(vol*100).toFixed(2)}%</span>
      </div>
      <div className="flex gap-3">
        <span className="text-nb-dim">{isSortino ? 'SOR' : 'SR '}</span>
        <span className="text-nb-cyan">{ratioVal !== undefined ? ratioVal.toFixed(3) : 'N/A'}</span>
      </div>
    </div>
  );
}

export function FrontierChart({ result, customPoint }) {
  const [visibleMcPoints, setVisibleMcPoints] = useState([]);
  const isSortino = result?.objective === 'max_sortino';

  useEffect(() => {
    if (!result) return;
    setVisibleMcPoints([]);
    let i = 0;
    const BATCH = 60;
    const total = result.monte_carlo.length;
    const timer = setInterval(() => {
      setVisibleMcPoints(result.monte_carlo.slice(0, Math.min(i + BATCH, total)));
      i += BATCH;
      if (i >= total) clearInterval(timer);
    }, 40);
    return () => clearInterval(timer);
  }, [result]);

  return (
    <ResponsiveContainer width="100%" height={340}>
      <ScatterChart margin={{ top: 12, right: 12, bottom: 24, left: 36 }}>
        <CartesianGrid stroke="#191919" strokeDasharray="none" />
        <XAxis dataKey="vol" tickFormatter={v => `${(v*100).toFixed(0)}%`}
               tick={{ fill: '#404040', fontSize: 9, fontFamily: 'monospace' }} />
        <YAxis dataKey="ret" tickFormatter={v => `${(v*100).toFixed(0)}%`}
               tick={{ fill: '#404040', fontSize: 9, fontFamily: 'monospace' }} />
        <Tooltip content={<PortfolioTooltip rfRate={result?.rf_rate_used} isSortino={isSortino} />} />
        <ReferenceLine x={result.optimal_point.vol} stroke="rgba(0,200,83,0.25)" strokeDasharray="4 4" strokeWidth={0.75} />
        <ReferenceLine y={result.optimal_point.ret} stroke="rgba(0,200,83,0.25)" strokeDasharray="4 4" strokeWidth={0.75} />
        <Scatter data={visibleMcPoints} fill="rgba(0,190,220,0.22)" />
        <Scatter data={result.frontier} line={{ stroke: '#00D4FF', strokeWidth: 1.5 }} fill="none" />
        <Scatter data={[result.optimal_point]} fill="#00C853" />
        {customPoint && (
          <Scatter 
            data={[customPoint]} 
            fill="#FFB340"
            shape={(props) => {
              const { cx, cy } = props;
              if (cx === undefined || cy === undefined) return null;
              return (
                <g key="custom-sight">
                  <circle cx={cx} cy={cy} r={6} fill="#FFB340" stroke="#0C0C0D" strokeWidth={1.5} />
                  <circle cx={cx} cy={cy} r={1.5} fill="#0C0C0D" />
                </g>
              );
            }}
          />
        )}
      </ScatterChart>
    </ResponsiveContainer>
  );
}
