import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTextScramble } from '../hooks/useTextScramble';

function ScrambleText({ text, duration = 400 }) {
  const scrambled = useTextScramble(text, duration);
  return <>{scrambled}</>;
}

function ScrambleOnHover({ text, duration = 400, className = "" }) {
  const [key, setKey] = useState(0);
  return (
    <span
      className={className}
      onMouseEnter={() => setKey(prev => prev + 1)}
    >
      <ScrambleText key={key} text={text} duration={duration} />
    </span>
  );
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }
});

export function LandingPage({ onLaunch }) {
  const scrambledTitle = useTextScramble('JSE PORTFOLIO OPTIMISER', 1200);

  return (
    <div className="min-h-screen bg-nb-bg text-nb-text flex flex-col justify-start items-center relative overflow-hidden select-none"
      style={{
        backgroundImage: 'linear-gradient(rgba(44, 44, 46, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(44, 44, 46, 0.05) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }}
    >
      {/* Scan sweep line */}
      <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
        <div className="scan-line" />
      </div>

      <div className="w-full max-w-4xl relative z-10 flex flex-col justify-between flex-1 py-10 px-6 md:px-12">

        {/* Top bar */}
        <motion.div {...fadeUp(0)} className="flex items-center justify-between border-b border-nb-border pb-4 mb-12">
          <span className="font-mono text-[11px] text-nb-emerald tracking-widest font-bold">JSE_OPTIMISER</span>
          <span className="font-mono text-[11px] text-nb-dim">v1.2.0</span>
        </motion.div>

        {/* Hero */}
        <div className="my-auto">
          <motion.div {...fadeUp(0.1)} className="mb-10">
            <p className="font-mono text-xs tracking-[0.25em] text-nb-cyan mb-5 font-bold uppercase">
              Modern Portfolio Theory · JSE Equities
            </p>
            <h1 className="font-mono text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6 text-nb-text">
              {scrambledTitle}
            </h1>
            <p className="font-mono text-sm sm:text-base text-nb-muted leading-relaxed max-w-[60ch]">
              Construct and analyse optimal asset weight allocations using mean-variance
              and mean-semivariance frameworks, tailored for JSE-listed equities.
            </p>
          </motion.div>

          {/* Feature cards — asymmetric layout to avoid identical grid */}
          <motion.div {...fadeUp(0.2)} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            {/* Card 01 — spans full width on md, left column on lg */}
            <div
              className="border border-nb-border bg-nb-surface/60 p-6 rounded-[4px] flex flex-col justify-between min-h-[180px] md:row-span-2 group transition-all duration-200 hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[3px_3px_0px_0px_#00D4FF] hover:border-nb-cyan cursor-default"
              style={{ borderTopColor: '#00D4FF', borderTopWidth: '2px' }}
            >
              <div>
                <p className="font-mono text-xs text-nb-cyan font-bold tracking-widest mb-3">FETCH MARKET DATA</p>
                <p className="font-mono text-xs sm:text-[13px] text-nb-muted group-hover:text-nb-text transition-colors duration-200 leading-relaxed">
                  Pull 3 years of daily JSE equity prices via Yahoo Finance. Assets with insufficient
                  historical observations are automatically filtered before optimisation begins.
                </p>
              </div>
              <p className="font-mono text-[10px] text-nb-dim mt-6">Stage 01</p>
            </div>

            {/* Card 02 */}
            <div
              className="border border-nb-border bg-nb-surface/60 p-6 rounded-[4px] flex flex-col justify-between min-h-[130px] group transition-all duration-200 hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[3px_3px_0px_0px_#00C853] hover:border-nb-emerald cursor-default"
              style={{ borderTopColor: '#00C853', borderTopWidth: '2px' }}
            >
              <div>
                <p className="font-mono text-xs text-nb-emerald font-bold tracking-widest mb-3">OPTIMISE WEIGHTS</p>
                <p className="font-mono text-xs sm:text-[13px] text-nb-muted group-hover:text-nb-text transition-colors duration-200 leading-relaxed">
                  Compute Efficient Frontiers using Max Sharpe, Min Volatility, or Max Sortino
                  with Ledoit-Wolf covariance shrinkage and Monte Carlo simulation.
                </p>
              </div>
              <p className="font-mono text-[10px] text-nb-dim mt-4">Stage 02</p>
            </div>

            {/* Card 03 */}
            <div
              className="border border-nb-border bg-nb-surface/60 p-6 rounded-[4px] flex flex-col justify-between min-h-[130px] group transition-all duration-200 hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[3px_3px_0px_0px_#FFB340] hover:border-nb-amber cursor-default"
              style={{ borderTopColor: '#FFB340', borderTopWidth: '2px' }}
            >
              <div>
                <p className="font-mono text-xs text-nb-amber font-bold tracking-widest mb-3">ANALYSE OUTCOMES</p>
                <p className="font-mono text-xs sm:text-[13px] text-nb-muted group-hover:text-nb-text transition-colors duration-200 leading-relaxed">
                  Inspect correlation heatmaps, sector exposure, and backtests against custom
                  benchmarks. Export to CSV or PDF.
                </p>
              </div>
              <p className="font-mono text-[10px] text-nb-dim mt-4">Stage 03</p>
            </div>
          </motion.div>

          {/* Launch button */}
          <motion.div {...fadeUp(0.3)}>
            <button
              type="button"
              onClick={onLaunch}
              className="font-mono text-sm sm:text-base text-nb-cyan border-2 border-nb-cyan px-8 py-4 rounded-[4px]
                         nb-pop-btn tracking-widest hover:bg-nb-cyan/5 transition-colors font-bold shadow-[4px_4px_0px_0px_#2C2C2E]"
            >
              <ScrambleOnHover text="LAUNCH OPTIMISER ──────►" duration={600} />
            </button>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div {...fadeUp(0.4)} className="mt-12 border-t border-nb-border pt-4 flex flex-wrap justify-between gap-4">
          <p className="font-mono text-[11px] text-nb-dim tracking-widest font-bold">
            yfinance · PyPortfolioOpt · FRED API · FastAPI · React
          </p>
          <p className="font-mono text-[11px] text-nb-dim font-bold">
            © 2026 JSE PORTFOLIO OPTIMISER
          </p>
        </motion.div>

      </div>
    </div>
  );
}
