'use client';

export default function FooterTicker() {
  const wins = [
    "Bias in 'Years of Experience' mitigated 2 hours ago",
    "Language localized for 4 underserved regions in Brazil",
    "Accessibility score reached 98% for screen readers",
    "Equity threshold met in Mid-Market Hiring Sector",
    "New methodology approved by Global Ethics Charter"
  ];

  return (
    <footer className="fixed bottom-0 w-full z-50 flex justify-between items-center px-8 py-3 bg-cream border-t border-dashed border-charcoal/20 overflow-hidden h-14">
      {/* Left: Ticker Label */}
      <div className="flex items-center gap-3 bg-cream z-10 pr-4">
        <span className="material-symbols-outlined text-sage">campaign</span>
        <span className="font-sans font-bold text-[10px] tracking-widest text-charcoal uppercase whitespace-nowrap">Recent Wins</span>
        <div className="h-4 w-px bg-charcoal/20"></div>
      </div>

      {/* Ticker Content */}
      <div className="flex-1 overflow-hidden relative">
        <div className="flex whitespace-nowrap gap-12 animate-marquee">
          {wins.map((win, i) => (
            <span key={i} className="font-serif text-xs tracking-wide text-charcoal/60">
              • {win}
            </span>
          ))}
          {/* Duplicate for seamless loop */}
          {wins.map((win, i) => (
            <span key={`dup-${i}`} className="font-serif text-xs tracking-wide text-charcoal/60">
              • {win}
            </span>
          ))}
        </div>
      </div>

      {/* Right: Links */}
      <div className="flex items-center gap-6 bg-cream z-10 pl-4">
        <a className="font-serif text-xs tracking-wide text-charcoal/50 hover:text-charcoal transition-all" href="#">Methodology</a>
        <a className="font-serif text-xs tracking-wide text-charcoal hover:text-sage transition-all font-medium underline" href="#">Ethics Charter</a>
        <span className="font-serif text-[10px] text-charcoal/40 ml-4">© 2024 Bias Beacon</span>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </footer>
  );
}
