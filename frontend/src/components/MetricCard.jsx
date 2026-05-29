import { motion } from 'framer-motion';
import { useCountUp } from '../hooks/useCountUp';
import { useTextScramble } from '../hooks/useTextScramble';

export function MetricCard({ label, value, suffix = '%', runId, isWarning = false }) {
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
      className="relative border-2 border-nb-border p-3 bg-nb-surface/10 nb-pop-card cursor-default"
      animate={{ borderColor: [isWarning ? '#FFB340' : '#00C853', '#2C2C2E'] }}
      transition={{ duration: 0.8, delay: 0.3 }}
    >
      {/* Blueprint Corner Brackets */}
      <div className={`absolute top-[-2px] left-[-2px] w-1.5 h-1.5 border-t-2 border-l-2 ${bracketColor}`} />
      <div className={`absolute top-[-2px] right-[-2px] w-1.5 h-1.5 border-t-2 border-r-2 ${bracketColor}`} />
      <div className={`absolute bottom-[-2px] left-[-2px] w-1.5 h-1.5 border-b-2 border-l-2 ${bracketColor}`} />
      <div className={`absolute bottom-[-2px] right-[-2px] w-1.5 h-1.5 border-b-2 border-r-2 ${bracketColor}`} />

      <div className="font-mono text-[10px] tracking-widest text-nb-muted uppercase leading-tight">{scrambledLabel}</div>
      <div className={`font-mono text-lg md:text-xl mt-1.5 font-bold ${color}`}>
        {scrambledValue}
      </div>
    </motion.div>
  );
}
