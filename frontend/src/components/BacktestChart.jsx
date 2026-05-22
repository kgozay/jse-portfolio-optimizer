import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  const portVal = data.portfolio;
  const benchVal = data.benchmark;

  return (
    <div className="border-2 border-nb-border bg-nb-bg font-mono text-[10px] px-3 py-2 space-y-1">
      <div className="text-nb-muted border-b border-nb-border pb-1 mb-1">{data.date}</div>
      <div className="flex gap-4 justify-between">
        <span className="text-nb-dim">PORTFOLIO</span>
        <span className="text-nb-emerald">{(portVal - 100).toFixed(2)}%</span>
      </div>
      <div className="flex gap-4 justify-between">
        <span className="text-nb-dim">BENCHMARK</span>
        <span className="text-nb-text">{(benchVal - 100).toFixed(2)}%</span>
      </div>
    </div>
  );
}

export function BacktestChart({ backtestResult }) {
  const chartData = useMemo(() => {
    if (!backtestResult || !backtestResult.dates) return [];
    return backtestResult.dates.map((date, i) => ({
      date,
      portfolio: backtestResult.portfolio[i],
      benchmark: backtestResult.benchmark[i],
    }));
  }, [backtestResult]);

  if (!backtestResult) return null;

  const { total_return_pct, benchmark_return_pct, alpha_pct } = backtestResult;
  const isAlphaPositive = alpha_pct >= 0;

  return (
    <div className="space-y-4">
      {/* Backtest mini dashboard */}
      <div className="grid grid-cols-3 gap-2">
        <div className="border border-nb-border p-2">
          <div className="font-mono text-[7px] tracking-widest text-nb-dim">BACKTEST PORTFOLIO</div>
          <div className="font-mono text-xs mt-1 text-nb-emerald">
            {total_return_pct >= 0 ? '+' : ''}{total_return_pct.toFixed(2)}%
          </div>
        </div>
        <div className="border border-nb-border p-2">
          <div className="font-mono text-[7px] tracking-widest text-nb-dim">BENCHMARK INDEX</div>
          <div className="font-mono text-xs mt-1 text-nb-muted">
            {benchmark_return_pct >= 0 ? '+' : ''}{benchmark_return_pct.toFixed(2)}%
          </div>
        </div>
        <div className="border border-nb-border p-2">
          <div className="font-mono text-[7px] tracking-widest text-nb-dim">ALPHA OUTPERF.</div>
          <div className={`font-mono text-xs mt-1 ${isAlphaPositive ? 'text-nb-cyan' : 'text-nb-red'}`}>
            {isAlphaPositive ? '+' : ''}{alpha_pct.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Equity curve chart */}
      <ResponsiveContainer width="100%" height={210}>
        <LineChart data={chartData} margin={{ top: 12, right: 12, bottom: 8, left: 16 }}>
          <CartesianGrid stroke="#191919" strokeDasharray="none" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(d) => {
              if (!d) return '';
              const parts = d.split('-');
              return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : d; // e.g. 2023-05
            }}
            tick={{ fill: '#404040', fontSize: 9, fontFamily: 'monospace' }} 
            minTickGap={40}
          />
          <YAxis 
            tickFormatter={(v) => `${(v - 100).toFixed(0)}%`}
            tick={{ fill: '#404040', fontSize: 9, fontFamily: 'monospace' }} 
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="portfolio" 
            stroke="#00C853" 
            strokeWidth={1.5} 
            dot={false} 
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Line 
            type="monotone" 
            dataKey="benchmark" 
            stroke="#6E6E73" 
            strokeWidth={1} 
            strokeDasharray="4 4" 
            dot={false} 
            activeDot={{ r: 3, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
