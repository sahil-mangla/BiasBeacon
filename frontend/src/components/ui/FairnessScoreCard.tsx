'use client';

import { motion } from 'framer-motion';

interface FairnessScoreCardProps {
  score: number;
  delta: number;
  weeksUntilViolation?: number;
}

export default function FairnessScoreCard({ score, delta, weeksUntilViolation }: FairnessScoreCardProps) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getVerdict = () => {
    if (score >= 80) return { text: "Your model is healthy and stable.", color: "text-sage" };
    if (weeksUntilViolation) {
      return { 
        text: `Your model is at risk. Regulatory breach likely in ~${weeksUntilViolation} weeks.`, 
        color: "text-terracotta" 
      };
    }
    return { text: "Action required to restore trust.", color: "text-terracotta" };
  };

  const verdict = getVerdict();

  return (
    <div className="glass-card p-8 flex flex-col h-full">
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest mb-1">Overall Fairness Score</p>
          <div className="flex items-center gap-3">
            <span className="metric-number text-6xl font-bold text-charcoal">{score}</span>
            <div className={`flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${delta >= 0 ? 'bg-sage/10 text-sage' : 'bg-terracotta/10 text-terracotta'}`}>
              {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} pts
            </div>
          </div>
        </div>
        
        <div className="relative w-24 h-24">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="#e6e2e0"
              strokeWidth="8"
            />
            <motion.circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke={score >= 80 ? "#5E7B5C" : "#C44536"}
              strokeWidth="8"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center font-mono text-sm font-bold text-charcoal/30">
            {score}%
          </div>
        </div>
      </div>

      <div className="mt-auto pt-6 border-t border-charcoal/5">
        <p className={`font-serif text-lg italic leading-snug ${verdict.color}`}>
          "{verdict.text}"
        </p>
      </div>
    </div>
  );
}
