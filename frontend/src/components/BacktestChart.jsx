import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
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

  const { total_return_pct, benchmark_return_pct, alpha_pct, max_drawdown_pct, beta, sortino_ratio } = backtestResult;
  const isAlphaPositive = alpha_pct >= 0;

  return (
    <div className="space-y-4">
      {/* Backtest mini dashboard */}
      <div className="grid grid-cols-3 gap-2">
        <div className="border border-nb-border p-2 bg-nb-surface/10">
          <div className="font-mono text-[7px] tracking-widest text-nb-dim">BACKTEST PORTFOLIO</div>
          <div className="font-mono text-xs mt-1 text-nb-emerald font-bold">
            {total_return_pct >= 0 ? '+' : ''}{total_return_pct.toFixed(2)}%
          </div>
        </div>
        <div className="border border-nb-border p-2 bg-nb-surface/10">
          <div className="font-mono text-[7px] tracking-widest text-nb-dim">BENCHMARK INDEX</div>
          <div className="font-mono text-xs mt-1 text-nb-muted font-bold">
            {benchmark_return_pct >= 0 ? '+' : ''}{benchmark_return_pct.toFixed(2)}%
          </div>
        </div>
        <div className="border border-nb-border p-2 bg-nb-surface/10">
          <div className="font-mono text-[7px] tracking-widest text-nb-dim">ALPHA OUTPERF.</div>
          <div className={`font-mono text-xs mt-1 font-bold ${isAlphaPositive ? 'text-nb-cyan' : 'text-nb-red'}`}>
            {isAlphaPositive ? '+' : ''}{alpha_pct.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Advanced Risk Metrics Row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="border border-nb-border p-2 bg-nb-surface/10">
          <div className="font-mono text-[7px] tracking-widest text-nb-dim">MAX DRAWDOWN</div>
          <div className="font-mono text-xs mt-1 text-nb-red font-bold">
            {max_drawdown_pct?.toFixed(2)}%
          </div>
        </div>
        <div className="border border-nb-border p-2 bg-nb-surface/10">
          <div className="font-mono text-[7px] tracking-widest text-nb-dim">PORTFOLIO BETA</div>
          <div className="font-mono text-xs mt-1 text-nb-cyan font-bold">
            {beta?.toFixed(2)}
          </div>
        </div>
        <div className="border border-nb-border p-2 bg-nb-surface/10">
          <div className="font-mono text-[7px] tracking-widest text-nb-dim">SORTINO RATIO</div>
          <div className="font-mono text-xs mt-1 text-nb-emerald font-bold">
            {sortino_ratio?.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Equity curve area chart */}
      <div className="relative">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 12, right: 12, bottom: 8, left: 16 }}>
            <defs>
              <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00C853" stopOpacity={0.18}/>
                <stop offset="95%" stopColor="#00C853" stopOpacity={0.005}/>
              </linearGradient>
              <linearGradient id="colorBenchmark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6E6E73" stopOpacity={0.12}/>
                <stop offset="95%" stopColor="#6E6E73" stopOpacity={0.005}/>
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#191919" strokeDasharray="none" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(d) => {
                if (!d) return '';
                const parts = d.split('-');
                return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : d; // e.g. 2023-05
              }}
              tick={{ fill: '#666', fontSize: 9, fontFamily: 'monospace' }} 
              minTickGap={45}
            />
            <YAxis 
              tickFormatter={(v) => `${(v - 100).toFixed(0)}%`}
              tick={{ fill: '#666', fontSize: 9, fontFamily: 'monospace' }} 
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#555', strokeWidth: 0.75, strokeDasharray: '3 3' }} />
            <Area 
              type="monotone" 
              dataKey="portfolio" 
              stroke="#00C853" 
              strokeWidth={1.5} 
              fillOpacity={1}
              fill="url(#colorPortfolio)"
              dot={false} 
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
            <Area 
              type="monotone" 
              dataKey="benchmark" 
              stroke="#6E6E73" 
              strokeWidth={1.25} 
              strokeDasharray="4 4" 
              fillOpacity={1}
              fill="url(#colorBenchmark)"
              dot={false} 
              activeDot={{ r: 3, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>

        <div className="flex justify-center gap-6 text-[8px] font-mono text-nb-muted mt-2 uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-0.5 bg-[#00C853]"></span>
            <span>Optimised Portfolio Equity Curve</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-0.5 bg-[#6E6E73] border-dashed border-t"></span>
            <span>Benchmark Curve</span>
          </div>
        </div>
      </div>
    </div>
  );
}
