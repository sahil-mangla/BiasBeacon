'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import AnalysisModal from '@/components/ui/AnalysisModal';

export default function Sidebar() {
  const pathname = usePathname();
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [safetyScore, setSafetyScore] = useState(88);

  const fetchSafetyScore = async () => {
    try {
      const res = await fetch('/metrics/latest');
      if (res.ok) {
        const data = await res.json();
        const di = data.disparate_impact || 0.88;
        setSafetyScore(Math.round(di * 100));
      }
    } catch (err) {
      console.error("Failed to fetch safety score", err);
    }
  };

  useEffect(() => {
    fetchSafetyScore();
  }, []);

  const navItems = [
    { name: "Health Overview", href: "/", icon: "query_stats" },
    { name: "Time Machine", href: "/path", icon: "map" },
    { name: "Root Cause Explorer", href: "/trail", icon: "travel_explore" },
    { name: "Simulation Studio", href: "/fix", icon: "auto_fix_high" },
    { name: "Audit Report", href: "/record", icon: "auto_stories" },
  ];

  return (
    <>
      <aside className="flex flex-col h-screen sticky top-0 left-0 bg-background w-72 border-r border-charcoal/5 shadow-organic z-40">
        <div className="p-10 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-terracotta flex items-center justify-center shadow-lg shadow-terracotta/20">
              <span className="material-symbols-outlined text-white text-2xl">insights</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold headline-serif text-charcoal">BiasBeacon</h1>
              <p className="text-[9px] font-bold text-charcoal/30 uppercase tracking-[0.2em] -mt-1">Algorithmic Equity</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-6 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href}
                href={item.href} 
                className={`flex items-center gap-4 px-5 py-4 transition-all duration-300 rounded-2xl group ${isActive ? 'bg-charcoal text-white shadow-xl' : 'text-charcoal/50 hover:text-charcoal hover:bg-charcoal/5'}`}
              >
                <span className={`material-symbols-outlined text-xl transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>{item.icon}</span>
                <span className="font-outfit font-bold text-sm tracking-wide">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-6 pb-4">
          <div className="p-6 rounded-3xl bg-sage/5 border border-sage/10 space-y-4">
            <h4 className="text-[10px] font-bold text-sage uppercase tracking-widest text-center">Data Management</h4>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-sage/20 border-dashed rounded-2xl cursor-pointer hover:bg-sage/10 transition-all group">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <span className="material-symbols-outlined text-sage text-2xl mb-2 group-hover:scale-110 transition-transform">upload_file</span>
                <p className="text-[10px] font-bold text-sage/60 uppercase tracking-widest">Upload CSV</p>
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept=".csv" 
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  const formData = new FormData();
                  formData.append('file', file);
                  
                  try {
                    const res = await fetch('/api/upload-data', {
                      method: 'POST',
                      body: formData
                    });
                    if (res.ok) {
                      window.location.reload();
                    }
                  } catch (err) {
                    console.error("Upload failed", err);
                  }
                }}
              />
            </label>
          </div>
        </div>

        <div className="p-8 border-t border-charcoal/5">
          <div className="p-4 rounded-2xl bg-sage/5 border border-sage/10 space-y-3">
            <p className="text-[10px] font-bold text-sage uppercase tracking-widest text-center">Safety Score: {safetyScore}%</p>
            <div className="h-1.5 w-full bg-sage/10 rounded-full overflow-hidden">
              <div className="h-full bg-sage transition-all duration-1000" style={{ width: `${safetyScore}%` }} />
            </div>
          </div>
        </div>
      </aside>

      <AnalysisModal 
        isOpen={isAnalysisModalOpen} 
        onClose={() => setIsAnalysisModalOpen(false)} 
      />
    </>
  );
}
