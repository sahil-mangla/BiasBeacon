'use client';

import { useState } from 'react';

export default function Workshop() {
  const [isPrivacyShieldActive, setIsPrivacyShieldActive] = useState(false);
  const [diThreshold, setDiThreshold] = useState(0.80);
  const [epsilon, setEpsilon] = useState(3.0);

  return (
    <div className="p-12 pb-32 max-w-5xl mx-auto">
      <div className="mb-12">
        <span className="font-sans font-bold text-[10px] tracking-widest text-charcoal/50 bg-cream px-3 py-1 rounded-full uppercase">Settings & Configuration</span>
        <h1 className="font-serif text-5xl text-charcoal mt-4">The Workshop</h1>
        <p className="font-serif text-charcoal/60 italic mt-2 text-xl">Fine-tuning the instruments of fairness.</p>
      </div>

      <div className="space-y-8">
        {/* Section: Data Connection */}
        <section className="bg-cream rounded-2xl border border-charcoal/5 shadow-organic overflow-hidden">
          <div className="p-8 border-b border-charcoal/5 flex justify-between items-center bg-white/30">
            <h3 className="font-serif text-2xl text-charcoal">Data Connection</h3>
            <span className="text-[10px] font-bold text-sage uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-sage rounded-full animate-pulse"></span>
              Live: 200ms Latency
            </span>
          </div>
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest ml-1">Source URL</label>
                <input 
                  type="text" 
                  value="https://api.internal-ledger.v1/telemetry" 
                  readOnly
                  className="w-full bg-white/50 border border-charcoal/10 rounded-xl px-4 py-3 font-sans text-sm text-charcoal/70 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest ml-1">Authentication Method</label>
                <div className="flex items-center gap-3 px-4 py-3 bg-white/50 border border-charcoal/10 rounded-xl text-sm text-charcoal/70">
                  <span className="material-symbols-outlined text-sage">verified_user</span>
                  OAuth 2.0 (Service Principal)
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Ethics Thresholds */}
        <section className="bg-cream rounded-2xl border border-charcoal/5 shadow-organic overflow-hidden">
          <div className="p-8 border-b border-charcoal/5 bg-white/30">
            <h3 className="font-serif text-2xl text-charcoal">Ethics Thresholds</h3>
          </div>
          <div className="p-8 space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <p className="font-serif text-xl text-charcoal italic">Disparate Impact Ratio</p>
                <span className="font-serif text-2xl text-sage">{diThreshold.toFixed(2)}</span>
              </div>
              <input 
                type="range" 
                min="0" max="1" step="0.01" 
                value={diThreshold}
                onChange={(e) => setDiThreshold(parseFloat(e.target.value))}
                className="w-full accent-sage" 
              />
              <p className="text-xs text-charcoal/50 leading-relaxed">
                The minimum acceptable ratio of favorable outcomes between protected and reference groups. 
                Setting this higher requires more aggressive mitigation.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <p className="font-serif text-xl text-charcoal italic">Differential Privacy (Epsilon)</p>
                <span className="font-serif text-2xl text-charcoal/60">{epsilon.toFixed(1)}</span>
              </div>
              <input 
                type="range" 
                min="0.1" max="10" step="0.1" 
                value={epsilon}
                onChange={(e) => setEpsilon(parseFloat(e.target.value))}
                className="w-full accent-charcoal" 
              />
              <p className="text-xs text-charcoal/50 leading-relaxed">
                Controls the noise level added to metrics to protect individual identities. 
                Higher values offer less privacy but higher accuracy.
              </p>
            </div>
          </div>
        </section>

        {/* Section: Privacy Shield */}
        <section className={`p-8 rounded-2xl border transition-all flex justify-between items-center ${isPrivacyShieldActive ? 'bg-sage/5 border-sage/20' : 'bg-charcoal/5 border-charcoal/10'}`}>
          <div className="flex items-center gap-6">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isPrivacyShieldActive ? 'bg-sage text-white' : 'bg-charcoal/10 text-charcoal/40'}`}>
              <span className="material-symbols-outlined">{isPrivacyShieldActive ? 'shield_lock' : 'shield'}</span>
            </div>
            <div>
              <h4 className="font-serif text-xl text-charcoal">Privacy Shield</h4>
              <p className="text-sm text-charcoal/50">When active, all metrics are obfuscated with Laplace noise before presentation.</p>
            </div>
          </div>
          <button 
            onClick={() => setIsPrivacyShieldActive(!isPrivacyShieldActive)}
            className={`px-8 py-2 rounded-lg font-serif transition-all ${isPrivacyShieldActive ? 'bg-sage text-white shadow-lg' : 'border border-charcoal/20 text-charcoal/40 hover:bg-white'}`}
          >
            {isPrivacyShieldActive ? 'Active' : 'Enable'}
          </button>
        </section>
      </div>
    </div>
  );
}
