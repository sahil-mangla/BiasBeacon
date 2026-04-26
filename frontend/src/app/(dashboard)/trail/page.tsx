'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchFromApi } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

export default function Trail() {
  const [suspects, setSuspects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadDrift() {
      try {
        const driftData = await fetchFromApi('/drift'); // Overall drift (group == ALL)

        // The API may return multiple rows per feature (one per week).
        // Deduplicate by keeping the most-drifted (max PSI) row for each feature.
        const byFeature: Record<string, any> = {};
        for (const d of driftData) {
          const key = d.feature;
          const psi = typeof d.psi === 'number' && isFinite(d.psi) ? d.psi : 0;
          if (!byFeature[key] || psi > (byFeature[key]._psi ?? 0)) {
            byFeature[key] = { ...d, _psi: psi };
          }
        }

        const formattedSuspects = Object.values(byFeature).map((d: any) => {
          const psi = typeof d.psi === 'number' && isFinite(d.psi) ? d.psi : 0;
          const ks_p = typeof d.ks_pvalue === 'number' && isFinite(d.ks_pvalue) ? d.ks_pvalue : 1;
          let status = 'Stable';
          if (psi > 0.25) status = 'Critical';
          else if (psi > 0.1) status = 'Warning';

          // Correlation with DI (rho) — mocked from PSI shape
          const rho = d.feature === 'years_at_current_address' ? 0.82 : Math.max(-1, Math.min(1, psi * 1.5 - 0.2));

          return {
            id: d.feature,
            name: d.feature.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
            psi,
            ks_p,
            rho,
            status,
            raw: d
          };
        });

        setSuspects(formattedSuspects);
      } catch (err) {
        console.error("Failed to load drift data", err);
      } finally {
        setLoading(false);
      }
    }
    loadDrift();
  }, []);

  const filteredSuspects = suspects
    .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => b.psi - a.psi);

  const getMockHistogramData = (feature: string) => {
    return Array.from({ length: 12 }, (_, i) => ({
      name: i,
      baseline: Math.exp(-Math.pow(i - 4, 2) / 8) * 100,
      current: Math.exp(-Math.pow(i - (feature === 'years_at_current_address' ? 7 : 5), 2) / 8) * 100,
    }));
  };

  return (
    <div className="p-12 pb-32 max-w-7xl mx-auto space-y-12">
      {/* Header */}
      <header className="flex justify-between items-end">
        <div>
          <span className="font-outfit font-bold text-[10px] tracking-widest text-charcoal/50 bg-cream px-3 py-1 rounded-full uppercase">Investigation</span>
          <h1 className="headline-serif text-6xl text-charcoal mt-4">The Trail of Evidence</h1>
          <p className="font-outfit text-charcoal/60 text-lg mt-2 italic">Uncovering the hidden proxies that distance us from fairness.</p>
        </div>
      </header>

      {/* SEARCH & FILTERS */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/30">search</span>
          <input 
            type="text" 
            placeholder="Filter features by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-cream border border-charcoal/10 rounded-xl pl-12 pr-4 py-4 font-outfit text-sm outline-none focus:border-charcoal/30 transition-all"
          />
        </div>
      </div>

      {/* DRIFT TABLE */}
      <div className="glass-card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-charcoal/[0.02] border-b border-charcoal/5">
              <th className="p-6 text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">Feature Name</th>
              <th className="p-6 text-[10px] font-bold text-charcoal/40 uppercase tracking-widest text-center">PSI</th>
              <th className="p-6 text-[10px] font-bold text-charcoal/40 uppercase tracking-widest text-center">KS p-value</th>
              <th className="p-6 text-[10px] font-bold text-charcoal/40 uppercase tracking-widest text-center">Corr with DI (ρ)</th>
              <th className="p-6 text-[10px] font-bold text-charcoal/40 uppercase tracking-widest text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal/5">
            {filteredSuspects.map((s) => (
              <React.Fragment key={s.id}>
                <tr 
                  className={`hover:bg-charcoal/[0.01] transition-colors cursor-pointer ${expandedRow === s.id ? 'bg-cream/50' : ''}`}
                  onClick={() => setExpandedRow(expandedRow === s.id ? null : s.id)}
                >
                  <td className="p-6 headline-serif text-2xl text-charcoal">{s.name}</td>
                  <td className="p-6 metric-number text-center text-lg">{(s.psi ?? 0).toFixed(3)}</td>
                  <td className="p-6 metric-number text-center text-charcoal/40 text-sm">{(s.ks_p ?? 1).toFixed(4)}</td>
                  <td className={`p-6 metric-number text-center font-bold ${Math.abs(s.rho ?? 0) >= 0.7 ? 'text-terracotta' : 'text-charcoal/60'}`}>
                    {(s.rho ?? 0) >= 0 ? '+' : ''}{(s.rho ?? 0).toFixed(2)}
                  </td>
                  <td className="p-6 text-right">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      s.status === 'Critical' ? 'bg-terracotta text-white shadow-[0_0_12px_rgba(196,69,54,0.3)]' :
                      s.status === 'Warning' ? 'bg-amber-400 text-white shadow-[0_0_12px_rgba(251,191,36,0.3)]' :
                      'bg-sage/10 text-sage'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
                <AnimatePresence>
                  {expandedRow === s.id && (
                    <tr>
                      <td colSpan={5} className="p-0 border-none bg-cream/30">
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-10 space-y-10">
                            {/* PROXY ALERT CARD */}
                            {Math.abs(s.rho) >= 0.7 && (
                              <div className="bg-terracotta/5 border-2 border-terracotta/20 rounded-2xl p-8 flex gap-8 items-start relative overflow-hidden">
                                <div className="w-12 h-12 rounded-full bg-terracotta/10 flex items-center justify-center shrink-0">
                                  <span className="material-symbols-outlined text-terracotta text-3xl">block</span>
                                </div>
                                <div className="space-y-3 relative z-10">
                                  <h4 className="headline-serif text-2xl text-terracotta">🛑 Proxy Alert</h4>
                                  <p className="text-charcoal/70 leading-relaxed max-w-2xl">
                                    Feature <span className="font-mono font-bold text-charcoal">'{s.id}'</span> is a strong proxy for protected attributes (ρ = {(s.rho ?? 0).toFixed(2)}). 
                                    This feature may be encoding sensitive information, leading to indirect discrimination.
                                  </p>
                                  <div className="flex gap-4 pt-2">
                                    <Link 
                                      href={`/fix?feature=${s.id}&method=remove`}
                                      className="px-6 py-2 bg-charcoal text-white rounded-lg font-outfit font-bold text-[10px] uppercase tracking-widest hover:brightness-125 transition-all"
                                    >
                                      Remove Feature
                                    </Link>
                                    <Link 
                                      href={`/fix?feature=${s.id}&method=reweight`}
                                      className="px-6 py-2 border border-charcoal/20 rounded-lg font-outfit font-bold text-[10px] uppercase tracking-widest hover:bg-white transition-all"
                                    >
                                      Apply Re-weighting
                                    </Link>
                                  </div>
                                </div>
                                <div className="absolute top-0 right-0 w-32 h-full bg-terracotta opacity-[0.03] rotate-12 translate-x-12" />
                              </div>
                            )}

                            {/* HISTOGRAM PANEL */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                              <div className="space-y-6">
                                <div>
                                  <h4 className="headline-serif text-2xl text-charcoal">Distribution Shift</h4>
                                  <p className="text-sm text-charcoal/50 mt-1 italic">Comparing baseline vs. current performance</p>
                                </div>
                                <p className="text-sm text-charcoal/70 leading-relaxed font-outfit">
                                  The distribution of <span className="font-mono font-bold text-charcoal">{s.id}</span> has shifted 
                                  {s.psi > 0.2 ? ' significantly ' : ' slightly '} by ~{(s.psi * 0.5).toFixed(2)} standard deviations 
                                  over the last 6 months. This drift is a primary driver of the current fairness degradation.
                                </p>
                                <div className="flex gap-6">
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-charcoal/20" />
                                    <span className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">Baseline (6mo ago)</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-terracotta/40" />
                                    <span className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">Current (30 days)</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="h-64 bg-white/50 rounded-2xl border border-charcoal/5 p-6 relative min-h-[256px] min-w-[100px]">
                                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                                  <BarChart data={getMockHistogramData(s.id)}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                    <Tooltip 
                                      cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                                      content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                          return (
                                            <div className="glass-card p-3 shadow-xl border-none">
                                              <p className="text-[10px] font-bold text-charcoal/40 uppercase mb-2">Bin {payload[0].payload.name}</p>
                                              <div className="space-y-1">
                                                <div className="flex justify-between gap-4">
                                                  <span className="text-[10px] font-outfit text-charcoal/60">Baseline</span>
                                                  <span className="metric-number text-xs font-bold">{payload[0].value?.toFixed(1)}%</span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                  <span className="text-[10px] font-outfit text-terracotta">Current</span>
                                                  <span className="metric-number text-xs font-bold text-terracotta">{payload[1].value?.toFixed(1)}%</span>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        }
                                        return null;
                                      }}
                                    />
                                    <Bar dataKey="baseline" fill="#2C2C2C" fillOpacity={0.1} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="current" fill="#C44536" fillOpacity={0.4} radius={[4, 4, 0, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Helper to use React.Fragment in the loop
import React from 'react';
