import { motion } from 'framer-motion';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.25, 1, 0.5, 1] }
});

export function LandingPage({ onLaunch }) {
  return (
    <div className="min-h-screen bg-nb-bg text-nb-text flex flex-col justify-center items-center p-8">
      <div className="w-full max-w-2xl">

        {/* Hero */}
        <motion.div {...fadeUp(0)} className="mb-10">
          <p className="font-mono text-[9px] tracking-[0.3em] text-nb-cyan mb-3">
            MODERN PORTFOLIO THEORY · JSE EQUITIES
          </p>
          <h1 className="font-mono text-3xl md:text-4xl tracking-tight text-nb-text mb-4 leading-tight">
            JSE PORTFOLIO<br />OPTIMIZER
          </h1>
          <div className="border-t border-nb-border mt-4 mb-4" />
          <p className="font-mono text-xs text-nb-muted leading-relaxed max-w-lg">
            Build and analyse optimal portfolios for JSE-listed equities using Efficient Frontier
            modelling — powered by live market data, Monte Carlo simulation, and PyPortfolioOpt.
          </p>
        </motion.div>

        {/* Feature cards */}
        <motion.div {...fadeUp(0.1)} className="grid grid-cols-3 gap-2 mb-10">
          {[
            {
              num: '01',
              title: 'FETCH',
              body: '3 years of live JSE price history via Yahoo Finance. Drop tickers with insufficient data automatically.'
            },
            {
              num: '02',
              title: 'OPTIMISE',
              body: 'Max Sharpe · Min Volatility · Max Sortino via PyPortfolioOpt with Monte Carlo simulation.'
            },
            {
              num: '03',
              title: 'ANALYSE',
              body: 'Efficient Frontier · Correlation Heatmap · Backtest vs benchmark. Export CSV or PDF.'
            }
          ].map(({ num, title, body }) => (
            <div key={num} className="border border-nb-border bg-nb-surface p-3">
              <p className="font-mono text-[8px] text-nb-cyan tracking-widest mb-2">
                {num} / {title}
              </p>
              <p className="font-mono text-[8px] text-nb-dim leading-relaxed">{body}</p>
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div {...fadeUp(0.2)}>
          <button
            type="button"
            onClick={onLaunch}
            className="font-mono text-sm text-nb-cyan border-2 border-nb-cyan px-6 py-3
                       nb-pop-btn tracking-widest hover:bg-nb-cyan/5 transition-colors"
          >
            LAUNCH OPTIMIZER ──────►
          </button>
        </motion.div>

        {/* Footer */}
        <motion.div {...fadeUp(0.3)} className="mt-16 border-t border-nb-border pt-4">
          <p className="font-mono text-[8px] text-nb-dim tracking-widest">
            POWERED BY · yfinance · PyPortfolioOpt · FRED API · Render · Vercel
          </p>
        </motion.div>

      </div>
    </div>
  );
}
