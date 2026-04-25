'use client';

import { useState } from 'react';
import FairnessThermometer from "@/components/ui/FairnessThermometer";
import Modal from "@/components/ui/Modal";

export default function Home() {
  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);

  return (
    <div className="p-12 pb-32">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12">
        
        {/* Left Column: The Thermometer */}
        <div className="md:col-span-4">
          <FairnessThermometer percentage={42} />
        </div>

        {/* Right Column: Story Cards & Ticker */}
        <div className="md:col-span-8 space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <span className="font-sans font-bold text-[10px] tracking-widest text-charcoal/50 bg-cream px-3 py-1 rounded-full uppercase">Live Telemetry</span>
              <h3 className="font-serif text-5xl text-charcoal mt-4">Real-time Human Impact</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Lives Touched Card */}
            <div className="bg-cream p-8 rounded-2xl border border-charcoal/5 shadow-organic flex items-center justify-between group hover:-translate-y-1 transition-all cursor-default">
              <div>
                <p className="font-sans font-bold text-[10px] tracking-widest text-charcoal/40 mb-2 uppercase">Lives Touched</p>
                <h2 className="font-serif text-5xl text-terracotta">24,932,104</h2>
                <p className="font-serif text-charcoal/50 text-sm italic mt-1">Expanding every second...</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-terracotta/5 flex items-center justify-center border border-terracotta/10">
                <span className="material-symbols-outlined text-3xl text-terracotta group-hover:scale-110 transition-transform">volunteer_activism</span>
              </div>
            </div>

            {/* Financial Savings Card */}
            <div 
              className="bg-cream p-8 rounded-2xl border border-charcoal/5 shadow-organic flex items-center justify-between group hover:-translate-y-1 transition-all cursor-pointer"
              onClick={() => setIsSavingsModalOpen(true)}
            >
              <div>
                <p className="font-sans font-bold text-[10px] tracking-widest text-charcoal/40 mb-2 uppercase">Financial Savings</p>
                <h2 className="font-serif text-5xl text-sage">$2.34M</h2>
                <p className="font-serif text-charcoal/50 text-sm italic mt-1 underline decoration-dashed">View Breakdown</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-sage/5 flex items-center justify-center border border-sage/10">
                <span className="material-symbols-outlined text-3xl text-sage group-hover:scale-110 transition-transform">payments</span>
              </div>
            </div>
          </div>

          {/* Grid of Community Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Hispanic Community */}
            <div className="bg-cream p-8 rounded-2xl border border-charcoal/5 shadow-organic flex flex-col justify-between h-72 relative overflow-hidden group">
              <div className="relative z-10">
                <span className="font-sans font-bold text-[10px] tracking-widest text-sage bg-sage/10 px-3 py-1 rounded-full uppercase">Improving ↗</span>
                <h3 className="font-serif text-3xl text-charcoal mt-4">The Hispanic Community</h3>
                <p className="text-sm font-sans text-charcoal/70 mt-2 leading-relaxed">Representation in tech leadership has risen by 1.2% this quarter.</p>
              </div>
              <div className="mt-4 flex items-center gap-3 relative z-10">
                <div className="w-full h-1.5 bg-charcoal/5 rounded-full overflow-hidden">
                  <div className="w-2/3 h-full bg-sage"></div>
                </div>
                <span className="text-xs font-bold text-sage">67%</span>
              </div>
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-sage/5 rounded-full blur-2xl group-hover:bg-sage/10 transition-all"></div>
            </div>

            {/* Gender Gap */}
            <div className="bg-cream p-8 rounded-2xl border border-charcoal/5 shadow-organic flex flex-col justify-between h-72 group border-l-4 border-l-terracotta">
              <div>
                <span className="font-sans font-bold text-[10px] tracking-widest text-terracotta bg-terracotta/10 px-3 py-1 rounded-full flex items-center gap-1 w-max uppercase">
                  <span className="material-symbols-outlined text-xs">warning</span>
                  Action Needed
                </span>
                <h3 className="font-serif text-3xl text-charcoal mt-4">The Gender Gap</h3>
                <p className="text-sm font-sans text-charcoal/70 mt-2 leading-relaxed">Salary discrepancies in junior-level research roles remain stagnant.</p>
              </div>
              <div className="mt-auto">
                <button className="text-charcoal/50 font-sans font-bold text-[10px] tracking-widest border-b border-dashed border-charcoal/20 hover:text-terracotta hover:border-terracotta transition-colors uppercase">
                  View Disparity Report
                </button>
              </div>
            </div>
          </div>

          {/* Narrative Block */}
          <div className="mt-12 border-l-4 border-sage pl-10 py-6 bg-cream/50 rounded-r-2xl italic">
            <blockquote className="font-serif text-3xl text-charcoal/80 leading-relaxed">
              "Data is not just numbers; it's the quiet whisper of millions of stories waiting to be heard with clarity and compassion."
            </blockquote>
            <cite className="block mt-4 font-sans font-bold text-[10px] tracking-widest text-charcoal/40 uppercase not-italic">
              — Dr. Elena Thorne, Lead Ethnographer
            </cite>
          </div>
        </div>
      </div>

      {/* Savings Breakdown Modal */}
      <Modal 
        isOpen={isSavingsModalOpen} 
        onClose={() => setIsSavingsModalOpen(false)}
        title="Impact & Savings Breakdown"
      >
        <div className="space-y-8">
          <p className="font-serif text-xl text-charcoal/70 italic">
            By preventing counterfactual denials and optimizing for fairness, we've recovered lost potential and avoided litigation risks.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white rounded-xl border border-charcoal/5">
              <p className="text-[10px] font-bold text-charcoal/30 uppercase tracking-widest mb-1">Litigation Avoidance</p>
              <p className="font-serif text-3xl text-sage">$1.42M</p>
            </div>
            <div className="p-6 bg-white rounded-xl border border-charcoal/5">
              <p className="text-[10px] font-bold text-charcoal/30 uppercase tracking-widest mb-1">Market Recovery</p>
              <p className="font-serif text-3xl text-sage">$620K</p>
            </div>
            <div className="p-6 bg-white rounded-xl border border-charcoal/5">
              <p className="text-[10px] font-bold text-charcoal/30 uppercase tracking-widest mb-1">Retention Value</p>
              <p className="font-serif text-3xl text-sage">$300K</p>
            </div>
          </div>

          <div className="h-48 bg-charcoal/5 rounded-2xl flex items-center justify-center border border-dashed border-charcoal/10 relative overflow-hidden">
             <div className="absolute inset-0 opacity-10">
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                   <path d="M0,100 L20,80 L40,85 L60,60 L80,65 L100,30" fill="none" stroke="currentColor" strokeWidth="2" className="text-sage" />
                </svg>
             </div>
             <p className="font-serif text-charcoal/40 italic">Savings Timeline (12 Week Trajectory)</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
