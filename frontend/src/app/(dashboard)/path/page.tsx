'use client';

import { useState } from 'react';
import Modal from "@/components/ui/Modal";

export default function Path() {
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('Disparate Impact');
  const [selectedGroup, setSelectedGroup] = useState('Black / African American');

  return (
    <div className="p-12 pb-32 max-w-6xl mx-auto">
      <div className="mb-12 flex justify-between items-end">
        <div>
          <span className="font-sans font-bold text-[10px] tracking-widest text-charcoal/50 bg-cream px-3 py-1 rounded-full uppercase">Visualizing Progress</span>
          <h1 className="font-serif text-5xl text-charcoal mt-4">The Landscape of Fairness</h1>
          <p className="font-serif text-charcoal/60 italic mt-2 text-xl">Tracing the path from bias to restoration.</p>
        </div>
        
        <div className="flex gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-charcoal/30 uppercase tracking-widest ml-1">Metric</label>
            <select 
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="bg-cream border border-charcoal/10 rounded-xl px-4 py-2 font-serif text-sm outline-none"
            >
              <option>Disparate Impact</option>
              <option>Equalized Odds</option>
              <option>Demographic Parity</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-charcoal/30 uppercase tracking-widest ml-1">Protected Group</label>
            <select 
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="bg-cream border border-charcoal/10 rounded-xl px-4 py-2 font-serif text-sm outline-none"
            >
              <option>Black / African American</option>
              <option>Hispanic / Latino</option>
              <option>Female Identifying</option>
              <option>Age 40+</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-cream rounded-2xl border border-charcoal/5 shadow-organic p-12 h-[500px] relative overflow-hidden flex flex-col justify-center">
        {/* Placeholder for the "Landscape" Chart */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg width="100%" height="100%" viewBox="0 0 1000 400" preserveAspectRatio="none">
            <path d="M0,350 Q250,300 500,200 T1000,100" fill="none" stroke="#5E7B5C" strokeWidth="8" strokeDasharray="12 12" className="dashed-pencil" />
            <path d="M0,380 Q250,320 500,250 T1000,180" fill="none" stroke="#C44536" strokeWidth="4" opacity="0.3" />
          </svg>
        </div>

        <div className="relative z-10 text-center space-y-6 max-w-2xl mx-auto">
          <span className="material-symbols-outlined text-6xl text-sage animate-pulse">map</span>
          <h2 className="font-serif text-4xl text-charcoal">Charting the Journey for {selectedGroup}</h2>
          <p className="font-sans text-charcoal/70 leading-relaxed">
            The thick green path represents our collective movement toward equity for {selectedGroup} using the {selectedMetric} lens. 
          </p>
          
          <div className="flex justify-center gap-6 pt-6">
            <button 
              onClick={() => setIsAlertModalOpen(true)}
              className="flex items-center gap-2 px-6 py-2 bg-charcoal text-white rounded-lg font-serif text-sm hover:brightness-125 transition-all"
            >
              <span className="material-symbols-outlined text-sm">notifications_active</span>
              Set Fairness Alert
            </button>
            <button className="flex items-center gap-2 px-6 py-2 border border-charcoal/20 rounded-lg font-serif text-sm hover:bg-white transition-all">
              <span className="material-symbols-outlined text-sm">info</span>
              Explain Model
            </button>
          </div>
        </div>

        {/* Forecast Crossing Indicator */}
        <div className="absolute top-1/4 right-1/4 group cursor-help">
          <div className="w-1 h-32 bg-goldenrod/50 relative">
            <div className="absolute top-0 -left-2 w-5 h-5 bg-goldenrod rounded-full shadow-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-xs text-white">event</span>
            </div>
          </div>
          <div className="absolute top-8 left-4 bg-white p-4 rounded-xl shadow-xl border border-cream w-48 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-xs font-bold text-charcoal uppercase tracking-widest mb-1">Target Met</p>
            <p className="text-sm font-serif italic text-charcoal/70">March 15, 2024</p>
            <p className="text-[10px] mt-2 text-sage font-bold">Estimated Human Impact: +450 lives</p>
          </div>
        </div>
      </div>

      {/* Alert Modal */}
      <Modal 
        isOpen={isAlertModalOpen} 
        onClose={() => setIsAlertModalOpen(false)}
        title="Set Fairness Alert"
      >
        <div className="space-y-8">
          <p className="font-serif text-xl text-charcoal/70 italic">
            Receive a notification if the {selectedMetric} for {selectedGroup} falls below your threshold.
          </p>
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <span className="font-serif text-lg text-charcoal italic">Alert Threshold</span>
              <span className="font-serif text-2xl text-terracotta">0.75</span>
            </div>
            <input type="range" className="w-full accent-terracotta" min="0" max="1" step="0.05" defaultValue="0.75" />
            <div className="flex justify-between text-[10px] font-bold text-charcoal/30 uppercase">
              <span>Very Sensitive</span>
              <span>Lenient</span>
            </div>
          </div>
          <button className="w-full py-4 bg-sage text-white rounded-xl font-serif text-xl">
            Save Alert Rule
          </button>
        </div>
      </Modal>
      
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-6 border border-dashed border-charcoal/20 rounded-xl">
          <h4 className="font-serif text-xl text-charcoal mb-2">The Boundary of Trust</h4>
          <p className="text-sm text-charcoal/60">A threshold set at 0.80 — the legal and ethical limit for fair treatment.</p>
        </div>
        <div className="p-6 border border-dashed border-charcoal/20 rounded-xl">
          <h4 className="font-serif text-xl text-charcoal mb-2">The Clearing Skies</h4>
          <p className="text-sm text-charcoal/60">A predictive state where our mitigation strategies begin to show measurable results.</p>
        </div>
        <div className="p-6 border border-dashed border-charcoal/20 rounded-xl">
          <h4 className="font-serif text-xl text-charcoal mb-2">Human Centeredness</h4>
          <p className="text-sm text-charcoal/60">Every point on this chart represents a story. Hover to hear the whisper of the data.</p>
        </div>
      </div>
    </div>
  );
}
