import { useState } from 'react';

export function CorrelationMatrix({ result }) {
  const [hoveredCell, setHoveredCell] = useState(null);

  if (!result || !result.covariance) return null;

  const tickers = Object.keys(result.covariance);
  const n = tickers.length;

  // Helper to compute correlation: cov(X,Y) / sqrt(cov(X,X) * cov(Y,Y))
  const getCorrelation = (t1, t2) => {
    const cov_12 = result.covariance[t1]?.[t2] ?? 0;
    const cov_11 = result.covariance[t1]?.[t1] ?? 1e-8;
    const cov_22 = result.covariance[t2]?.[t2] ?? 1e-8;
    const corr = cov_12 / Math.sqrt(cov_11 * cov_22);
    // Boundary clamp to handle float precision
    return Math.max(-1.0, Math.min(1.0, corr));
  };

  // Helper to get background color based on correlation strength
  const getCellColorStyle = (val, isSelf) => {
    if (isSelf) {
      return { backgroundColor: '#141415', border: '1px solid #00D4FF', color: '#00D4FF' };
    }
    
    // Positive correlation: shade of emerald green
    if (val > 0) {
      return { 
        backgroundColor: `rgba(0, 200, 83, ${Math.min(1.0, val * 0.95 + 0.05)})`,
        color: val > 0.5 ? '#000000' : '#E0E0E2'
      };
    }
    
    // Negative correlation: shade of red
    return { 
      backgroundColor: `rgba(255, 69, 58, ${Math.min(1.0, Math.abs(val) * 0.95 + 0.05)})`,
      color: Math.abs(val) > 0.5 ? '#000000' : '#E0E0E2'
    };
  };

  return (
    <div className="space-y-4">
      {/* Grid container with overflow-x scrolling for large portfolios */}
      <div className="border border-nb-border bg-nb-surface/20 p-4 overflow-x-auto scrollbar-thin">
        <div className="min-w-[280px] flex flex-col items-center">
          {/* Header Row */}
          <div className="flex">
            {/* Blank corner cell */}
            <div className="w-10 h-8 flex items-center justify-center font-mono text-[9px] text-nb-dim uppercase tracking-wider shrink-0" />
            {tickers.map(t => (
              <div
                key={`col-${t}`}
                className="w-10 h-8 flex items-center justify-center font-mono text-[9px] text-nb-muted font-bold shrink-0 border-b border-nb-border"
              >
                {t}
              </div>
            ))}
          </div>

          {/* Matrix Rows */}
          {tickers.map(t1 => (
            <div key={`row-${t1}`} className="flex">
              {/* Row Label */}
              <div className="w-10 h-10 flex items-center justify-end pr-2 font-mono text-[9px] text-nb-muted font-bold shrink-0 border-r border-nb-border">
                {t1}
              </div>
              
              {tickers.map(t2 => {
                const val = getCorrelation(t1, t2);
                const isSelf = t1 === t2;
                const style = getCellColorStyle(val, isSelf);
                const isHovered = hoveredCell && hoveredCell.t1 === t1 && hoveredCell.t2 === t2;
                
                return (
                  <div
                    key={`cell-${t1}-${t2}`}
                    style={style}
                    onMouseEnter={() => setHoveredCell({ t1, t2, val })}
                    onMouseLeave={() => setHoveredCell(null)}
                    className={`w-10 h-10 flex items-center justify-center font-mono text-[8.5px] cursor-crosshair transition-all duration-100 border border-nb-bg/10 ${
                      isHovered ? 'ring-2 ring-nb-cyan z-10 scale-[1.05]' : ''
                    }`}
                  >
                    {isSelf ? '1.0' : val.toFixed(2)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Readout panel below */}
      <div className="border border-nb-border p-3 min-h-[50px] bg-nb-surface/40 flex items-center justify-center">
        {hoveredCell ? (
          <div className="font-mono text-[9px] text-center w-full space-y-1">
            <div className="text-nb-dim tracking-widest uppercase">CORRELATION FACTOR</div>
            <div className="text-nb-text">
              <span className="text-nb-cyan font-bold">{hoveredCell.t1}</span>
              <span className="text-nb-muted px-2">&harr;</span>
              <span className="text-nb-cyan font-bold">{hoveredCell.t2}</span>
            </div>
            <div className={`text-xs font-bold ${hoveredCell.val > 0.4 ? 'text-nb-emerald' : hoveredCell.val < -0.1 ? 'text-nb-red' : 'text-nb-text'}`}>
              {hoveredCell.t1 === hoveredCell.t2 ? '+1.000 (IDENTICAL ASSET)' : `${hoveredCell.val >= 0 ? '+' : ''}${hoveredCell.val.toFixed(4)}`}
            </div>
          </div>
        ) : (
          <div className="font-mono text-[9px] text-nb-dim text-center uppercase tracking-wider">
            HOVER OVER A CELL TO INSPECT CORRELATION STRENGTH
          </div>
        )}
      </div>
    </div>
  );
}
