import { motion } from 'framer-motion';
import { useCountUp } from '../hooks/useCountUp';

export function MetricCard({ label, value, suffix = '%', runId, isWarning = false }) {
  const animated = useCountUp(value, 900, 2);
  const color = isWarning ? 'text-nb-amber' : 'text-nb-emerald';

  return (
    <motion.div
      key={runId}
      className="border-2 border-nb-border p-3"
      animate={{ borderColor: [isWarning ? '#FFB340' : '#00C853', '#2C2C2E'] }}
      transition={{ duration: 0.8, delay: 0.3 }}
    >
      <div className="font-mono text-[8px] tracking-widest text-nb-dim">{label}</div>
      <div className={`font-mono text-lg mt-1 ${color}`}>
        {suffix === '%' ? '+' : ''}{animated.toFixed(2)}{suffix}
      </div>
    </motion.div>
  );
}
