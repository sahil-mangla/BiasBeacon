'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Trail() {
  const [selectedSuspectIndex, setSelectedSuspectIndex] = useState(0);

  const suspects = [
    { name: "Zip Code", score: 12, drift: "High", proxy: true, explanation: "Our investigation reveals that Zip Code correlates 0.82 with historical redlining districts. It’s creating an invisible barrier for families in the East District.", recommendation: "Apply Re-weighting Restoration" },
    { name: "Years of Experience", score: 85, drift: "Low", proxy: false, explanation: "This feature shows high integrity and correlates strongly with actual job performance across all demographic groups.", recommendation: "Maintain standard processing" },
    { name: "Education Level", score: 72, drift: "Medium", proxy: false, explanation: "Minor drift detected in recent applicant pools. Some schools from underserved regions are being underrepresented in the embeddings.", recommendation: "Normalize institutional weights" },
    { name: "Credit History Length", score: 45, drift: "Medium", proxy: true, explanation: "Acts as a proxy for age and generational wealth, inadvertently penalizing younger applicants and those from immigrant backgrounds.", recommendation: "Apply Reject-Option Classification" },
    { name: "Loan Amount", score: 92, drift: "Low", proxy: false, explanation: "A neutral feature that tracks closely with individual financial request patterns without group-based bias.", recommendation: "No action required" }
  ];

  const selectedSuspect = suspects[selectedSuspectIndex];

  return (
    <div className="p-12 pb-32 max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-12">
        <span className="font-sans font-bold text-[10px] tracking-widest text-charcoal/50 bg-cream px-3 py-1 rounded-full uppercase">Investigation</span>
        <h1 className="font-serif text-5xl text-charcoal mt-4">The Trail of Evidence</h1>
        <p className="font-serif text-charcoal/60 italic mt-2 text-xl">Uncovering the hidden proxies that distance us from fairness.</p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-12 min-h-[600px]">
        {/* Left Column: The Suspect List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 bg-cream/50 rounded-t-xl border-b border-charcoal/10">
            <h3 className="font-sans font-bold text-[10px] tracking-widest text-charcoal/40 uppercase">Candidate Features</h3>
          </div>
          {suspects.map((suspect, i) => (
            <div 
              key={i} 
              onClick={() => setSelectedSuspectIndex(i)}
              className={`p-6 rounded-xl border transition-all cursor-pointer group ${selectedSuspectIndex === i ? 'ring-2 ring-sage shadow-lg' : ''} ${suspect.proxy ? 'bg-terracotta/5 border-terracotta/20 hover:bg-terracotta/10' : 'bg-cream border-charcoal/5 hover:bg-white hover:shadow-md'}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-serif text-2xl text-charcoal">{suspect.name}</h4>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${suspect.drift === 'High' ? 'bg-terracotta text-white' : 'bg-sage/10 text-sage'}`}>
                      Drift: {suspect.drift}
                    </span>
                    {suspect.proxy && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-terracotta uppercase tracking-widest">
                        <span className="material-symbols-outlined text-xs">warning</span>
                        Proxy Alert
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-charcoal/30 uppercase tracking-widest">Human Connection</p>
                  <p className={`font-serif text-3xl ${suspect.score < 50 ? 'text-terracotta' : 'text-sage'}`}>{suspect.score}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: The Evidence Box / Map */}
        <div className="lg:col-span-8 bg-cream rounded-2xl border border-charcoal/5 shadow-organic overflow-hidden flex flex-col">
          <div className="p-8 border-b border-charcoal/10 flex justify-between items-center bg-white/50">
            <div>
              <h3 className="font-serif text-3xl text-charcoal italic">The Evidence: {selectedSuspect.name}</h3>
              <p className="font-sans text-xs text-charcoal/50 uppercase tracking-widest mt-1">Detailed Correlation Analysis</p>
            </div>
            <Link 
              href={`/fix?feature=${selectedSuspect.name}`}
              className="bg-sage text-white px-6 py-2 rounded-lg font-serif hover:brightness-105 transition-all"
            >
              Simulate Fix
            </Link>
          </div>
          
          <div className="flex-1 relative bg-[#EBE4D8] p-8 flex items-center justify-center">
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/pinstripe-dark.png')]"></div>
            
            <div className="relative z-10 w-full h-full border-2 border-charcoal/10 border-dashed rounded-xl flex items-center justify-center overflow-hidden">
               <div className="text-center space-y-4 max-w-md p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl animate-in fade-in zoom-in-95 duration-500">
                  <span className={`material-symbols-outlined text-5xl ${selectedSuspect.proxy ? 'text-terracotta' : 'text-sage'}`}>
                    {selectedSuspect.proxy ? 'location_on' : 'verified'}
                  </span>
                  <p className="font-serif text-2xl text-charcoal italic">"{selectedSuspect.explanation}"</p>
                  <div className="h-px w-24 bg-charcoal/10 mx-auto"></div>
                  <p className="text-xs font-bold text-terracotta uppercase tracking-widest">Recommendation: {selectedSuspect.recommendation}</p>
               </div>
            </div>
          </div>

          <div className="p-6 bg-charcoal/5 grid grid-cols-2 gap-4">
             <div className="text-center p-4 border-r border-charcoal/10">
                <p className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">Correlation to Protected Group</p>
                <p className="font-serif text-2xl text-terracotta">{selectedSuspect.proxy ? '0.82' : '0.04'}</p>
             </div>
             <div className="text-center p-4">
                <p className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">Potential Restored Approvals</p>
                <p className="font-serif text-2xl text-sage">{selectedSuspect.proxy ? '+128' : 'N/A'}</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
