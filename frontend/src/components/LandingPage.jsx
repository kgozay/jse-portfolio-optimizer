import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTextScramble } from '../hooks/useTextScramble';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }
});

export function LandingPage({ onLaunch }) {
  const scrambledTagline = useTextScramble('MODERN PORTFOLIO THEORY · JSE EQUITIES', 800);
  const scrambledTitle = useTextScramble('JSE PORTFOLIO OPTIMIZER', 1200);

  return (
    <div 
      className="min-h-screen bg-nb-bg text-nb-text flex flex-col justify-center items-center p-6 md:p-12 relative overflow-hidden select-none"
      style={{
        backgroundImage: 'linear-gradient(rgba(44, 44, 46, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(44, 44, 46, 0.15) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }}
    >
      {/* Background Cyber Glowing Orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-nb-cyan/5 rounded-full blur-[140px] pointer-events-none z-0" />
      
      {/* Subtle Scan sweep line on background */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="scan-line" />
      </div>

      <div className="w-full max-w-4xl relative z-10 flex flex-col justify-between min-h-[85vh] py-8">
        
        {/* Top telemetry and System Status */}
        <motion.div {...fadeUp(0)} className="flex flex-wrap items-center justify-between gap-4 border-b border-nb-border pb-4 mb-8">
          <div className="flex items-center gap-1.5 font-mono text-[9px] text-nb-emerald bg-nb-surface border border-nb-border px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-nb-emerald animate-pulse" />
            <span>ALL SYSTEMS NOMINAL // FRED_API: ONLINE // YFINANCE: READY</span>
          </div>
          <span className="font-mono text-[9px] text-nb-muted tracking-[0.2em] uppercase">
            VER_1.1.5 // PRODUCTION
          </span>
        </motion.div>

        {/* Hero Section */}
        <div className="my-auto">
          <motion.div {...fadeUp(0.1)} className="mb-12">
            <p className="font-mono text-xs md:text-sm tracking-[0.3em] text-nb-cyan mb-4 font-bold">
              {scrambledTagline}
            </p>
            <h1 className="font-mono text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-nb-text leading-[1.05] mb-6">
              {scrambledTitle}
            </h1>
            <p className="font-mono text-sm sm:text-base text-nb-muted leading-relaxed max-w-2xl">
              Construct, backtest, and analyze optimal asset weight allocations using mean-variance 
              and mean-semivariance mathematical frameworks. Custom-tailored for South African 
              equities listed on the Johannesburg Stock Exchange.
            </p>
          </motion.div>

          {/* Interactive Feature Cards */}
          <motion.div {...fadeUp(0.2)} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            {[
              {
                num: '01',
                title: 'FETCH MARKET DATA',
                body: 'Pull 3 years of daily live JSE equity prices directly via Yahoo Finance. Automatically filter out assets with insufficient historical observations.'
              },
              {
                num: '02',
                title: 'OPTIMIZE WEIGHTS',
                body: 'Compute Efficient Frontiers using Max Sharpe, Min Volatility, or Max Sortino formulations, backed by Ledoit-Wolf shrinkage and Monte Carlo paths.'
              },
              {
                num: '03',
                title: 'ANALYZE OUTCOMES',
                body: 'Inspect correlation heatmaps, sector exposure breakdowns, and dynamic historical backtests against custom benchmarks. Export results to CSV or PDF.'
              }
            ].map(({ num, title, body }) => (
              <div 
                key={num} 
                className="border border-nb-border bg-nb-surface p-6 transition-all duration-200 cursor-default 
                           hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[4px_4px_0px_0px_#00D4FF] 
                           hover:border-nb-cyan group flex flex-col justify-between min-h-[160px]"
              >
                <div>
                  <p className="font-mono text-xs text-nb-cyan font-bold tracking-widest mb-3">
                    {num} / {title}
                  </p>
                  <p className="font-mono text-xs sm:text-[13px] text-nb-muted group-hover:text-nb-text transition-colors duration-200 leading-relaxed">
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Action Button */}
          <motion.div {...fadeUp(0.3)}>
            <button
              type="button"
              onClick={onLaunch}
              className="font-mono text-sm sm:text-base text-nb-cyan border-2 border-nb-cyan px-8 py-4
                         nb-pop-btn tracking-widest hover:bg-nb-cyan/5 transition-colors font-bold shadow-[4px_4px_0px_0px_#2C2C2E]"
            >
              LAUNCH OPTIMIZER ──────►
            </button>
          </motion.div>
        </div>

        {/* Footer info bar */}
        <motion.div {...fadeUp(0.4)} className="mt-12 border-t border-nb-border pt-4 flex flex-wrap justify-between gap-4">
          <p className="font-mono text-[9px] text-nb-dim tracking-widest">
            POWERED BY · yfinance · PyPortfolioOpt · FRED API · FastAPI · React
          </p>
          <p className="font-mono text-[9px] text-nb-dim">
            © 2026 JSE PORTFOLIO OPTIMIZER
          </p>
        </motion.div>

      </div>
    </div>
  );
}
