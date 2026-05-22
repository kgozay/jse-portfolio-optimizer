import { motion } from 'framer-motion';

export function WeightBar({ ticker, weight, delay = 0, isAdjusting = false, onChange }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.25 }}
      className="flex items-center gap-2 py-1"
    >
      <span className="font-mono text-[10px] text-nb-muted w-8 shrink-0">{ticker}</span>
      {isAdjusting ? (
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={Math.round(weight * 100)}
          onChange={(e) => onChange(ticker, parseInt(e.target.value) / 100)}
          className="flex-1 accent-nb-cyan h-[6px] bg-nb-surface appearance-none outline-none border border-nb-border cursor-ew-resize rounded-none"
          style={{
            background: `linear-gradient(to right, #00D4FF 0%, #00D4FF ${weight * 100}%, #141415 ${weight * 100}%, #141415 100%)`
          }}
        />
      ) : (
        <div className="flex-1 bg-nb-surface h-[2px]">
          <motion.div
            className="bg-nb-emerald h-full"
            initial={{ width: '0%' }}
            animate={{ width: `${(weight * 100).toFixed(1)}%` }}
            transition={{ delay: delay + 0.1, duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      )}
      <span className="font-mono text-[10px] text-nb-text w-12 text-right">
        {(weight * 100).toFixed(1)}%
      </span>
    </motion.div>
  );
}
