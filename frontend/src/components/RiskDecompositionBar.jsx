import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts';

export function RiskDecompositionBar({ weights }) {
  const { data, totalRisk } = useMemo(() => {
    if (!weights) return { data: [], totalRisk: 0 };

    const sumRisk = weights.reduce((s, w) => s + (w.contribution_to_risk || 0), 0);
    const list = weights
      .map(w => ({
        ticker: w.ticker,
        value: w.contribution_to_risk || 0,
        pct: sumRisk > 0 ? ((w.contribution_to_risk || 0) / sumRisk) * 100 : 0,
      }))
      .sort((a, b) => b.pct - a.pct);

    return { data: list, totalRisk: sumRisk };
  }, [weights]);

  const height = useMemo(() => {
    return Math.max(140, data.length * 28 + 20);
  }, [data]);

  if (!weights || weights.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="font-mono text-[10px] tracking-widest text-nb-muted font-bold uppercase">
        WHERE IS YOUR RISK CONCENTRATED?
      </div>

      <div
        className="p-4 border border-nb-border bg-nb-surface/10"
        role="img"
        aria-label="Risk decomposition horizontal bar chart"
      >
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 20, bottom: 5, left: 10 }}
          >
            <CartesianGrid stroke="#191919" strokeDasharray="none" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={v => `${v.toFixed(0)}%`}
              tick={{ fill: '#666', fontSize: 9, fontFamily: 'monospace' }}
              stroke="#2C2C2E"
            />
            <YAxis
              type="category"
              dataKey="ticker"
              tick={{ fill: '#8E8E93', fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold' }}
              width={40}
              stroke="#2C2C2E"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="border-2 border-nb-border bg-nb-bg font-mono text-[10px] px-3 py-2">
                    <div className="font-bold text-nb-cyan uppercase">{d.ticker}</div>
                    <div className="text-nb-text mt-1">
                      Risk Contribution: {d.pct.toFixed(2)}%
                    </div>
                    <div className="text-nb-dim mt-0.5">
                      Abs Vol Value: {(d.value * 100).toFixed(2)}%
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="pct" barSize={8} radius={[0, 2, 2, 0]}>
              {data.map((entry, idx) => (
                <Cell
                  key={`cell-${idx}`}
                  fill={entry.pct >= 0 ? '#00D4FF' : '#FF453A'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="font-mono text-[9px] text-nb-dim leading-relaxed">
        Longer bar = that share contributes more to overall portfolio risk. A healthy portfolio has bars spread roughly evenly. Negative bars indicate volatility reduction (hedging).
      </p>
    </div>
  );
}
