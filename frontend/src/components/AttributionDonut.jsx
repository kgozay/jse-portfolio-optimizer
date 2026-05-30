import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { CHART_PALETTE, C } from '../lib/colours';

const PALETTE = CHART_PALETTE;

export function AttributionDonut({ weights }) {
  const { pieData, netReturn, hasDrag } = useMemo(() => {
    if (!weights) return { pieData: [], netReturn: 0, hasDrag: false };

    const positive = weights.filter(w => (w.contribution_to_return || 0) > 0);
    const negative = weights.filter(w => (w.contribution_to_return || 0) < 0);
    const dragTotal = negative.reduce((s, w) => s + Math.abs(w.contribution_to_return), 0);

    const net = weights.reduce((s, w) => s + (w.contribution_to_return || 0), 0);

    const data = [
      ...positive.map((w, i) => ({
        ticker: w.ticker,
        value: w.contribution_to_return,
        color: PALETTE[i % PALETTE.length],
        isDrag: false,
      })),
    ];

    if (dragTotal > 0.0001) {
      data.push({
        ticker: 'DRAG',
        value: dragTotal,
        color: C.red,
        isDrag: true,
      });
    }

    return {
      pieData: data,
      netReturn: net,
      hasDrag: dragTotal > 0.0001,
    };
  }, [weights]);

  if (!weights || weights.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="font-mono text-[10px] tracking-widest text-nb-muted font-bold uppercase">
        WHAT IS DRIVING RETURNS?
      </div>

      <div className="relative flex flex-col sm:flex-row items-center justify-center gap-6 p-4 border border-nb-border bg-nb-surface/10">
        {/* Donut Chart */}
        <div className="relative w-44 h-44 flex-shrink-0" role="img" aria-label="Return attribution donut chart">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={74}
                paddingAngle={2}
                dataKey="value"
                nameKey="ticker"
                stroke={C.bg}
                strokeWidth={2}
                isAnimationActive={true}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="border-2 border-nb-border bg-nb-bg font-mono text-[10px] px-3 py-2">
                      <div className="font-bold uppercase" style={{ color: data.color }}>
                        {data.ticker}
                      </div>
                      <div className="text-nb-text mt-1">
                        {data.isDrag ? 'Drag: -' : 'Contrib: +'}
                        {(data.value * 100).toFixed(2)}%
                      </div>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Centered Net Return Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="font-mono text-xs text-nb-muted uppercase tracking-wider">NET RET</span>
            <span className={`font-mono text-sm font-bold mt-0.5 ${netReturn >= 0 ? 'text-nb-emerald' : 'text-nb-red'}`}>
              {netReturn >= 0 ? '+' : ''}
              {(netReturn * 100).toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Custom Legend */}
        <div className="flex-1 w-full flex flex-col justify-center">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {pieData.map((entry) => (
              <div key={entry.ticker} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 border border-nb-bg shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="font-mono text-[10px] uppercase text-nb-muted flex justify-between w-full">
                  <span>{entry.ticker}</span>
                  <span className="font-bold text-nb-text">
                    {entry.isDrag ? '-' : '+'}
                    {(entry.value * 100).toFixed(2)}%
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="font-mono text-[9px] text-nb-dim leading-relaxed">
        Each slice shows how much of the portfolio's expected return is explained by that share.{' '}
        {hasDrag && 'DRAG indicates tickers with negative expected return contribution.'}
      </p>
    </div>
  );
}
