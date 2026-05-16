const STATUS_STYLES = {
  loading: 'border-nb-border text-nb-muted',
  valid:   'border-nb-border text-nb-text',
  invalid: 'border-nb-red text-nb-red',
};

export function TickerChip({ ticker, name, status = 'loading', onRemove }) {
  return (
    <div className={`flex items-center gap-1 border px-2 py-1 font-mono text-[10px] ${STATUS_STYLES[status]}`}>
      {status === 'loading' && (
        <span className="animate-spin inline-block w-2 h-2 border border-nb-muted border-t-transparent rounded-full" />
      )}
      {status === 'valid' && <span className="text-nb-emerald">✓</span>}
      {status === 'invalid' && <span className="text-nb-red">✕</span>}
      <span>{ticker}</span>
      {name && <span className="text-nb-dim hidden sm:inline">— {name}</span>}
      <button onClick={onRemove} className="ml-1 text-nb-dim hover:text-nb-red">×</button>
    </div>
  );
}
