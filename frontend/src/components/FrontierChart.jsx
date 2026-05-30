import { useState, useEffect } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer
} from 'recharts';
import { C } from '../lib/colours';

function PortfolioTooltip({ active, payload, rfRate, isSortino }) {
  if (!active || !payload?.length) return null;
  const { ret, vol, sharpe, sortino, ticker } = payload[0].payload;
  
  // If it's an individual asset point
  if (ticker) {
    return (
      <div className="border-2 border-nb-border bg-nb-bg font-mono text-[10px] px-3 py-2 space-y-0.5">
        <div className="text-nb-cyan font-bold border-b border-nb-border pb-1 mb-1">{ticker}.JO</div>
        <div className="flex gap-3"><span className="text-nb-dim">EXP. RET</span><span className="text-nb-emerald">{(ret*100).toFixed(2)}%</span></div>
        <div className="flex gap-3"><span className="text-nb-dim">RISK</span><span className="text-nb-text">{(vol*100).toFixed(2)}%</span></div>
      </div>
    );
  }

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

export function FrontierChart({ result, customPoint, onFrontierClick }) {
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
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={340}>
        <ScatterChart margin={{ top: 12, right: 12, bottom: 24, left: 16 }}>
          <CartesianGrid stroke={C.grid} strokeDasharray="none" />
          <XAxis
            type="number"
            dataKey="vol"
            name="Risk"
            tickFormatter={v => `${(v*100).toFixed(0)}%`}
            tick={{ fill: C.axis, fontSize: 9, fontFamily: 'monospace' }}
            domain={['auto', 'auto']}
            label={{ value: isSortino ? 'DOWNSIDE RISK (SEMI-DEVIATION)' : 'VOLATILITY (STANDARD DEVIATION)', position: 'insideBottom', offset: -10, fill: C.axis, fontSize: 9, fontFamily: 'monospace', tracking: '0.05em' }}
          />
          <YAxis
            type="number"
            dataKey="ret"
            name="Expected Return"
            tickFormatter={v => `${(v*100).toFixed(0)}%`}
            tick={{ fill: C.axis, fontSize: 9, fontFamily: 'monospace' }}
            domain={['auto', 'auto']}
            label={{ value: 'EXPECTED ANNUAL RETURN', angle: -90, position: 'insideLeft', offset: 0, fill: C.axis, fontSize: 9, fontFamily: 'monospace', tracking: '0.05em' }}
          />
          <Tooltip cursor={{ stroke: C.cyan, strokeWidth: 0.75, strokeDasharray: '3 3' }} content={<PortfolioTooltip rfRate={result?.rf_rate_used} isSortino={isSortino} />} />

          {/* Crosshairs for Optimal Point */}
          <ReferenceLine x={result.optimal_point.vol} stroke={C.emeraldRef} strokeDasharray="3 3" strokeWidth={0.75} />
          <ReferenceLine y={result.optimal_point.ret} stroke={C.emeraldRef} strokeDasharray="3 3" strokeWidth={0.75} />

          {/* Simulated Monte Carlo points */}
          <Scatter data={visibleMcPoints} fill={C.mcFill} isAnimationActive={false} />
          
          {/* Efficient Frontier Curve - Clickable */}
          <Scatter
            data={result.frontier}
            line={{ stroke: C.cyan, strokeWidth: 2 }}
            fill="none"
            onClick={(e) => {
              if (e && e.activePayload && e.activePayload.length) {
                const clickedPoint = e.activePayload[0].payload;
                if (onFrontierClick && clickedPoint.weights) {
                  onFrontierClick(clickedPoint.weights);
                }
              }
            }}
            style={{ cursor: 'pointer' }}
          />
          
          {/* Individual Stock Points */}
          <Scatter
            data={result.asset_points}
            fill={C.redAlt}
            shape={(props) => {
              const { cx, cy, payload } = props;
              if (cx === undefined || cy === undefined) return null;
              return (
                <g key={`asset-${payload.ticker}`}>
                  <circle cx={cx} cy={cy} r={4.5} fill={C.redAlt} stroke={C.bg} strokeWidth={1} />
                  <text
                    x={cx + 6}
                    y={cy + 3}
                    fill={C.axis}
                    fontSize={9}
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {payload.ticker}
                  </text>
                </g>
              );
            }}
          />

          {/* Optimal Portfolio Point */}
          <Scatter data={[result.optimal_point]} fill={C.emerald} />

          {/* Custom Point Sight */}
          {customPoint && (
            <Scatter
              data={[customPoint]}
              fill={C.amber}
              shape={(props) => {
                const { cx, cy } = props;
                if (cx === undefined || cy === undefined) return null;
                return (
                  <g key="custom-sight">
                    <circle cx={cx} cy={cy} r={7} fill={C.amber} stroke={C.bg} strokeWidth={1.5} />
                    <circle cx={cx} cy={cy} r={2} fill={C.bg} />
                  </g>
                );
              }}
            />
          )}
        </ScatterChart>
      </ResponsiveContainer>

      {/* Visual Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[10px] font-mono text-nb-muted uppercase tracking-wider">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 bg-[rgba(0,190,220,0.25)] rounded-sm"></span>
          <span>Simulations</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 bg-[#00D4FF]"></span>
          <span>Frontier (Click Line)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 bg-[#00C853] rounded-full"></span>
          <span>Optimal Portfolio</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 bg-[#EF4444] rounded-full"></span>
          <span>Individual Assets</span>
        </div>
        {customPoint && (
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 bg-[#FFB340] rounded-full border border-black"></span>
            <span>Manual Mix</span>
          </div>
        )}
      </div>
    </div>
  );
}
