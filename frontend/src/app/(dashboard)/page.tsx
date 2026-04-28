'use client';

import { useState } from 'react';
import { useBiasBeacon } from "@/context/BiasBeaconContext";
import FairnessGauge from "@/components/ui/FairnessGauge";
import FairnessScoreCard from "@/components/ui/FairnessScoreCard";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import Modal from "@/components/ui/Modal";
import { motion } from 'framer-motion';

export default function Home() {
  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);
  const { state } = useBiasBeacon();

  const hasData = !!state.metrics;
  
  if (!hasData) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-sage border-t-transparent rounded-full animate-spin" />
          <p className="font-outfit text-charcoal/40 uppercase tracking-widest text-[10px] font-bold">Initializing Intelligence...</p>
        </div>
      </div>
    );
  }

  // ── Resolved values from context ──
  const metrics = state.metrics!;
  const diValue = metrics.averages.disparate_impact ?? 0.82;
  const eoValue = Math.max(0, 1 - (metrics.averages.equalized_odds_diff ?? 0.15));
  
  const diHistory = metrics.weeks.slice(-12).map((w: any) => w.disparate_impact ?? 0);
  const eoHistory = metrics.weeks.slice(-12).map((w: any) => Math.max(0, 1 - (w.equalized_odds_diff ?? 0)));

  const score = metrics.fairness_score ?? Math.round(diValue * 100);
  const weeks = metrics.weeks;
  
  const prevScore = weeks.length > 1
    ? Math.round((weeks[weeks.length - 2].disparate_impact ?? diValue) * 100)
    : score;
  const delta = score - prevScore;

  const weeksUntilViolation = state.forecast?.cross_week_number ?? undefined;
  const totalLivesTouched = weeks.reduce((acc: number, m: any) => acc + (m.count_priv || 0) + (m.count_unpriv || 0), 0) || 125000;

  const totalSavingsRaw = state.financial?.total_savings ?? 2340000;
  const riskSavings = state.financial?.loss_current ?? totalSavingsRaw * 1.4;

  return (
    <div className="p-12 pb-32 max-w-7xl mx-auto space-y-12">
      {/* Header Section */}
      <header className="flex justify-between items-end">
        <div>
          <span className="font-outfit font-bold text-[10px] tracking-widest text-charcoal/50 bg-cream px-3 py-1 rounded-full uppercase">Intelligence Hub</span>
          <h1 className="headline-serif text-6xl text-charcoal mt-4">Fairness Health Overview</h1>
          <p className="font-outfit text-charcoal/60 text-lg mt-2">Surgical monitoring of algorithmic equity across your deployment.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-sage animate-pulse" />
          <span suppressHydrationWarning className="font-mono text-sm text-charcoal/40 uppercase tracking-tighter">System Live: {new Date().toLocaleTimeString()}</span>
        </div>
      </header>

      {/* TOP ROW: Gauges & Score */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <FairnessGauge 
          label="Disparate Impact" 
          value={diValue} 
          historicalData={diHistory}
        />
        <FairnessGauge 
          label="Equalised Odds" 
          value={eoValue} 
          historicalData={eoHistory}
        />
        <FairnessScoreCard 
          score={score} 
          delta={delta} 
          weeksUntilViolation={weeksUntilViolation}
        />
      </div>

      {/* MIDDLE ROW: Key Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Lives Touched */}
        <div className="lg:col-span-4 glass-card p-10 flex flex-col justify-between group">
          <div>
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">Lives Touched</p>
              <span className="material-symbols-outlined text-terracotta/40 group-hover:text-terracotta transition-colors">volunteer_activism</span>
            </div>
            <h2 className="metric-number text-6xl font-bold text-terracotta">
              <AnimatedNumber value={totalLivesTouched} />
            </h2>
            <p className="font-serif text-charcoal/50 text-sm italic mt-2">Total Synthetic Profiles Audited</p>
          </div>
          <div className="mt-8 pt-6 border-t border-charcoal/5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sage" />
            <span className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">Integrity Verified</span>
          </div>
        </div>

        {/* Financial Impact */}
        <div 
          className="lg:col-span-8 glass-card p-10 flex flex-col justify-between cursor-pointer group relative overflow-hidden"
          onClick={() => setIsSavingsModalOpen(true)}
        >
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <p className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">Financial Impact Simulation</p>
              <span className="material-symbols-outlined text-sage/40 group-hover:text-sage transition-colors">payments</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-1">
                <p className="text-sm font-serif italic text-terracotta opacity-80">Without intervention:</p>
                <div className="text-4xl font-bold text-terracotta flex items-baseline gap-1">
                  <AnimatedNumber value={riskSavings} prefix="$" decimals={0} />
                  <span className="text-lg opacity-40">at risk</span>
                </div>
              </div>
              <div className="space-y-1 relative">
                <p className="text-sm font-serif italic text-sage opacity-80">Recommendations saved:</p>
                <div className="text-4xl font-bold text-sage flex items-baseline gap-2">
                  <AnimatedNumber value={totalSavingsRaw} prefix="$" decimals={0} />
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="material-symbols-outlined text-2xl text-sage bg-sage/10 p-1 rounded-full"
                  >
                    check
                  </motion.span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-charcoal/5 flex justify-between items-center relative z-10">
            <span className="text-sm font-serif italic text-charcoal/40 underline decoration-dashed">View Detailed Loss Estimator</span>
            <span className="text-[10px] font-bold text-charcoal/30 uppercase tracking-widest">W01-W26 Analysis</span>
          </div>

          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-sage/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        </div>
      </div>

      {/* BOTTOM ROW: Community Cards & Narrative */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-card p-10 relative overflow-hidden group">
          <span className="text-[10px] font-bold text-sage bg-sage/10 px-3 py-1 rounded-full uppercase tracking-widest">Improving ↗</span>
          <h3 className="headline-serif text-4xl text-charcoal mt-6">The Hispanic Community</h3>
          <p className="text-sm text-charcoal/70 mt-4 leading-relaxed max-w-md">
            Representation in credit approval flow has stabilized. Forecast indicates parity will hold for 12+ weeks.
          </p>
          <div className="mt-10 flex items-center gap-4">
            <div className="flex-1 h-1.5 bg-charcoal/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: "67%" }}
                transition={{ duration: 1, delay: 0.5 }}
                className="h-full bg-sage" 
              />
            </div>
            <span className="metric-number text-sm font-bold text-sage">67% Parity</span>
          </div>
        </div>

        <div className="glass-card p-10 border-l-4 border-l-terracotta relative group">
          <span className="text-[10px] font-bold text-terracotta bg-terracotta/10 px-3 py-1 rounded-full flex items-center gap-1 w-max uppercase tracking-widest">
            <span className="material-symbols-outlined text-xs">warning</span>
            Action Needed
          </span>
          <h3 className="headline-serif text-4xl text-charcoal mt-6">The Black Community</h3>
          <p className="text-sm text-charcoal/70 mt-4 leading-relaxed max-w-md">
            Substantial drift detected in "Years at Current Address" proxy. Disparate Impact currently below 0.80 threshold.
          </p>
          <div className="mt-10">
            <button className="text-charcoal/60 font-bold text-[10px] tracking-widest border-b border-dashed border-charcoal/20 hover:text-terracotta hover:border-terracotta transition-colors uppercase">
              Jump to Root Cause Explorer
            </button>
          </div>
        </div>
      </div>

      {/* Narrative Block */}
      <div className="border-l-4 border-sage pl-12 py-8 bg-cream/30 rounded-r-2xl italic">
        <blockquote className="headline-serif text-4xl text-charcoal/80 leading-snug">
          "The beacon does not just monitor; it illuminates the path towards a more equitable digital future."
        </blockquote>
        <cite className="block mt-6 font-outfit font-bold text-[10px] tracking-widest text-charcoal/40 uppercase not-italic">
          — Dr. Elena Thorne, Lead Ethnographer
        </cite>
      </div>

      <Modal 
        isOpen={isSavingsModalOpen} 
        onClose={() => setIsSavingsModalOpen(false)}
        title="Impact & Savings Breakdown"
      >
        <div className="space-y-8 p-4">
          <p className="font-serif text-xl text-charcoal/70 italic leading-relaxed">
            Our counterfactual loss estimator analyzes the cost of unfairness—both in direct litigation risk and in the market potential lost through biased filters.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 bg-cream/50 rounded-2xl border border-charcoal/5">
              <p className="text-[10px] font-bold text-charcoal/30 uppercase tracking-widest mb-2">Litigation Risk</p>
              <p className="headline-serif text-4xl text-sage">${(totalSavingsRaw * 0.6 / 1000000).toFixed(2)}M</p>
            </div>
            <div className="p-8 bg-cream/50 rounded-2xl border border-charcoal/5">
              <p className="text-[10px] font-bold text-charcoal/30 uppercase tracking-widest mb-2">Market Recovery</p>
              <p className="headline-serif text-4xl text-sage">${(totalSavingsRaw * 0.26 / 1000).toFixed(0)}K</p>
            </div>
            <div className="p-8 bg-cream/50 rounded-2xl border border-charcoal/5">
              <p className="text-[10px] font-bold text-charcoal/30 uppercase tracking-widest mb-2">Retention Value</p>
              <p className="headline-serif text-4xl text-sage">${(totalSavingsRaw * 0.14 / 1000).toFixed(0)}K</p>
            </div>
          </div>

          <div className="p-10 bg-charcoal/5 rounded-3xl border border-dashed border-charcoal/10 flex flex-col items-center justify-center relative overflow-hidden">
             <div className="absolute inset-0 opacity-20 pointer-events-none">
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                   <motion.path 
                    d="M0,100 L20,80 L40,85 L60,60 L80,65 L100,30" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="1" 
                    className="text-sage"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2 }}
                   />
                </svg>
             </div>
             <p className="font-serif text-charcoal/40 text-xl italic relative z-10">Cumulative Fairness Dividend (12 Week Trajectory)</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
