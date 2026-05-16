export function StageShell({ number, label, children, id }) {
  return (
    <section id={id} className="border-2 border-nb-border border-t-0 first:border-t-2">
      <div className="border-b border-nb-surface px-4 py-2">
        <span className="font-mono text-[8px] tracking-[0.2em] text-nb-dim">
          {number} / {label}
        </span>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
