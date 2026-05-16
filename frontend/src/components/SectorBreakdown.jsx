const SECTOR_COLORS = {
  'Financials':              'rgba(255,179,64,0.7)',
  'Resources':               'rgba(255,69,58,0.6)',
  'Industrials':             'rgba(147,112,219,0.6)',
  'Consumer Discretionary':  'rgba(0,180,180,0.6)',
  'Consumer Staples':        'rgba(60,179,113,0.6)',
  'Technology':              'rgba(30,144,255,0.6)',
  'Telecommunications':      'rgba(255,140,0,0.6)',
  'Other':                   'rgba(100,100,100,0.5)',
};

export function SectorBreakdown({ sectors }) {
  return (
    <div className="mt-4">
      <div className="font-mono text-[8px] tracking-widest text-nb-dim mb-2">SECTOR EXPOSURE</div>
      <div className="flex h-1 w-full overflow-hidden">
        {sectors.map(s => (
          <div key={s.sector}
            style={{ width: `${(s.weight * 100).toFixed(1)}%`, backgroundColor: SECTOR_COLORS[s.sector] ?? SECTOR_COLORS['Other'] }}
            title={`${s.sector}: ${(s.weight * 100).toFixed(1)}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
        {sectors.map(s => (
          <span key={s.sector} className="font-mono text-[8px] text-nb-dim">
            {s.sector} {(s.weight * 100).toFixed(0)}%
          </span>
        ))}
      </div>
    </div>
  );
}
