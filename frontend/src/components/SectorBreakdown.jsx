import { useState } from 'react';
import { SECTOR_COLORS } from '../lib/colours';

export function SectorBreakdown({ sectors }) {
  const [hoveredSector, setHoveredSector] = useState(null);

  return (
    <div className="mt-4 border border-nb-border p-3 bg-nb-surface/20">
      <div className="font-mono text-[10px] tracking-widest text-nb-muted mb-3 font-bold">SECTOR EXPOSURE</div>
      
      {/* Thicker, Segmented Progress Bar */}
      <div className="flex h-3 w-full bg-nb-surface overflow-hidden border border-nb-border mb-3">
        {sectors.map(s => {
          const color = SECTOR_COLORS[s.sector] ?? SECTOR_COLORS['Other'];
          const isDimmed = hoveredSector !== null && hoveredSector !== s.sector;
          return (
            <div 
              key={s.sector}
              style={{ 
                width: `${(s.weight * 100).toFixed(1)}%`, 
                backgroundColor: color,
                opacity: isDimmed ? 0.35 : 1
              }}
              className="border-r border-nb-bg last:border-r-0 transition-all duration-200 cursor-help"
              title={`${s.sector}: ${(s.weight * 100).toFixed(1)}%`}
              onMouseEnter={() => setHoveredSector(s.sector)}
              onMouseLeave={() => setHoveredSector(null)}
            />
          );
        })}
      </div>

      {/* Visual Legend with Colored Circle Indicators */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
        {sectors.map(s => {
          const color = SECTOR_COLORS[s.sector] ?? SECTOR_COLORS['Other'];
          const isHighlighted = hoveredSector === s.sector;
          const isDimmed = hoveredSector !== null && hoveredSector !== s.sector;
          return (
            <div 
              key={s.sector} 
              className={`flex items-center gap-2 cursor-pointer transition-all duration-200 ${
                isHighlighted ? 'text-nb-text scale-[1.02]' : isDimmed ? 'opacity-30' : 'text-nb-muted'
              }`}
              onMouseEnter={() => setHoveredSector(s.sector)}
              onMouseLeave={() => setHoveredSector(null)}
            >
              <span 
                className="w-[6px] h-[6px] shrink-0 border border-nb-bg" 
                style={{ backgroundColor: color }}
              />
              <span className="font-mono text-[10px] uppercase tracking-wide">
                {s.sector} <span className="text-nb-text font-mono font-bold">{(s.weight * 100).toFixed(0)}%</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
