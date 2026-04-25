'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SetupWizard() {
  const [step, setStep] = useState(1);
  const [sourceType, setSourceType] = useState<'csv' | 'api' | null>(null);

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-4xl w-full bg-cream rounded-3xl border border-charcoal/5 shadow-2xl p-12 relative overflow-hidden">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-charcoal/5">
          <div 
            className="h-full bg-sage transition-all duration-700" 
            style={{ width: `${(step / 3) * 100}%` }}
          ></div>
        </div>

        {/* Step Content */}
        <div className="space-y-12">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-terracotta text-3xl">favorite</span>
              <h1 className="text-2xl font-bold font-serif text-charcoal">Bias Beacon</h1>
            </div>
            <span className="font-sans font-bold text-[10px] tracking-widest text-charcoal/30 uppercase">
              Step {step} of 3
            </span>
          </div>

          {step === 1 && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="text-center space-y-4">
                <h2 className="font-serif text-5xl text-charcoal">Where does your data live?</h2>
                <p className="font-serif text-charcoal/60 italic text-xl">Choose the source of your empathetic inquiry.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <button 
                  onClick={() => setSourceType('csv')}
                  className={`p-10 rounded-2xl border-2 transition-all text-left space-y-6 ${sourceType === 'csv' ? 'border-sage bg-sage/5 shadow-inner' : 'border-charcoal/5 bg-white hover:border-charcoal/20'}`}
                >
                  <span className="material-symbols-outlined text-5xl text-charcoal/20">upload_file</span>
                  <div>
                    <h3 className="font-serif text-2xl text-charcoal">Upload CSV</h3>
                    <p className="text-sm text-charcoal/50 mt-2">Best for historical analysis and static datasets.</p>
                  </div>
                </button>

                <button 
                  onClick={() => setSourceType('api')}
                  className={`p-10 rounded-2xl border-2 transition-all text-left space-y-6 ${sourceType === 'api' ? 'border-sage bg-sage/5 shadow-inner' : 'border-charcoal/5 bg-white hover:border-charcoal/20'}`}
                >
                  <span className="material-symbols-outlined text-5xl text-charcoal/20">sync_alt</span>
                  <div>
                    <h3 className="font-serif text-2xl text-charcoal">Connect Live API</h3>
                    <p className="text-sm text-charcoal/50 mt-2">Monitor real-time decisions as they happen.</p>
                  </div>
                </button>
              </div>

              {sourceType && (
                <div className="flex justify-center pt-8">
                  <button 
                    onClick={nextStep}
                    className="px-12 py-4 bg-sage text-white rounded-xl font-serif text-xl shadow-lg hover:scale-105 transition-all"
                  >
                    Continue to Mapping
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="text-center space-y-4">
                <h2 className="font-serif text-5xl text-charcoal">Define the Landscape</h2>
                <p className="font-serif text-charcoal/60 italic text-xl">Map your data columns to human attributes.</p>
              </div>

              <div className="space-y-6 max-w-2xl mx-auto">
                <div className="grid grid-cols-2 gap-8 items-center">
                  <span className="font-serif text-xl text-charcoal italic">Protected Attribute</span>
                  <select className="bg-white border border-charcoal/10 rounded-xl px-4 py-3 font-sans text-sm outline-none">
                    <option>Ethnicity</option>
                    <option>Gender</option>
                    <option>Age</option>
                    <option>Disability Status</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-8 items-center">
                  <span className="font-serif text-xl text-charcoal italic">Outcome (Target)</span>
                  <select className="bg-white border border-charcoal/10 rounded-xl px-4 py-3 font-sans text-sm outline-none">
                    <option>is_approved</option>
                    <option>loan_status</option>
                    <option>hiring_decision</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-8 items-center">
                  <span className="font-serif text-xl text-charcoal italic">Reference Group</span>
                  <select className="bg-white border border-charcoal/10 rounded-xl px-4 py-3 font-sans text-sm outline-none">
                    <option>White / Caucasian</option>
                    <option>Male</option>
                    <option>Ages 25-45</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between pt-12">
                <button onClick={prevStep} className="font-serif text-charcoal/40 hover:text-charcoal transition-colors">Back</button>
                <button 
                  onClick={nextStep}
                  className="px-12 py-4 bg-sage text-white rounded-xl font-serif text-xl shadow-lg hover:scale-105 transition-all"
                >
                  Start Monitoring
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <div className="space-y-4">
                <div className="w-24 h-24 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-8">
                  <span className="material-symbols-outlined text-5xl text-sage animate-spin">sync</span>
                </div>
                <h2 className="font-serif text-5xl text-charcoal">Generating the Baseline</h2>
                <p className="font-serif text-charcoal/60 italic text-xl">Listening to the stories within your data...</p>
              </div>

              <div className="max-w-md mx-auto space-y-4">
                <div className="w-full h-1 bg-charcoal/5 rounded-full overflow-hidden">
                  <div className="w-3/4 h-full bg-sage animate-pulse"></div>
                </div>
                <p className="text-[10px] font-bold text-charcoal/30 uppercase tracking-widest">
                  Computing Fairness Metrics (PSI, Disparate Impact, KS-Test)
                </p>
              </div>

              <div className="pt-12">
                <Link 
                  href="/"
                  className="px-12 py-4 bg-charcoal text-white rounded-xl font-serif text-xl shadow-lg hover:scale-105 transition-all"
                >
                  Enter the Dashboard
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
