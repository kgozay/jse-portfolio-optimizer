import { useMemo } from 'react';
import {
  ComposedChart, LineChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';

function EquityTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;

  return (
    <div className="border-2 border-nb-border bg-nb-bg font-mono text-[10px] px-3 py-2 space-y-1">
      <div className="text-nb-muted border-b border-nb-border pb-1 mb-1">{data.date}</div>
      <div className="flex gap-4 justify-between">
        <span className="text-nb-dim">PORTFOLIO</span>
        <span className="text-nb-emerald">{(data.portfolio - 100).toFixed(2)}%</span>
      </div>
      <div className="flex gap-4 justify-between">
        <span className="text-nb-dim">BENCHMARK</span>
        <span className="text-nb-text">{(data.benchmark - 100).toFixed(2)}%</span>
      </div>
    </div>
  );
}

function DrawdownTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="border-2 border-nb-border bg-nb-bg font-mono text-[10px] px-3 py-2">
      <div className="text-nb-muted border-b border-nb-border pb-1 mb-1">{data.date}</div>
      <div className="flex gap-4 justify-between">
        <span className="text-nb-dim">DRAWDOWN</span>
        <span className="text-nb-red">{data.drawdown?.toFixed(2)}%</span>
      </div>
    </div>
  );
}

function MetricCell({ label, value, colorClass = 'text-nb-text', prefix = '', suffix = '%' }) {
  return (
    <div className="border border-nb-border p-2">
      <div className="font-mono text-[7px] tracking-widest text-nb-dim">{label}</div>
      <div className={`font-mono text-xs mt-1 ${colorClass}`}>
        {prefix}{typeof value === 'number' ? value.toFixed(2) : value}{suffix}
      </div>
    </div>
  );
}

export function BacktestChart({ backtestResult }) {
  const chartData = useMemo(() => {
    if (!backtestResult?.dates) return [];
    return backtestResult.dates.map((date, i) => ({
      date,
      portfolio: backtestResult.portfolio[i],
      benchmark: backtestResult.benchmark[i],
      drawdown: backtestResult.drawdown?.[i],
    }));
  }, [backtestResult]);

  if (!backtestResult) return null;

  const {
    total_return_pct, benchmark_return_pct,
    outperformance_pct, alpha_pct, beta, r_squared,
    sortino_ratio, max_drawdown_pct, var_95_pct, cvar_95_pct,
  } = backtestResult;

  const outperf = outperformance_pct ?? 0;
  const alpha = alpha_pct ?? 0;
  const sortino = sortino_ratio ?? 0;
  const maxDD = max_drawdown_pct ?? 0;
  const hasDd = backtestResult.drawdown?.length > 0;

  const tickFormat = (d) => {
    if (!d) return '';
    const parts = d.split('-');
    return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : d;
  };

  return (
    <div className="space-y-3">
      {/* Row 1: core return metrics */}
      <div className="grid grid-cols-3 gap-2">
        <MetricCell
          label="BACKTEST PORTFOLIO"
          value={total_return_pct}
          prefix={total_return_pct >= 0 ? '+' : ''}
          colorClass="text-nb-emerald"
        />
        <MetricCell
          label="BENCHMARK INDEX"
          value={benchmark_return_pct}
          prefix={benchmark_return_pct >= 0 ? '+' : ''}
          colorClass="text-nb-muted"
        />
        <MetricCell
          label="OUTPERFORMANCE"
          value={outperf}
          prefix={outperf >= 0 ? '+' : ''}
          colorClass={outperf >= 0 ? 'text-nb-cyan' : 'text-nb-red'}
        />
      </div>

      {/* Row 2: risk-adjusted metrics */}
      <div className="grid grid-cols-3 gap-2">
        <MetricCell
          label="SORTINO RATIO"
          value={sortino}
          suffix=""
          colorClass={sortino >= 1 ? 'text-nb-emerald' : sortino >= 0.5 ? 'text-nb-text' : 'text-nb-amber'}
        />
        <MetricCell
          label="MAX DRAWDOWN"
          value={maxDD}
          colorClass="text-nb-red"
        />
        <MetricCell
          label="JENSEN ALPHA (ANN)"
          value={alpha}
          prefix={alpha >= 0 ? '+' : ''}
          colorClass={alpha >= 0 ? 'text-nb-cyan' : 'text-nb-red'}
        />
      </div>

      {/* Row 3: tail risk + beta */}
      <div className="grid grid-cols-3 gap-2">
        <MetricCell
          label="VAR 95% (ANN)"
          value={var_95_pct ?? 0}
          prefix="-"
          colorClass="text-nb-amber"
        />
        <MetricCell
          label="CVAR 95% (ANN)"
          value={cvar_95_pct ?? 0}
          prefix="-"
          colorClass="text-nb-amber"
        />
        <MetricCell
          label={`BETA${r_squared !== null && r_squared !== undefined ? ` (R²=${r_squared.toFixed(2)})` : ''}`}
          value={beta ?? 1}
          suffix=""
          colorClass="text-nb-text"
        />
      </div>

      {/* Equity curve */}
      <ResponsiveContainer width="100%" height={190}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 12, bottom: 8, left: 16 }}>
          <CartesianGrid stroke="#191919" strokeDasharray="none" />
          <XAxis
            dataKey="date"
            tickFormatter={tickFormat}
            tick={{ fill: '#404040', fontSize: 9, fontFamily: 'monospace' }}
            minTickGap={40}
          />
          <YAxis
            tickFormatter={(v) => `${(v - 100).toFixed(0)}%`}
            tick={{ fill: '#404040', fontSize: 9, fontFamily: 'monospace' }}
          />
          <Tooltip content={<EquityTooltip />} />
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
        </ComposedChart>
      </ResponsiveContainer>

      {/* Drawdown area chart */}
      {hasDd && (
        <div>
          <div className="font-mono text-[7px] tracking-widest text-nb-dim mb-1 pl-1">DRAWDOWN FROM PEAK</div>
          <ResponsiveContainer width="100%" height={80}>
            <ComposedChart data={chartData} margin={{ top: 0, right: 12, bottom: 8, left: 16 }}>
              <CartesianGrid stroke="#191919" strokeDasharray="none" />
              <XAxis
                dataKey="date"
                tickFormatter={tickFormat}
                tick={{ fill: '#404040', fontSize: 8, fontFamily: 'monospace' }}
                minTickGap={40}
              />
              <YAxis
                tickFormatter={(v) => `${v.toFixed(0)}%`}
                tick={{ fill: '#404040', fontSize: 8, fontFamily: 'monospace' }}
                domain={['dataMin', 0]}
              />
              <Tooltip content={<DrawdownTooltip />} />
              <Area
                type="monotone"
                dataKey="drawdown"
                stroke="#FF453A"
                strokeWidth={1}
                fill="rgba(255,69,58,0.15)"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
