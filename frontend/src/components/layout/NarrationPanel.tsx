'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const script = [
  {
    title: "1. The Health Overview",
    text: "Start by showing the 'Fairness Health Overview'. Note how Disparate Impact has drifted below 0.80, triggering the 'Action Needed' status for the Black community."
  },
  {
    title: "2. Root Cause Investigation",
    text: "Navigate to 'Root Cause Explorer'. Search for 'Address Stability'. Expand the row to reveal the distribution shift and the Proxy Alert for redlining."
  },
  {
    title: "3. Time Machine",
    text: "Go to 'Time Machine'. Point out the red violation banner. Set an alert threshold at 0.82 to show the proactive monitoring capabilities."
  },
  {
    title: "4. Simulation & Fix",
    text: "Open 'Simulation Studio'. Toggle 'Address Stability', adjust the weight to 0.8x, and run simulation. Show how the violation is delayed by 18 weeks."
  },
  {
    title: "5. Audit & Commitment",
    text: "Finally, go to 'Audit Report'. Generate a new audit to show the certified PDF. This is the 'Fairness Ledger' for regulatory compliance."
  }
];

export default function NarrationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  return (
    <div className="fixed right-8 bottom-24 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="w-80 glass-card p-6 mb-4 shadow-2xl border-sage/20 bg-cream/90 backdrop-blur-xl"
          >
            <div className="flex justify-between items-center mb-4">
              <h4 className="headline-serif text-xl text-sage">Demo Script</h4>
              <button onClick={() => setIsOpen(false)} className="material-symbols-outlined text-charcoal/30 hover:text-charcoal transition-colors">close</button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-sage uppercase tracking-widest">{script[step].title}</p>
                <p className="text-sm text-charcoal/70 leading-relaxed font-outfit">
                  {script[step].text}
                </p>
              </div>
              
              <div className="flex justify-between items-center pt-2">
                <span className="text-[10px] font-mono text-charcoal/30">{step + 1} / {script.length}</span>
                <div className="flex gap-2">
                  <button 
                    disabled={step === 0}
                    onClick={() => setStep(s => s - 1)}
                    className="w-8 h-8 rounded-full border border-charcoal/10 flex items-center justify-center disabled:opacity-30 hover:bg-white transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                  </button>
                  <button 
                    disabled={step === script.length - 1}
                    onClick={() => setStep(s => s + 1)}
                    className="w-8 h-8 rounded-full bg-sage text-white flex items-center justify-center disabled:opacity-30 hover:brightness-110 transition-all shadow-lg shadow-sage/20"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-charcoal text-white shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group relative"
      >
        <span className="material-symbols-outlined text-2xl group-hover:rotate-12 transition-transform">auto_stories</span>
        {!isOpen && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-terracotta rounded-full border-2 border-background animate-bounce" />
        )}
      </button>
    </div>
  );
}
