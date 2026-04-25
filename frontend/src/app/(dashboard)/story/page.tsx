'use client';

export default function StoryPage() {
  return (
    <div className="p-12 pb-32 max-w-6xl mx-auto">
      {/* Top App Bar Content Placeholder / Page Header */}
      <div className="flex justify-between items-center mb-12">
        <div className="text-2xl font-serif italic tracking-tighter text-charcoal">The Narrative Archive</div>
        <div className="flex gap-6 items-center">
          <span className="material-symbols-outlined text-charcoal/60 cursor-pointer">account_circle</span>
          <span className="material-symbols-outlined text-charcoal/60 cursor-pointer">print</span>
        </div>
      </div>

      {/* Archival Journal Container */}
      <article className="parchment-texture p-12 md:p-20 shadow-[0_4px_40px_rgba(100,80,60,0.12)] border border-[#EBE4D8] relative overflow-hidden rounded-sm">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-charcoal/5 via-sage/10 to-charcoal/5 opacity-30"></div>
        
        {/* Header Section */}
        <header className="text-center mb-16 space-y-4">
          <div className="inline-block px-4 py-1 border border-charcoal/20 text-[10px] font-bold tracking-[0.2em] mb-4 uppercase">Confidential Audit</div>
          <h2 className="font-serif text-5xl text-charcoal ink-bleed">The story of your model’s fairness.</h2>
          <p className="font-serif italic text-charcoal/60 text-xl max-w-2xl mx-auto opacity-80">An archival testimony of model RE-42, observed on the 14th of October, 2024.</p>
        </header>

        {/* Narrative Block: The Context */}
        <section className="mb-20">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
            <div className="md:col-span-4 italic font-serif text-3xl text-charcoal leading-tight">
              "The machine saw numbers where we saw families."
            </div>
            <div className="md:col-span-8 space-y-6">
              <p className="font-serif text-xl text-charcoal/70 leading-relaxed">
                This report documents the ethical trajectory of Model RE-42. Through our empathetic auditing process, we discovered that while the model achieved 94% technical accuracy, its 'Fairness Pulse' revealed a widening gap in service delivery across rural demographics.
              </p>
            </div>
          </div>
        </section>

        <div className="border-t border-dashed border-charcoal/20 my-16"></div>

        {/* Bento Grid of Visual Testimony */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {/* Sketched Graph Card */}
          <div className="md:col-span-2 bg-[#FFF9EF] p-8 rounded-xl border border-charcoal/5 shadow-sm relative overflow-hidden group">
            <h4 className="text-[10px] font-bold tracking-widest mb-6 uppercase text-charcoal/30">Demographic Drift (Hand-traced)</h4>
            <div className="h-64 w-full flex items-end justify-between gap-4">
              <div className="w-12 bg-sage/10 border-t-2 border-charcoal/40 h-[40%] relative group-hover:h-[45%] transition-all duration-700">
                <div className="absolute -top-8 left-0 font-serif italic text-sm text-charcoal/60">Group A</div>
              </div>
              <div className="w-12 bg-charcoal/5 h-[85%] relative group-hover:h-[80%] transition-all duration-700 border-t-2 border-charcoal/10">
                <div className="absolute -top-8 left-0 font-serif italic text-sm text-charcoal/60">Group B</div>
              </div>
              <div className="w-12 bg-sage/10 border-t-2 border-charcoal/40 h-[30%] relative group-hover:h-[35%] transition-all duration-700">
                <div className="absolute -top-8 left-0 font-serif italic text-sm text-charcoal/60">Group C</div>
              </div>
              <div className="w-12 bg-charcoal/5 h-[65%] relative group-hover:h-[60%] transition-all duration-700 border-t-2 border-charcoal/10">
                <div className="absolute -top-8 left-0 font-serif italic text-sm text-charcoal/60">Group D</div>
              </div>
            </div>
            <div className="mt-8 font-serif italic text-charcoal/40 text-center">Sketch 1.4: Disparity observed in regional bias variance.</div>
          </div>

          {/* Ink Wash Texture Visual */}
          <div className="bg-[#FFF9EF] p-8 rounded-xl border border-charcoal/5 shadow-sm flex flex-col justify-center items-center text-center">
            <div className="w-32 h-32 rounded-full mb-6 border-2 border-dashed border-charcoal/20 flex items-center justify-center p-2">
              <div className="w-full h-full rounded-full bg-charcoal/10" style={{ clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)' }}></div>
            </div>
            <h4 className="font-serif text-2xl text-charcoal mb-2 italic">Bias Saturation</h4>
            <p className="text-sm font-serif text-charcoal/50">Low intensity bias detected in spectral layers 2-5.</p>
          </div>
        </section>

        {/* Checklist Section */}
        <section className="max-w-3xl mx-auto mb-20 space-y-8">
          <h3 className="font-serif text-4xl text-charcoal border-b border-charcoal/10 pb-4 italic">The Ethical Checklist</h3>
          <div className="space-y-6">
            <div className="flex gap-4 items-start">
              <span className="material-symbols-outlined text-charcoal text-2xl">check_box</span>
              <div>
                <h5 className="font-serif font-bold text-xl text-charcoal">Gender Neutrality Recalibrated</h5>
                <p className="text-charcoal/50 italic font-serif">Weights adjusted to balance pronoun-based selection bias.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <span className="material-symbols-outlined text-charcoal text-2xl">check_box</span>
              <div>
                <h5 className="font-serif font-bold text-xl text-charcoal">Geographic Parity Validated</h5>
                <p className="text-charcoal/50 italic font-serif">Rural and urban access points matched at 98% parity.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start opacity-40">
              <span className="material-symbols-outlined text-charcoal text-2xl">check_box_outline_blank</span>
              <div>
                <h5 className="font-serif font-bold text-xl text-charcoal">Historical Redress in Progress</h5>
                <p className="text-charcoal/50 italic font-serif">Correction of 1950s training data artifacts currently at 64% completion.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Human Signed Signature Area */}
        <footer className="mt-32 pt-16 border-t border-charcoal/10 flex flex-col md:flex-row justify-between items-end gap-12">
          <div className="space-y-4 max-w-md">
            <p className="font-serif italic text-charcoal/70 leading-relaxed text-lg">
              I hereby attest that this model has been scrutinized with the utmost empathy and intellectual rigor. We find it fit for the service of the public good, with the caveats noted above.
            </p>
            <div className="pt-8">
              <div className="font-serif italic text-4xl mb-1 ink-bleed tracking-widest text-charcoal">Dr. Elias Thorne</div>
              <div className="w-64 h-px bg-charcoal/20 mb-2"></div>
              <div className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">Lead Auditor, Human-Centric Systems</div>
            </div>
          </div>
          <div className="text-right">
            <div className="mb-4">
              <div className="w-24 h-24 bg-terracotta/10 rounded-full border border-terracotta/20 flex items-center justify-center p-2 rotate-12">
                <div className="w-full h-full border border-terracotta/30 rounded-full flex items-center justify-center border-dashed">
                  <span className="material-symbols-outlined text-terracotta text-3xl">verified</span>
                </div>
              </div>
            </div>
            <div className="font-serif text-sm text-charcoal/40 italic">Seal of Authenticity #09281-FF</div>
          </div>
        </footer>
      </article>

      {/* FAB Content */}
      <div className="fixed bottom-12 right-12 z-50">
        <button className="bg-charcoal text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:scale-105 transition-transform">
          <span className="material-symbols-outlined">share</span>
        </button>
      </div>
    </div>
  );
}
