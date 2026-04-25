'use client';

import { useState } from 'react';

export default function MitigationHub() {
  const [activeModel, setActiveModel] = useState('Hiring AI');
  const [isSimulating, setIsSimulating] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [method, setMethod] = useState('Re-weighting');

  const runSimulation = () => {
    setIsSimulating(true);
    setShowResult(false);
    setTimeout(() => {
      setIsSimulating(false);
      setShowResult(true);
    }, 2000);
  };

  const models = ['Hiring AI', 'Credit Risk', 'Patient Care', 'Criminal Justice'];
  const methods = ['Re-weighting', 'Adversarial Debiasing', 'Oversampling'];

  return (
    <div className="p-12 pb-32 max-w-6xl mx-auto">
      {/* Header Section */}
      <header className="mb-12 text-center">
        <span className="font-sans font-bold text-[10px] tracking-widest text-charcoal/50 bg-cream px-3 py-1 rounded-full uppercase">Simulation Studio</span>
        <h1 className="font-serif text-5xl text-charcoal mt-4">The Mitigation Hub</h1>
        <p className="font-serif text-charcoal/60 italic mt-2 text-xl max-w-2xl mx-auto">
          A workspace to experiment with restorative interventions across diverse algorithmic landscapes.
        </p>
      </header>

      {/* Model Selector Tabs */}
      <div className="flex justify-center mb-12 gap-4 border-b border-charcoal/10">
        {models.map((model) => (
          <button 
            key={model}
            onClick={() => setActiveModel(model)}
            className={`px-6 py-2 font-serif italic text-lg transition-all border-b-2 ${activeModel === model ? 'border-charcoal text-charcoal' : 'border-transparent text-charcoal/30 hover:text-charcoal/60'}`}
          >
            {model}
          </button>
        ))}
      </div>

      <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
        {/* LEFT CARD: The Current Storm */}
        <section className="bg-cream p-10 shadow-organic border border-charcoal/5 rounded-2xl relative overflow-hidden flex flex-col group">
          <div className="flex justify-between items-start mb-6">
            <h2 className="font-serif text-3xl text-charcoal italic">The Current Storm</h2>
            <span className="px-3 py-1 bg-terracotta/10 text-terracotta font-sans text-[10px] font-bold rounded-full uppercase tracking-widest">Detected Bias</span>
          </div>
          
          <div className="relative w-full aspect-video mb-8 bg-charcoal/5 rounded-xl overflow-hidden border border-charcoal/10">
            <img 
              alt="Stormy weather illustration" 
              className="w-full h-full object-cover grayscale opacity-60 mix-blend-multiply" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDK0-fypMj59jAh99F-Bd8t2Wf97RLqbV2NtlC3hOoJtf5hAUF3x98HWy0LpIx8Z93zoaucUpMqOggXzcBSOv2VikLX4XSQV_KBw10sGQyrAjmZBR-t-giu9dQBU68MxR2K3ZF_NWEC_ZW2BiXq6TaHoraL-Ac3YkK_XoWht1Fzyq-hdbO7C-7Iq4scsHzG8mcK_ZsdrFsdMCCZC43HCqJ8kpFe6RFRrnthMeLz1ejtE2bWuFTTKpSvL7ED3ZBX5OX7q4dhxZPhVrA"
            />
            <div className="absolute inset-0 bg-charcoal/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-6xl opacity-40">cloudy_snowing</span>
            </div>
          </div>

          <div className="space-y-6 flex-1">
            <div className="flex items-center gap-4 p-4 bg-white/50 border-l-4 border-charcoal/20">
              <span className="material-symbols-outlined text-charcoal/40">warning</span>
              <p className="font-sans text-sm text-charcoal/70">Model "{activeModel}-v2" shows 32% lower recall for candidates from underrepresented zip codes.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/50 rounded-xl border border-charcoal/5">
                <span className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">Fairness Score</span>
                <p className="font-serif text-3xl text-charcoal">42%</p>
              </div>
              <div className="p-4 bg-white/50 rounded-xl border border-charcoal/5">
                <span className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">Demographic Parity</span>
                <p className="font-serif text-3xl text-charcoal">Low</p>
              </div>
            </div>
          </div>
        </section>

        {/* BETWEEN: The Deployment Bridge */}
        <div className="lg:absolute lg:left-1/2 lg:-translate-x-1/2 lg:top-1/2 lg:-translate-y-1/2 z-20 flex flex-col items-center justify-center py-8 lg:py-0">
          <div className="hidden lg:block h-20 w-px dashed-pencil opacity-30 mb-4"></div>
          <button 
            onClick={runSimulation}
            disabled={isSimulating}
            className={`bg-charcoal text-white py-6 px-10 rounded-full shadow-2xl hover:scale-105 transition-all flex flex-col items-center gap-1 group border-[6px] border-[#FDF8F0] relative disabled:opacity-50 disabled:scale-100 ${isSimulating ? 'animate-pulse' : ''}`}
          >
            <span className="material-symbols-outlined text-4xl mb-1">{isSimulating ? 'hourglass_top' : 'inventory_2'}</span>
            <span className="font-sans font-bold tracking-widest text-[9px] uppercase">
              {isSimulating ? 'Compiling Kit...' : 'Deploy Mitigation Kit'}
            </span>
            {!isSimulating && !showResult && (
              <div className="absolute -top-2 -right-2 bg-terracotta text-white text-[9px] font-bold px-3 py-1 rounded-full animate-bounce">DEPLOY</div>
            )}
          </button>
          <div className="hidden lg:block h-20 w-px dashed-pencil opacity-30 mt-4"></div>
        </div>

        {/* RIGHT CARD: Predicted Restoration */}
        <section className={`bg-cream p-10 shadow-organic border transition-all rounded-2xl relative overflow-hidden flex flex-col ${showResult ? 'border-sage/30' : 'border-charcoal/5 opacity-50 grayscale'}`}>
          <div className="flex justify-between items-start mb-6">
            <h2 className="font-serif text-3xl text-charcoal italic">Predicted Restoration</h2>
            <span className={`px-3 py-1 font-sans text-[10px] font-bold rounded-full uppercase tracking-widest ${showResult ? 'bg-sage/10 text-sage' : 'bg-charcoal/10 text-charcoal'}`}>
              {showResult ? 'Proposed Fix' : 'Simulated State'}
            </span>
          </div>

          {/* Toggle Controls */}
          <div className="flex flex-wrap gap-2 mb-8">
            {methods.map((m) => (
              <button 
                key={m}
                onClick={() => setMethod(m)}
                className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${method === m ? 'bg-charcoal text-white border-charcoal' : 'bg-white/50 text-charcoal/40 border-charcoal/10 hover:border-charcoal/30'}`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="relative w-full aspect-video mb-8 bg-charcoal/5 rounded-xl overflow-hidden border border-charcoal/10">
            <img 
              alt="Clearing skies illustration" 
              className={`w-full h-full object-cover transition-all duration-1000 ${showResult ? 'opacity-100' : 'opacity-20'}`} 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDQVeEHxG43B832ZclvblS_EMtltkTxAH53viXLgku2YDlbL9nTkHetsvCP6hcKlyxmBDg8ucPpV_0fvQOv9iaflGIaqErBfvi_oiZA4ipTT_0bB9RPIIUPljDKdeSg3nyKS-Plyv0mM52Wq3FqxBGn58Ib1mCNJkOsxFw4z4Z5CbwYQ5Cs5aJJD7FVpa_9Mld1mms02ZvKfdkH-L-sCt6fRM5VXitzM2D5iM8w1W3Z06ZGUOqRNuJlz6DMM4vjMEevyIwen4dnn44"
            />
            {showResult && <div className="absolute inset-0 bg-goldenrod/5 mix-blend-overlay"></div>}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`material-symbols-outlined text-6xl ${showResult ? 'text-goldenrod animate-pulse' : 'text-charcoal/10'}`}>
                {showResult ? 'wb_sunny' : 'wb_cloudy'}
              </span>
            </div>
          </div>

          <div className="space-y-6 flex-1">
            <div className={`flex items-center gap-4 p-4 border-l-4 transition-all ${showResult ? 'bg-sage/5 border-sage' : 'bg-white/50 border-charcoal/20'}`}>
              <span className={`material-symbols-outlined ${showResult ? 'text-sage' : 'text-charcoal/40'}`}>auto_awesome</span>
              <p className="font-sans text-sm text-charcoal/70">
                {showResult 
                  ? `${method} samples by socio-economic background predicted to close the gap by 28 points.`
                  : "Deploy the mitigation kit to visualize the restorative potential of your chosen intervention."
                }
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/50 rounded-xl border border-charcoal/5">
                <span className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">Est. Fairness</span>
                <p className={`font-serif text-3xl ${showResult ? 'text-sage' : 'text-charcoal'}`}>{showResult ? '96%' : '--%'}</p>
              </div>
              <div className="p-4 bg-white/50 rounded-xl border border-charcoal/5">
                <span className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">Dignity Index</span>
                <p className={`font-serif text-3xl ${showResult ? 'text-sage' : 'text-charcoal'}`}>{showResult ? 'High' : '--'}</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Narrative & Lantern Keeper Section */}
      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="md:col-span-2">
          <div className="flex gap-8 items-start">
            <div className="w-1 h-32 bg-charcoal/10 flex-shrink-0"></div>
            <div className="pt-2">
              <p className="font-serif italic text-3xl text-charcoal/70 leading-snug">
                "Justice is not a destination, but a constant recalibration of our tools toward the light of human dignity."
              </p>
              <footer className="mt-4 text-[10px] font-bold text-charcoal/30 uppercase tracking-widest">— Dr. Elara Vance, Ethics Lead</footer>
            </div>
          </div>
        </div>

        {/* Lantern Keeper Side Note */}
        <div className="bg-charcoal/5 p-8 border border-charcoal/10 rounded-2xl relative shadow-inner">
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-charcoal">lightbulb</span>
            <span className="font-serif italic text-xl text-charcoal">The Lantern Keeper</span>
          </div>
          <p className="text-sm text-charcoal/60 leading-relaxed italic">
            "Remember: a model is but a mirror. When the glass is warped, we do not simply polish the surface—we must understand why the heat of the world bent it so."
          </p>
        </div>
      </div>
    </div>
  );
}
