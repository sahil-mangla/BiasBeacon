'use client';

import { useState } from 'react';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AnalysisModal({ isOpen, onClose }: AnalysisModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div 
        className="bg-primary-container w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-[0_12px_40px_rgba(60,40,20,0.15)] border border-[#EBE4D8] relative animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-10 pt-10 pb-8 border-b border-dashed border-outline-variant">
          <h2 className="font-serif text-4xl text-charcoal">Begin a New Inquiry</h2>
          <p className="font-serif text-charcoal/60 italic text-xl mt-1">Define the scope of your search for truth.</p>
        </div>

        <div className="p-10 space-y-10">
          {/* Form Fields */}
          <div className="space-y-8">
            <div className="group">
              <label className="block font-serif text-xl italic text-charcoal mb-2">Analysis Title</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-outline text-lg">edit_note</span>
                <input 
                  className="w-full bg-[#FFF9EF] border-b border-outline/30 focus:border-charcoal px-10 py-3 font-sans text-sm outline-none transition-all placeholder:text-outline/50" 
                  placeholder="e.g. 2024 Cultural Pulse" 
                  type="text"
                />
              </div>
            </div>

            <div className="group">
              <label className="block font-serif text-xl italic text-charcoal mb-2">Data Source</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-outline text-lg">database</span>
                <select className="w-full bg-[#FFF9EF] border-b border-outline/30 focus:border-charcoal px-10 py-3 font-sans text-sm outline-none appearance-none transition-all">
                  <option>Applicant Pool 2024</option>
                  <option>Historical Hiring Data</option>
                  <option>Employee Sentiment Survey</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 text-outline pointer-events-none">expand_more</span>
              </div>
            </div>

            <div className="group">
              <label className="block font-serif text-xl italic text-charcoal mb-2">Primary Goals</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-3 text-outline text-lg">target</span>
                <textarea 
                  className="w-full bg-[#FFF9EF] border-b border-outline/30 focus:border-charcoal px-10 py-3 font-sans text-sm outline-none transition-all placeholder:text-outline/50 resize-none" 
                  placeholder="What story do you hope the data will tell?" 
                  rows={3}
                ></textarea>
              </div>
            </div>
          </div>

          {/* Template Selection */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-outline uppercase tracking-widest">Choose a Starting Path</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="text-left bg-[#FFF9EF] border border-[#EBE4D8] p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow group">
                <div className="w-10 h-10 rounded-full bg-charcoal/5 flex items-center justify-center mb-2 group-hover:bg-charcoal/10 transition-colors">
                  <span className="material-symbols-outlined text-charcoal text-lg">balance</span>
                </div>
                <span className="block font-serif text-lg leading-tight mb-1">Gender Equity Audit</span>
                <span className="block text-[11px] text-charcoal/50">Identify pay and role disparities.</span>
              </button>

              <button className="text-left bg-[#FFF9EF] border border-[#EBE4D8] p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow group">
                <div className="w-10 h-10 rounded-full bg-charcoal/5 flex items-center justify-center mb-2 group-hover:bg-charcoal/10 transition-colors">
                  <span className="material-symbols-outlined text-charcoal text-lg">public</span>
                </div>
                <span className="block font-serif text-lg leading-tight mb-1">Geographic Bias Review</span>
                <span className="block text-[11px] text-charcoal/50">Analyze regional hiring trends.</span>
              </button>

              <button className="text-left bg-charcoal/5 border border-charcoal/20 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow group">
                <div className="w-10 h-10 rounded-full bg-charcoal flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-white text-lg">draw</span>
                </div>
                <span className="block font-serif text-lg leading-tight mb-1">Custom Inquiry</span>
                <span className="block text-[11px] text-charcoal/50">Start with a clean slate.</span>
              </button>
            </div>
          </div>

          {/* Narrative Quote */}
          <div className="border-l-4 border-charcoal/10 pl-6 py-2 italic text-charcoal/60 font-serif text-lg">
            "Data is not just numbers; it is the collective whisper of many souls seeking to be heard."
          </div>

          {/* Call to Action */}
          <div className="flex items-center justify-between pt-4">
            <button 
              onClick={onClose}
              className="text-outline hover:text-charcoal font-sans text-sm underline underline-offset-4 decoration-outline/30 transition-colors"
            >
              Cancel
            </button>
            <button className="bg-charcoal text-white font-serif px-10 py-4 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-px transition-all flex items-center gap-2">
              <span>Initiate Analysis</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Close Button Icon */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-outline hover:text-charcoal transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  );
}
