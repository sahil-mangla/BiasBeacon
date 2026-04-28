'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBiasBeacon, saveSessionToStorage } from '@/context/BiasBeaconContext';
import { uploadFile, postMetrics, postForecast, postRootcause, postSimulate, postFinancial, fetchDemoData } from '@/lib/apiClient';

const STEPS = [
  'Data loaded',
  'Computing 6 fairness metrics',
  'Forecasting DI over 8 weeks',
  'Detecting feature drift',
  'Preparing simulation engine',
  'Checking mitigation options',
];

interface Props { isOpen: boolean; onClose: () => void; }

export default function UploadWizard({ isOpen, onClose }: Props) {
  const { dispatch } = useBiasBeacon();
  const [step, setStep] = useState<'drop' | 'map' | 'progress' | 'report'>('drop');
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadInfo, setUploadInfo] = useState<any>(null);
  const [columnMap, setColumnMap] = useState<any>({});
  const [progressStep, setProgressStep] = useState(-1);
  const [progressPct, setProgressPct] = useState(0);
  const [results, setResults] = useState<any>({});
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setUploadPct(0);
    try {
      const info = await uploadFile(file, setUploadPct);
      setUploadInfo(info);
      setColumnMap({
        target_col: info.detected_target,
        protected_col: info.detected_protected,
        date_col: info.detected_date || '',
        privileged_group: info.detected_privileged || '',
      });
      setStep('map');
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.csv')) handleFile(file);
    else setError('Please drop a .csv file');
  }, []);

  if (!isOpen) return null;

  const loadDemo = async () => {
    setError(null);
    try {
      const data = await fetchDemoData();
      dispatch({ type: 'SET_DEMO', payload: { metrics: data.metrics, forecast: data.forecast, rootcause: data.rootcause, simulation: null, financial: data.financial, uploadInfo: null } });
      onClose();
    } catch (e: any) { setError(e.message); }
  };

  // ── Step 2 → run pipeline ────────────────────────────────────────────────

  const runAnalysis = async () => {
    setStep('progress');
    setProgressStep(0); setProgressPct(5);
    const sid = uploadInfo.session_id;
    const r: any = {};

    const advance = (s: number, pct: number) => { setProgressStep(s); setProgressPct(pct); };

    try {
      advance(0, 10);
      await new Promise(res => setTimeout(res, 400));

      advance(1, 20);
      r.metrics = await postMetrics({ session_id: sid, ...columnMap, date_col: columnMap.date_col || null });
      dispatch({ type: 'SET_METRICS', payload: r.metrics });

      advance(2, 40);
      try {
        r.forecast = await postForecast(sid);
        dispatch({ type: 'SET_FORECAST', payload: r.forecast });
      } catch (e: any) {
        r.forecast = null; // graceful: not enough weeks
      }

      advance(3, 60);
      r.rootcause = await postRootcause(sid);
      dispatch({ type: 'SET_ROOTCAUSE', payload: r.rootcause });

      advance(4, 80);
      const simFeature = r.rootcause?.likely_cause_feature || 'income';
      try {
        r.simulation = await postSimulate({ feature: simFeature });
        dispatch({ type: 'SET_SIMULATION', payload: r.simulation });
      } catch { r.simulation = null; }

      advance(5, 90);
      r.financial = await postFinancial(sid);
      dispatch({ type: 'SET_FINANCIAL', payload: r.financial });

      advance(5, 100);
      const session = { session_id: sid, filename: uploadInfo.filename || 'dataset.csv', row_count: uploadInfo.row_count, config: columnMap };
      dispatch({ type: 'SET_SESSION', payload: session });
      saveSessionToStorage(session, { metrics: r.metrics, forecast: r.forecast, rootcause: r.rootcause, simulation: r.simulation, financial: r.financial });

      setResults(r);
      setStep('report');
    } catch (e: any) {
      setError(e.message);
      setStep('map');
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────

  const allGroupsDI = results.metrics?.all_groups || {};
  const refGroup = columnMap.privileged_group;
  const statusIcon = (s: string) => s === 'PASS' ? '✅' : s === 'WARN' ? '🟡' : '🔴';
  const statusLabel = (s: string) => s === 'PASS' ? 'Compliant' : s === 'WARN' ? 'Borderline' : 'Violation';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-charcoal/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#FDFAF4] w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-[#EBE4D8] relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-10 pt-10 pb-6 border-b border-dashed border-charcoal/10 flex justify-between items-start">
          <div>
            <p className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest mb-1">
              {step === 'drop' ? 'Step 1 of 4' : step === 'map' ? 'Step 2 of 4' : step === 'progress' ? 'Step 3 of 4' : 'Baseline Report'}
            </p>
            <h2 className="font-serif text-3xl text-charcoal">
              {step === 'drop' ? 'Upload Your Dataset' : step === 'map' ? 'Confirm Column Mapping' : step === 'progress' ? 'Analysing Dataset…' : 'Your Baseline Report'}
            </h2>
          </div>
          {step !== 'progress' && (
            <button onClick={onClose} className="text-charcoal/30 hover:text-charcoal transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>

        <div className="p-10 space-y-8">

          {/* ── STEP 1: FILE DROP ── */}
          <AnimatePresence mode="wait">
            {step === 'drop' && (
              <motion.div key="drop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <div
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => inputRef.current?.click()}
                  className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${isDragging ? 'border-sage bg-sage/10' : 'border-charcoal/20 hover:bg-charcoal/[0.02]'}`}
                >
                  <span className="material-symbols-outlined text-4xl text-charcoal/40 mb-3">upload_file</span>
                  <p className="font-bold text-charcoal/60">Drop your CSV file here or click to browse</p>
                  <p className="text-[11px] text-charcoal/30 mt-1">Supports .csv files up to 50MB</p>
                  {uploadPct > 0 && uploadPct < 100 && (
                    <div className="w-48 h-1 bg-charcoal/10 rounded-full overflow-hidden mt-4">
                      <div className="h-full bg-sage transition-all" style={{ width: `${uploadPct}%` }} />
                    </div>
                  )}
                </div>
                <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-charcoal/10" />
                  <span className="text-[10px] font-bold text-charcoal/30 uppercase tracking-widest">Or</span>
                  <div className="flex-1 h-px bg-charcoal/10" />
                </div>

                <button onClick={loadDemo} className="w-full py-4 border border-charcoal/15 rounded-xl font-outfit font-bold text-sm text-charcoal/60 hover:bg-charcoal/5 transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-base">table_view</span>
                  Load Demo Dataset — Bank Loans 13,000 rows
                </button>

                {error && <p className="text-terracotta text-sm font-outfit">{error}</p>}
              </motion.div>
            )}

            {/* ── STEP 2: COLUMN MAP ── */}
            {step === 'map' && uploadInfo && (
              <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="p-4 bg-sage/5 rounded-xl border border-sage/20 flex items-center gap-3">
                  <span className="material-symbols-outlined text-sage">check_circle</span>
                  <p className="text-sm font-outfit text-charcoal">
                    <strong>{uploadInfo.row_count?.toLocaleString()} rows</strong>, {uploadInfo.columns?.length} columns loaded
                  </p>
                </div>

                {[
                  { label: 'Protected Attribute', key: 'protected_col', hint: 'e.g. race, gender', options: uploadInfo.columns },
                  { label: 'Outcome Column (binary 0/1)', key: 'target_col', hint: 'Must be 0/1', options: uploadInfo.columns },
                  { label: 'Timestamp Column', key: 'date_col', hint: 'For trend analysis (optional)', options: ['', ...uploadInfo.columns] },
                ].map(field => {
                  const isAuto = uploadInfo[`detected_${field.key.replace('_col', '')}` as any] === columnMap[field.key];
                  return (
                    <div key={field.key} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-charcoal/50 uppercase tracking-widest">{field.label}</label>
                        {columnMap[field.key] && (
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${isAuto ? 'bg-sage/15 text-sage' : 'bg-amber-100 text-amber-600'}`}>
                            {isAuto ? '🔍 Auto-detected' : '✏ Modified'}
                          </span>
                        )}
                      </div>
                      <select
                        value={columnMap[field.key] || ''}
                        onChange={e => setColumnMap((p: any) => ({ ...p, [field.key]: e.target.value }))}
                        className="w-full bg-white border border-charcoal/10 rounded-xl px-4 py-3 font-outfit text-sm outline-none focus:border-charcoal/30 transition-all"
                      >
                        {field.options.map((c: string) => <option key={c} value={c}>{c || '(None)'}</option>)}
                      </select>
                      <p className="text-[10px] text-charcoal/30 pl-1">{field.hint}</p>
                    </div>
                  );
                })}

                {/* Privileged group dropdown — populated from unique values of protected col */}
                {columnMap.protected_col && uploadInfo.unique_values?.[columnMap.protected_col] && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-charcoal/50 uppercase tracking-widest">Privileged / Reference Group</label>
                    <select
                      value={columnMap.privileged_group || ''}
                      onChange={e => setColumnMap((p: any) => ({ ...p, privileged_group: e.target.value }))}
                      className="w-full bg-white border border-charcoal/10 rounded-xl px-4 py-3 font-outfit text-sm outline-none focus:border-charcoal/30"
                    >
                      {uploadInfo.unique_values[columnMap.protected_col].map((v: any) => (
                        <option key={String(v)} value={String(v)}>{String(v)}</option>
                      ))}
                    </select>
                  </div>
                )}

                {error && <p className="text-terracotta text-sm font-outfit">{error} <button className="underline ml-2" onClick={() => setError(null)}>Retry</button></p>}

                <div className="flex justify-between pt-4">
                  <button onClick={() => { setStep('drop'); setError(null); }} className="text-charcoal/40 hover:text-charcoal text-sm underline underline-offset-4">← Back</button>
                  <button
                    onClick={runAnalysis}
                    disabled={!columnMap.target_col || !columnMap.protected_col || !columnMap.privileged_group}
                    className="bg-charcoal text-white px-8 py-3 rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-40 flex items-center gap-2"
                  >
                    Run Analysis <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: PROGRESS ── */}
            {step === 'progress' && (
              <motion.div key="progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8 py-4">
                <div className="space-y-4">
                  {STEPS.map((label, i) => {
                    const done = i < progressStep;
                    const running = i === progressStep;
                    return (
                      <div key={i} className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${done ? 'bg-sage' : running ? 'bg-amber-400 animate-pulse' : 'bg-charcoal/10'}`}>
                          {done ? <span className="material-symbols-outlined text-white text-xs">check</span>
                            : running ? <div className="w-2 h-2 bg-white rounded-full" />
                            : <div className="w-2 h-2 bg-charcoal/20 rounded-full" />}
                        </div>
                        <span className={`text-sm font-outfit ${done ? 'text-sage font-bold' : running ? 'text-charcoal font-bold' : 'text-charcoal/30'}`}>{label}</span>
                        {done && <span className="text-[10px] text-sage/60 ml-auto uppercase font-bold tracking-widest">Done</span>}
                        {running && <span className="text-[10px] text-amber-500 ml-auto uppercase font-bold tracking-widest animate-pulse">Running</span>}
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <div className="h-2 w-full bg-charcoal/5 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-sage rounded-full" animate={{ width: `${progressPct}%` }} transition={{ duration: 0.4 }} />
                  </div>
                  <p className="text-right text-[10px] font-mono text-charcoal/40">{progressPct}%</p>
                </div>

                {error && (
                  <div className="p-4 bg-terracotta/5 border border-terracotta/20 rounded-xl flex justify-between items-center">
                    <p className="text-terracotta text-sm">{error}</p>
                    <button onClick={() => { setError(null); setStep('map'); }} className="text-[10px] font-bold uppercase tracking-widest border border-terracotta/30 px-3 py-1 rounded text-terracotta hover:bg-terracotta/10">Retry</button>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── STEP 4: BASELINE REPORT ── */}
            {step === 'report' && (
              <motion.div key="report" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">📊 Baseline Report</p>
                  <p className="text-sm text-charcoal/60 font-outfit">
                    Protected attribute: <strong>{columnMap.protected_col}</strong> (ref: {refGroup})
                  </p>
                </div>

                {/* Per-group DI breakdown */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">Disparate Impact Ratio</p>
                  {Object.entries(allGroupsDI).filter(([g]) => g !== refGroup).map(([group, info]: [string, any]) => (
                    <div key={group} className="flex items-center justify-between p-4 bg-cream/50 rounded-xl border border-charcoal/5">
                      <span className="font-serif text-lg text-charcoal">{group} applicants</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-charcoal">{info.di_vs_reference?.toFixed(3)}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${info.status === 'PASS' ? 'bg-sage/10 text-sage' : info.status === 'WARN' ? 'bg-amber-100 text-amber-600' : 'bg-terracotta/10 text-terracotta'}`}>
                          {statusIcon(info.status)} {statusLabel(info.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Key stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-cream/50 rounded-xl border border-charcoal/5">
                    <p className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest mb-1">Fairness Score</p>
                    <p className="font-serif text-3xl text-charcoal">{results.metrics?.fairness_score ?? '—'}</p>
                  </div>
                  <div className="p-4 bg-cream/50 rounded-xl border border-charcoal/5">
                    <p className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest mb-1">Weekly Snapshots</p>
                    <p className="font-serif text-3xl text-charcoal">{results.metrics?.weeks?.length ?? '—'}</p>
                  </div>
                  {results.forecast?.cross_date && (
                    <div className="col-span-2 p-4 bg-terracotta/5 border border-terracotta/20 rounded-xl">
                      <p className="text-[10px] font-bold text-terracotta uppercase tracking-widest mb-1">Forecast</p>
                      <p className="text-sm text-charcoal font-outfit">DI will fall below 0.80 on <strong>{results.forecast.cross_date}</strong> ({results.forecast.confidence_pct}% confidence)</p>
                    </div>
                  )}
                  {results.rootcause?.likely_cause_feature && !results.rootcause.skipped && (
                    <div className="col-span-2 p-4 bg-cream/50 rounded-xl border border-charcoal/5">
                      <p className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest mb-1">Top Root Cause</p>
                      <p className="text-sm text-charcoal font-outfit">{results.rootcause.alert}</p>
                    </div>
                  )}
                  {results.financial && (
                    <div className="col-span-2 grid grid-cols-2 gap-4">
                      <div className="p-4 bg-terracotta/5 rounded-xl border border-terracotta/10">
                        <p className="text-[10px] font-bold text-terracotta uppercase tracking-widest mb-1">At Risk</p>
                        <p className="font-serif text-2xl text-terracotta">${(results.financial.loss_current / 1000).toFixed(0)}K</p>
                      </div>
                      <div className="p-4 bg-sage/5 rounded-xl border border-sage/10">
                        <p className="text-[10px] font-bold text-sage uppercase tracking-widest mb-1">Savings Available</p>
                        <p className="font-serif text-2xl text-sage">${(results.financial.savings / 1000).toFixed(0)}K</p>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={onClose}
                  className="w-full py-5 bg-charcoal text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  <span className="material-symbols-outlined">dashboard</span>
                  View Full Dashboard →
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
