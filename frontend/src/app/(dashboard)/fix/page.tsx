'use client';

import { useState, useEffect } from 'react';
import { fetchFromApi, API_BASE_URL } from '@/lib/api';
import { useBiasBeacon } from '@/context/BiasBeaconContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { motion } from 'framer-motion';

export default function MitigationHub() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [forecastData, setForecastData] = useState<any>(null);
  const [simResult, setSimResult] = useState<any>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(['years_at_current_address']);
  const [weights, setWeights] = useState<Record<string, number>>({ 'years_at_current_address': 1.0 });
  const [threshold, setThreshold] = useState(0.80);
  const { state } = useBiasBeacon();

  useEffect(() => {
    async function loadInitial() {
      try {
        const data = await fetchFromApi('/forecast/predict');
        setForecastData(data);
      } catch (err) {
        console.error('Failed to load forecast', err);
      }
    }
    loadInitial();
  }, []);

  const runSimulation = async () => {
    setIsSimulating(true);
    setShowResult(false);
    try {
      const result = await fetchFromApi('/api/simulate', {
        method: 'POST',
        body: JSON.stringify({
          feature: selectedFeatures[0],
          method: 'reweight',
          reference_group: 'White',
          threshold: threshold,
        }),
      });
      setSimResult(result);
      setShowResult(true);
    } catch (err) {
      console.error('Simulation failed', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const toggleFeature = (f: string) => {
    setSelectedFeatures(prev =>
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    );
  };

  const handleWeightChange = (f: string, w: number) =>
    setWeights(prev => ({ ...prev, [f]: w }));

  const features = (state.rootcause?.drift_table?.length ?? 0) > 0
    ? state.rootcause!.drift_table
        .filter((d: any) => d.drifted || d.psi > 0.05)
        .slice(0, 5)
        .map((d: any) => ({ id: d.feature, name: d.feature.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()), psi: d.psi }))
    : [
        { id: 'years_at_current_address', name: 'Address Stability', psi: 0.28 },
        { id: 'income', name: 'Annual Income', psi: 0.12 },
        { id: 'credit_score', name: 'Credit History', psi: 0.04 },
      ];

  const getChartData = (values: number[]) =>
    values.map((v, i) => ({ week: i + 1, di: parseFloat(v.toFixed(4)) }));

  // Use real DI series from API after simulation; fall back to forecast before
  const origChartData  = showResult && simResult?.orig_di_series
    ? getChartData(simResult.orig_di_series)
    : getChartData(forecastData?.values || []);
  const fixedChartData = showResult && simResult?.sim_di_series
    ? getChartData(simResult.sim_di_series)
    : [];

  // Derived display values — all come from the real API response
  const improvement      = simResult ? Math.abs(simResult.improvement * 100).toFixed(1) : null;
  const livesAffected    = simResult?.lives_affected ?? 0;
  const financialSavings = simResult?.financial_savings ?? 0;
  const gapClosed        = simResult ? (simResult.gap_closed * 100).toFixed(2) : null;
  const correctedDI      = simResult ? simResult.corrected_di.toFixed(3) : null;

  return (
    <div className="p-12 pb-32 max-w-7xl mx-auto flex flex-col lg:flex-row gap-12">
      {/* LEFT: CONTROL PANEL */}
      <aside className="w-full lg:w-[320px] space-y-8 shrink-0">
        <div className="space-y-4">
          <span className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">Workspace</span>
          <h1 className="headline-serif text-5xl text-charcoal">Simulation Studio</h1>
          <p className="text-sm text-charcoal/60 leading-relaxed italic">
            Experiment with restorative interventions to delay projected violations.
          </p>
        </div>

        {/* Threshold Slider */}
        <div className="space-y-3 p-5 glass-card border-none">
          <div className="flex justify-between items-center">
            <h4 className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">DI Threshold</h4>
            <span className="font-mono font-bold text-sage text-sm">{threshold.toFixed(2)}</span>
          </div>
          <input
            type="range" min="0.60" max="0.95" step="0.01"
            value={threshold}
            onChange={e => { setThreshold(parseFloat(e.target.value)); setShowResult(false); }}
            className="w-full h-1 bg-charcoal/10 rounded-full appearance-none accent-sage cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-charcoal/30 font-mono">
            <span>0.60 (lax)</span><span>0.80 (US)</span><span>0.95 (strict)</span>
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">Select Features to Balance</h4>
          <div className="space-y-3">
            {features.map(f => (
              <div key={f.id} className={`p-4 glass-card border-none transition-all ${selectedFeatures.includes(f.id) ? 'bg-sage/10 ring-1 ring-sage/30' : 'opacity-60'}`}>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-sm text-charcoal">{f.name}</span>
                  <button
                    onClick={() => toggleFeature(f.id)}
                    className={`w-10 h-5 rounded-full transition-all relative ${selectedFeatures.includes(f.id) ? 'bg-sage' : 'bg-charcoal/20'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${selectedFeatures.includes(f.id) ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
                {selectedFeatures.includes(f.id) && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-mono text-charcoal/40">
                      <span>Weight</span><span>{(weights[f.id] || 1).toFixed(1)}x</span>
                    </div>
                    <input
                      type="range" min="0.1" max="2.0" step="0.1"
                      value={weights[f.id] || 1}
                      onChange={e => handleWeightChange(f.id, parseFloat(e.target.value))}
                      className="w-full h-1 bg-charcoal/10 rounded-full appearance-none accent-sage cursor-pointer"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={runSimulation}
          disabled={isSimulating || selectedFeatures.length === 0}
          className="w-full py-6 bg-charcoal text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
        >
          {isSimulating ? 'Compiling Trajectory…' : 'Run Simulation'}
        </button>
      </aside>

      {/* RIGHT: RESULTS */}
      <main className="flex-1 space-y-12 min-w-0">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Before */}
          <div className="glass-card p-8 space-y-6">
            <h4 className="text-[10px] font-bold text-terracotta bg-terracotta/5 px-3 py-1 rounded-full w-max uppercase tracking-widest">Current Trajectory</h4>
            <div className="h-64 w-full min-h-[256px] min-w-[100px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <LineChart data={origChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="week" hide />
                  <YAxis domain={[0, 1.1]} hide />
                  <Tooltip formatter={(v: any) => v?.toFixed(3)} />
                  <ReferenceLine y={threshold} stroke="#C44536" strokeDasharray="4 4"
                    label={{ value: `≥${threshold.toFixed(2)}`, position: 'right', fontSize: 10, fill: '#C44536' }} />
                  <Line type="monotone" dataKey="di" stroke="#C44536" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center">
              <p className="text-sm font-serif italic text-charcoal/40">
                Predicted violation in Week {forecastData?.crossing_week ?? '?'}
              </p>
            </div>
          </div>

          {/* After */}
          <div className={`glass-card p-8 space-y-6 transition-all duration-700 ${showResult ? 'opacity-100' : 'opacity-20 grayscale'}`}>
            <h4 className="text-[10px] font-bold text-sage bg-sage/5 px-3 py-1 rounded-full w-max uppercase tracking-widest">Fair Model Forecast</h4>
            <div className="h-64 w-full min-h-[256px] min-w-[100px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <LineChart data={fixedChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="week" hide />
                  <YAxis domain={[0, 1.1]} hide />
                  <Tooltip formatter={(v: any) => v?.toFixed(3)} />
                  <ReferenceLine y={threshold} stroke="#C44536" strokeDasharray="4 4"
                    label={{ value: `≥${threshold.toFixed(2)}`, position: 'right', fontSize: 10, fill: '#C44536' }} />
                  {showResult && <Line type="monotone" dataKey="di" stroke="#5E7B5C" strokeWidth={3} dot={false} />}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center">
              <p className="text-sm font-serif italic text-sage">
                {showResult
                  ? `Corrected DI: ${correctedDI} (+${improvement}% improvement)`
                  : 'Run simulation to see impact'}
              </p>
            </div>
          </div>
        </div>

        {/* DYNAMIC IMPACT STATS */}
        {showResult && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 glass-card bg-white/50 border-none">
                <p className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest mb-2">Gap Closed</p>
                <p className="headline-serif text-3xl text-sage">{gapClosed}%</p>
                <p className="text-[10px] text-charcoal/30 mt-1">vs {threshold.toFixed(2)} threshold</p>
              </div>
              <div className="p-6 glass-card bg-white/50 border-none">
                <p className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest mb-2">DI Improvement</p>
                <p className="headline-serif text-3xl text-sage">+{improvement}%</p>
                <p className="text-[10px] text-charcoal/30 mt-1">
                  {simResult?.baseline_di?.toFixed(3)} → {correctedDI}
                </p>
              </div>
              <div className="p-6 glass-card bg-white/50 border-none">
                <p className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest mb-2">Lives Impacted</p>
                <p className="headline-serif text-3xl text-sage">{livesAffected.toLocaleString()}</p>
                <p className="text-[10px] text-charcoal/30 mt-1">annualised minority applicants</p>
              </div>
              <div className="p-6 glass-card bg-white/50 border-none">
                <p className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest mb-2">Financial Savings</p>
                <p className="headline-serif text-3xl text-sage">${(financialSavings / 1000).toFixed(0)}K</p>
                <p className="text-[10px] text-charcoal/30 mt-1">recovered loan revenue</p>
              </div>
            </div>

            <div className="bg-sage text-white p-10 rounded-3xl shadow-xl flex items-center gap-8 relative overflow-hidden">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-4xl">verified</span>
              </div>
              <div className="space-y-2 relative z-10">
                <p className="font-serif text-xl italic leading-relaxed">
                  Re-weighting <strong>'{selectedFeatures[0]?.replace(/_/g, ' ')}'</strong> closes{' '}
                  <strong>{gapClosed}%</strong> of the fairness gap at threshold {threshold.toFixed(2)}, impacting{' '}
                  <strong>{livesAffected.toLocaleString()} minority applicants</strong> annually and recovering
                  approximately <strong>${(financialSavings / 1000).toFixed(0)}K</strong> in loan revenue.
                </p>
              </div>
              <div className="absolute top-0 right-0 w-64 h-full bg-white/5 rotate-12 translate-x-24" />
            </div>

            <div className="flex justify-center">
              <a
                href={`/api/fix-script?feature=${selectedFeatures[0]}`}
                className="flex items-center gap-3 px-10 py-4 bg-charcoal text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-2xl"
              >
                <span className="material-symbols-outlined">download</span>
                Download fix.py
              </a>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
