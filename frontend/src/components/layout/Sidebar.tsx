'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import AnalysisModal from '@/components/ui/AnalysisModal';

export default function Sidebar() {
  const pathname = usePathname();
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);

  const navItems = [
    { name: "Story", href: "/story", icon: "history_edu" },
    { name: "Pulse", href: "/", icon: "query_stats" },
    { name: "Path", href: "/path", icon: "map" },
    { name: "Trail", href: "/trail", icon: "travel_explore" },
    { name: "Bias Mitigation Hub", href: "/fix", icon: "auto_fix_high" },
    { name: "Record", href: "/record", icon: "auto_stories" },
  ];

  return (
    <>
      <aside className="flex flex-col h-screen sticky top-0 left-0 bg-[#FDF8F0] h-full w-64 border-r border-dashed border-charcoal/20 shadow-organic z-40">
        <div className="p-8 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-terracotta text-3xl">favorite</span>
            <h1 className="text-xl font-bold font-serif text-charcoal">Bias Beacon</h1>
          </div>
          <p className="font-serif text-charcoal/70 italic text-sm">Empathetic Inquiry</p>
        </div>
        
        <nav className="flex-1 px-4 mt-2 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href}
                href={item.href} 
                className={`flex items-center gap-4 px-4 py-3 transition-all duration-300 rounded-lg group ${isActive ? 'bg-cream text-sage border-l-2 border-sage font-bold' : 'text-charcoal/60 hover:text-sage hover:bg-cream'}`}
              >
                <span className={`material-symbols-outlined transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>{item.icon}</span>
                <span className="font-serif">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-6 mb-8">
          <button 
            onClick={() => setIsAnalysisModalOpen(true)}
            className="w-full py-3 bg-sage text-white font-serif rounded-lg shadow-sm hover:brightness-105 transition-all active:scale-95"
          >
            New Analysis
          </button>
        </div>

        <div className="p-6 border-t border-dashed border-charcoal/20">
          <Link 
            href="/workshop" 
            className={`flex items-center gap-4 px-2 py-2 transition-colors ${pathname === '/workshop' ? 'text-charcoal' : 'text-charcoal/50 hover:text-charcoal'}`}
          >
            <span className="material-symbols-outlined text-xl">settings</span>
            <span className="text-xs font-serif tracking-wide uppercase">The Workshop</span>
          </Link>
          <Link href="#" className="flex items-center gap-4 px-2 py-2 text-charcoal/50 hover:text-charcoal transition-colors">
            <span className="material-symbols-outlined text-xl">help_outline</span>
            <span className="text-xs font-serif tracking-wide uppercase">Support</span>
          </Link>
        </div>
      </aside>

      <AnalysisModal 
        isOpen={isAnalysisModalOpen} 
        onClose={() => setIsAnalysisModalOpen(false)} 
      />
    </>
  );
}
