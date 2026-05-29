import { motion } from 'framer-motion';
import { useTextScramble } from '../hooks/useTextScramble';

export function StageShell({ number, label, children, id, isActive = false }) {
  const scrambledLabel = useTextScramble(label, 500);

  return (
    <motion.section 
      id={id} 
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`border-2 border-nb-border border-t-0 first:border-t-2 bg-nb-surface/5 transition-all duration-300 relative ${
        isActive ? 'active-glow z-10' : ''
      }`}
    >
      {/* Subtle Blueprint Dot Grid Background */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{
          backgroundImage: 'radial-gradient(#E0E0E2 1px, transparent 1px)',
          backgroundSize: '16px 16px'
        }} 
      />

      <div className="border-b border-nb-surface px-4 py-2.5 flex items-center justify-between relative z-10">
        <span className={`font-mono text-[10px] tracking-[0.2em] font-bold ${
          isActive ? 'nb-shiny-text' : 'text-nb-muted'
        }`}>
          {number} / {scrambledLabel}
        </span>
        {isActive && (
          <span className="w-1.5 h-1.5 rounded-full bg-nb-cyan animate-pulse shadow-[0_0_8px_#00D4FF]" />
        )}
      </div>
      <div className="p-5 relative z-10">{children}</div>
    </motion.section>
  );
}
