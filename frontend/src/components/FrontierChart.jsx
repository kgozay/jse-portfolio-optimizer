import { useState, useEffect } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer
} from 'recharts';

function PortfolioTooltip({ active, payload, rfRate }) {
  if (!active || !payload?.length) return null;
  const { ret, vol, sharpe } = payload[0].payload;
  
  let computedSharpe = sharpe;
  if (computedSharpe === undefined && vol > 0) {
    const rf = rfRate ?? 0.105;
    computedSharpe = (ret - rf) / vol;
  }

  return (
    <div className="border-2 border-nb-border bg-nb-bg font-mono text-[10px] px-3 py-2">
      <div className="flex gap-3"><span className="text-nb-dim">RET</span><span className="text-nb-emerald">{(ret*100).toFixed(2)}%</span></div>
      <div className="flex gap-3"><span className="text-nb-dim">VOL</span><span className="text-nb-text">{(vol*100).toFixed(2)}%</span></div>
      <div className="flex gap-3">
        <span className="text-nb-dim">SR </span>
        <span className="text-nb-cyan">{computedSharpe !== undefined ? computedSharpe.toFixed(3) : 'N/A'}</span>
      </div>
    </div>
  );
}

export function FrontierChart({ result }) {
  const [visibleMcPoints, setVisibleMcPoints] = useState([]);

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
    <ResponsiveContainer width="100%" height={260}>
      <ScatterChart margin={{ top: 12, right: 12, bottom: 24, left: 36 }}>
        <CartesianGrid stroke="#191919" strokeDasharray="none" />
        <XAxis dataKey="vol" tickFormatter={v => `${(v*100).toFixed(0)}%`}
               tick={{ fill: '#404040', fontSize: 9, fontFamily: 'monospace' }} />
        <YAxis dataKey="ret" tickFormatter={v => `${(v*100).toFixed(0)}%`}
               tick={{ fill: '#404040', fontSize: 9, fontFamily: 'monospace' }} />
        <Tooltip content={<PortfolioTooltip rfRate={result?.rf_rate_used} />} />
        <ReferenceLine x={result.optimal_point.vol} stroke="rgba(0,200,83,0.25)" strokeDasharray="4 4" strokeWidth={0.75} />
        <ReferenceLine y={result.optimal_point.ret} stroke="rgba(0,200,83,0.25)" strokeDasharray="4 4" strokeWidth={0.75} />
        <Scatter data={visibleMcPoints} fill="rgba(0,190,220,0.22)" />
        <Scatter data={result.frontier} line={{ stroke: '#00D4FF', strokeWidth: 1.5 }} fill="none" />
        <Scatter data={[result.optimal_point]} fill="#00C853" />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
