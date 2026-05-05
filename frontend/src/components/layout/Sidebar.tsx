'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useBiasBeacon, clearSessionStorage } from '@/context/BiasBeaconContext';
import UploadWizard from '@/components/ui/UploadWizard';

export default function Sidebar() {
  const pathname = usePathname();
  const [wizardOpen, setWizardOpen] = useState(false);
  const { state, dispatch } = useBiasBeacon();

  const safetyScore = state.metrics?.fairness_score ?? 88;
  const hasSession = !!(state.session || state.isDemo);

  const navItems = [
    { name: "Health Overview", href: "/", icon: "query_stats" },
    { name: "Time Machine", href: "/path", icon: "map" },
    { name: "Root Cause Explorer", href: "/trail", icon: "travel_explore" },
    { name: "Simulation Studio", href: "/fix", icon: "auto_fix_high" },
    { name: "Audit Report", href: "/record", icon: "auto_stories" },
  ];

  const handleUploadNew = () => {
    dispatch({ type: 'RESET' });
    clearSessionStorage();
    setWizardOpen(true);
  };

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
              <p className="text-[9px] font-bold text-charcoal/30 uppercase tracking-[0.2em] -mt-1">Bias is a bug, We fix it.</p>
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
                prefetch={false}
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

            {hasSession && state.session ? (
              /* Active session state */
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-sage/10 rounded-xl border border-sage/20">
                  <span className="material-symbols-outlined text-sage text-base mt-0.5">check_circle</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-charcoal truncate">{state.session.filename}</p>
                    <p className="text-[10px] text-charcoal/40 mt-0.5">
                      {state.session.row_count?.toLocaleString()} rows · {state.session.config?.protected_col}/{state.session.config?.target_col}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleUploadNew}
                  className="w-full py-2 border border-charcoal/15 rounded-xl text-[10px] font-bold text-charcoal/50 uppercase tracking-widest hover:bg-charcoal/5 transition-all"
                >
                  Upload New File
                </button>
              </div>
            ) : state.isDemo ? (
              /* Demo mode state */
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <span className="material-symbols-outlined text-amber-500 text-base">science</span>
                  <div>
                    <p className="text-xs font-bold text-charcoal">Demo Dataset Active</p>
                    <p className="text-[10px] text-charcoal/40">Bank Loans · Synthetic</p>
                  </div>
                </div>
                <button
                  onClick={handleUploadNew}
                  className="w-full py-2 border border-charcoal/15 rounded-xl text-[10px] font-bold text-charcoal/50 uppercase tracking-widest hover:bg-charcoal/5 transition-all"
                >
                  Upload Your CSV
                </button>
              </div>
            ) : (
              /* No session: show upload zone */
              <button
                onClick={() => setWizardOpen(true)}
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-sage/20 border-dashed rounded-2xl cursor-pointer hover:bg-sage/10 transition-all group"
              >
                <span className="material-symbols-outlined text-sage text-2xl mb-2 group-hover:scale-110 transition-transform">upload_file</span>
                <p className="text-[10px] font-bold text-sage/60 uppercase tracking-widest">Upload CSV</p>
              </button>
            )}
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

      <UploadWizard isOpen={wizardOpen} onClose={() => setWizardOpen(false)} />
    </>
  );
}
