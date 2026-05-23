import { useState, useMemo } from 'react';

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Interpolate between red (-1) → white (0) → emerald (+1)
function corrToColor(value) {
  const v = Math.max(-1, Math.min(1, value));
  if (v >= 0) {
    // white → emerald
    const t = v;
    const r = Math.round(lerp(255, 0, t));
    const g = Math.round(lerp(255, 200, t));
    const b = Math.round(lerp(255, 83, t));
    return `rgb(${r},${g},${b})`;
  } else {
    // red → white
    const t = -v;
    const r = Math.round(lerp(255, 255, t));
    const g = Math.round(lerp(255, 69, t));
    const b = Math.round(lerp(255, 58, t));
    return `rgb(${r},${g},${b})`;
  }
}

export function CorrelationHeatmap({ correlation }) {
  const [tooltip, setTooltip] = useState(null);

  const tickers = useMemo(() => Object.keys(correlation || {}), [correlation]);

  if (!correlation || tickers.length < 2) {
    return (
      <div className="flex items-center justify-center h-40 font-mono text-[10px] text-nb-muted">
        INSUFFICIENT DATA FOR CORRELATION MATRIX
      </div>
    );
  }

  const cellSize = Math.min(44, Math.floor(360 / tickers.length));
  const labelSize = 36;
  const totalW = labelSize + tickers.length * cellSize;
  const totalH = labelSize + tickers.length * cellSize;

  return (
    <div className="relative overflow-x-auto">
      <div className="font-mono text-[8px] tracking-widest text-nb-dim mb-2">CORRELATION MATRIX</div>
      <div className="relative" style={{ minWidth: totalW }}>
        <svg width={totalW} height={totalH}>
          {/* Column labels */}
          {tickers.map((t, j) => (
            <text
              key={`col-${t}`}
              x={labelSize + j * cellSize + cellSize / 2}
              y={labelSize - 6}
              textAnchor="middle"
              fill="#6E6E73"
              fontSize={Math.max(7, cellSize * 0.22)}
              fontFamily="monospace"
            >
              {t}
            </text>
          ))}

          {/* Row labels */}
          {tickers.map((t, i) => (
            <text
              key={`row-${t}`}
              x={labelSize - 4}
              y={labelSize + i * cellSize + cellSize / 2 + 3}
              textAnchor="end"
              fill="#6E6E73"
              fontSize={Math.max(7, cellSize * 0.22)}
              fontFamily="monospace"
            >
              {t}
            </text>
          ))}

          {/* Heatmap cells */}
          {tickers.map((t1, i) =>
            tickers.map((t2, j) => {
              const val = correlation[t1]?.[t2] ?? 0;
              const color = corrToColor(val);
              const x = labelSize + j * cellSize;
              const y = labelSize + i * cellSize;
              const textColor = Math.abs(val) > 0.5 ? '#0C0C0D' : '#6E6E73';
              return (
                <g
                  key={`${t1}-${t2}`}
                  onMouseEnter={() => setTooltip({ t1, t2, val, x, y })}
                  onMouseLeave={() => setTooltip(null)}
                  style={{ cursor: 'default' }}
                >
                  <rect
                    x={x + 1}
                    y={y + 1}
                    width={cellSize - 2}
                    height={cellSize - 2}
                    fill={color}
                    opacity={0.9}
                  />
                  {cellSize >= 30 && (
                    <text
                      x={x + cellSize / 2}
                      y={y + cellSize / 2 + 3}
                      textAnchor="middle"
                      fill={textColor}
                      fontSize={Math.max(7, cellSize * 0.2)}
                      fontFamily="monospace"
                      fontWeight={i === j ? 'bold' : 'normal'}
                    >
                      {val.toFixed(2)}
                    </text>
                  )}
                </g>
              );
            })
          )}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute z-10 border-2 border-nb-border bg-nb-bg font-mono text-[10px] px-3 py-2 pointer-events-none"
            style={{
              left: tooltip.x + cellSize + 4,
              top: tooltip.y,
            }}
          >
            <div className="text-nb-muted mb-1">{tooltip.t1} / {tooltip.t2}</div>
            <div className={`font-bold ${
              tooltip.val > 0.5 ? 'text-nb-emerald' : tooltip.val < -0.5 ? 'text-nb-red' : 'text-nb-text'
            }`}>
              r = {tooltip.val.toFixed(4)}
            </div>
          </div>
        )}
      </div>

      {/* Colour scale legend */}
      <div className="flex items-center gap-2 mt-3">
        <span className="font-mono text-[8px] text-nb-dim">-1.0</span>
        <div
          className="flex-1 h-2 border border-nb-border"
          style={{
            background: 'linear-gradient(to right, rgb(255,69,58), rgb(255,255,255), rgb(0,200,83))',
          }}
        />
        <span className="font-mono text-[8px] text-nb-dim">+1.0</span>
      </div>
      <div className="font-mono text-[7px] text-nb-dim mt-1">
        RED = negative correlation · WHITE = uncorrelated · GREEN = positive correlation
      </div>
    </div>
  );
}
