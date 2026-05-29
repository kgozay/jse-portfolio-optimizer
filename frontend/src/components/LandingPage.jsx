import { useState, useEffect } from 'react';
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
  const scrambledTagline = useTextScramble('MODERN PORTFOLIO THEORY · JSE EQUITIES', 800);
  const scrambledTitle = useTextScramble('JSE PORTFOLIO OPTIMISER', 1200);

  // Mouse position state for tracking cursor spotlight
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  


  // Tickers for scrolling marquee
  const [tickersData, setTickersData] = useState([
    { symbol: 'J203', name: 'JSE TOP 40', value: 74320.15, change: 0.42, isIndex: true },
    { symbol: 'J200', name: 'JSE ALL SHARE', value: 81150.30, change: -0.18, isIndex: true },
    { symbol: 'USDZAR', name: 'USD/ZAR', value: 18.4250, change: 0.12, isCurrency: true },
    { symbol: 'NPN', name: 'Naspers', value: 3450.00, change: 1.20, isEquity: true },
    { symbol: 'BHP', name: 'BHP Group', value: 612.40, change: -0.85, isEquity: true },
    { symbol: 'SBK', name: 'Standard Bank', value: 192.50, change: 0.35, isEquity: true },
    { symbol: 'GFI', name: 'Gold Fields', value: 285.10, change: 2.10, isEquity: true },
    { symbol: 'SOL', name: 'Sasol', value: 135.20, change: -1.45, isEquity: true },
    { symbol: 'ABG', name: 'Absa Group', value: 165.80, change: 0.75, isEquity: true }
  ]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);



  useEffect(() => {
    const tickInterval = setInterval(() => {
      setTickersData(prev => prev.map(item => {
        if (Math.random() > 0.4) return item;
        const pctChange = (Math.random() * 0.1 - 0.05) / 100;
        const newValue = item.value * (1 + pctChange);
        const newChange = item.change + (pctChange * 100);
        return { ...item, value: newValue, change: newChange };
      }));
    }, 3000);
    return () => clearInterval(tickInterval);
  }, []);

  const formatVal = (item) => {
    if (item.isIndex) return item.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (item.isCurrency) return `${item.value.toFixed(4)}`;
    return `R${item.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div 
      className="min-h-screen bg-nb-bg text-nb-text flex flex-col justify-start items-center relative overflow-hidden select-none"
      style={{
        backgroundImage: 'linear-gradient(rgba(44, 44, 46, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(44, 44, 46, 0.15) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }}
    >
      {/* Dynamic Cursor Spotlight Mesh */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0, 212, 255, 0.06), transparent 80%)`,
        }}
      />

      {/* Background Cyber Glowing Orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-nb-cyan/5 rounded-full blur-[140px] pointer-events-none z-0" />
      
      {/* Subtle Scan sweep line on background */}
      <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
        <div className="scan-line" />
      </div>

      {/* Marquee Ticker Tape at Top */}
      <div className="w-full bg-nb-surface/80 backdrop-blur-md border-b border-nb-border py-2 overflow-hidden relative z-20 flex select-none">
        <div className="flex gap-16 animate-marquee whitespace-nowrap pr-16">
          {tickersData.map((item, i) => (
            <span key={`ticker-1-${i}`} className="inline-flex items-center gap-2 font-mono text-[11px] font-bold">
              <span className="text-nb-muted">{item.symbol}</span>
              <span className="text-nb-text font-mono">{formatVal(item)}</span>
              <span className={item.change >= 0 ? "text-nb-emerald font-mono" : "text-nb-red font-mono"}>
                {item.change >= 0 ? '▲' : '▼'} {Math.abs(item.change).toFixed(2)}%
              </span>
            </span>
          ))}
        </div>
        <div className="flex gap-16 animate-marquee whitespace-nowrap pr-16" aria-hidden="true">
          {tickersData.map((item, i) => (
            <span key={`ticker-2-${i}`} className="inline-flex items-center gap-2 font-mono text-[11px] font-bold">
              <span className="text-nb-muted">{item.symbol}</span>
              <span className="text-nb-text font-mono">{formatVal(item)}</span>
              <span className={item.change >= 0 ? "text-nb-emerald font-mono" : "text-nb-red font-mono"}>
                {item.change >= 0 ? '▲' : '▼'} {Math.abs(item.change).toFixed(2)}%
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="w-full max-w-4xl relative z-10 flex flex-col justify-between flex-1 py-8 px-6 md:px-12">
        
        {/* Top telemetry and System Status */}
        <motion.div {...fadeUp(0)} className="flex flex-wrap items-center justify-between gap-4 border-b border-nb-border pb-4 mb-8">
          <div className="flex items-center gap-1.5 font-mono text-[9px] text-nb-emerald bg-nb-surface border border-nb-border px-3 py-1.5 rounded-[4px]">
            <span className="w-1.5 h-1.5 rounded-full bg-nb-emerald animate-pulse" />
            <span>ALL SYSTEMS NOMINAL // FRED_API: ONLINE // YFINANCE: READY</span>
          </div>
          <span className="font-mono text-[9px] text-nb-muted tracking-[0.2em] uppercase font-bold">
            VER_1.2.0 // ZA_PRODUCTION
          </span>
        </motion.div>

        {/* Hero Section */}
        <div className="my-auto">
          <motion.div {...fadeUp(0.1)} className="mb-8">
            <p className="font-mono text-xs md:text-sm tracking-[0.3em] text-nb-cyan mb-4 font-bold">
              {scrambledTagline}
            </p>
            <h1 className="font-mono text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
              <span className="nb-shiny-text">{scrambledTitle}</span>
            </h1>
            <p className="font-mono text-sm sm:text-base text-nb-muted leading-relaxed max-w-2xl">
              Construct, backtest, and analyse optimal asset weight allocations using mean-variance 
              and mean-semivariance mathematical frameworks. Custom-tailored for South African 
              equities listed on the Johannesburg Stock Exchange (JSE).
            </p>
          </motion.div>



          {/* Interactive Feature Cards */}
          <motion.div {...fadeUp(0.2)} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {[
              {
                num: '01',
                title: 'FETCH MARKET DATA',
                body: 'Pull 3 years of daily live JSE equity prices directly via Yahoo Finance. Automatically filter out assets with insufficient historical observations.',
                accent: '#00D4FF',
                numColor: 'text-nb-cyan',
                hoverShadow: 'hover:shadow-[4px_4px_0px_0px_#00D4FF] hover:border-nb-cyan',
              },
              {
                num: '02',
                title: 'OPTIMISE WEIGHTS',
                body: 'Compute Efficient Frontiers using Max Sharpe, Min Volatility, or Max Sortino formulations, backed by Ledoit-Wolf shrinkage and Monte Carlo paths.',
                accent: '#00C853',
                numColor: 'text-nb-emerald',
                hoverShadow: 'hover:shadow-[4px_4px_0px_0px_#00C853] hover:border-nb-emerald',
              },
              {
                num: '03',
                title: 'ANALYSE OUTCOMES',
                body: 'Inspect correlation heatmaps, sector exposure breakdowns, and dynamic historical backtests against custom benchmarks. Export results to CSV or PDF.',
                accent: '#FFB340',
                numColor: 'text-nb-amber',
                hoverShadow: 'hover:shadow-[4px_4px_0px_0px_#FFB340] hover:border-nb-amber',
              },
            ].map(({ num, title, body, accent, numColor, hoverShadow }) => (
              <div
                key={num}
                className={`border border-nb-border bg-nb-surface/60 backdrop-blur-sm p-6 transition-all duration-200 cursor-default rounded-[4px]
                           hover:-translate-y-1 hover:-translate-x-1 ${hoverShadow}
                           group flex flex-col justify-between min-h-[160px] relative overflow-hidden`}
              >
                {/* Subtle Blueprint Dot Grid Background */}
                <div 
                  className="absolute inset-0 opacity-[0.02] pointer-events-none" 
                  style={{
                    backgroundImage: 'radial-gradient(#E0E0E2 1px, transparent 1px)',
                    backgroundSize: '16px 16px'
                  }} 
                />
                <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: accent }} />
                <div className="pl-3">
                  <p className={`font-mono text-xs ${numColor} font-bold tracking-widest mb-3`}>
                    {num} / <ScrambleOnHover text={title} duration={500} />
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
              className="font-mono text-sm sm:text-base text-nb-cyan border-2 border-nb-cyan px-8 py-4 rounded-[4px]
                         nb-pop-btn tracking-widest hover:bg-nb-cyan/5 transition-colors font-bold shadow-[4px_4px_0px_0px_#2C2C2E]"
            >
              <ScrambleOnHover text="LAUNCH OPTIMISER ──────►" duration={600} />
            </button>
          </motion.div>
        </div>

        {/* Footer info bar */}
        <motion.div {...fadeUp(0.4)} className="mt-12 border-t border-nb-border pt-4 flex flex-wrap justify-between gap-4">
          <p className="font-mono text-[9px] text-nb-dim tracking-widest font-bold">
            POWERED BY · yfinance · PyPortfolioOpt · FRED API · FastAPI · React
          </p>
          <p className="font-mono text-[9px] text-nb-dim font-bold">
            © 2026 JSE PORTFOLIO OPTIMISER
          </p>
        </motion.div>

      </div>
    </div>
  );
}
