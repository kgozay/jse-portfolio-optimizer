import { motion } from 'framer-motion';
import { useCountUp } from '../hooks/useCountUp';
import { useTextScramble } from '../hooks/useTextScramble';

export function MetricCard({ label, value, suffix = '%', runId, isWarning = false, ariaLabel }) {
  const animated = useCountUp(value, 900, 2);
  const color = isWarning ? 'text-nb-amber' : 'text-nb-emerald';
  const bracketColor = isWarning ? 'border-nb-amber' : 'border-nb-emerald';

  const sign = animated >= 0 ? '+' : '';
  const displayVal = `${suffix === '%' ? sign : ''}${animated.toFixed(2)}${suffix}`;

  const scrambledLabel = useTextScramble(label, 450);
  const scrambledValue = useTextScramble(displayVal, 550);

  return (
    <motion.div
      key={runId}
      className="relative border-2 border-nb-border p-4 bg-nb-surface/10 nb-pop-card cursor-default min-h-[90px] flex flex-col justify-between"
      animate={{ borderColor: [isWarning ? '#FFB340' : '#00C853', '#2C2C2E'] }}
      transition={{ duration: 0.8, delay: 0.3 }}
      aria-label={ariaLabel}
    >
      {/* Blueprint Corner Brackets */}
      <div className={`absolute top-[-2px] left-[-2px] w-2 h-2 border-t-2 border-l-2 ${bracketColor}`} />
      <div className={`absolute top-[-2px] right-[-2px] w-2 h-2 border-t-2 border-r-2 ${bracketColor}`} />
      <div className={`absolute bottom-[-2px] left-[-2px] w-2 h-2 border-b-2 border-l-2 ${bracketColor}`} />
      <div className={`absolute bottom-[-2px] right-[-2px] w-2 h-2 border-b-2 border-r-2 ${bracketColor}`} />

      <div className="font-mono text-[9px] tracking-wide text-nb-muted uppercase leading-none">{scrambledLabel}</div>
      <div className={`font-mono text-2xl font-bold mt-2 ${color}`}>
        {scrambledValue}
      </div>
    </motion.div>
  );
}
