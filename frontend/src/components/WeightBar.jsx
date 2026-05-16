import { motion } from 'framer-motion';

export function WeightBar({ ticker, weight, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.25 }}
      className="flex items-center gap-2"
    >
      <span className="font-mono text-[10px] text-nb-muted w-8 shrink-0">{ticker}</span>
      <div className="flex-1 bg-nb-surface h-[2px]">
        <motion.div
          className="bg-nb-emerald h-full"
          initial={{ width: '0%' }}
          animate={{ width: `${(weight * 100).toFixed(1)}%` }}
          transition={{ delay: delay + 0.1, duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className="font-mono text-[10px] text-nb-text w-10 text-right">
        {(weight * 100).toFixed(1)}%
      </span>
    </motion.div>
  );
}
