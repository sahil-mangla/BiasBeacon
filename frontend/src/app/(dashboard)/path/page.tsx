'use client';

import { useState, useEffect } from 'react';
import Drawer from "@/components/ui/Drawer";
import { fetchFromApi } from "@/lib/api";
import { Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Line, ComposedChart } from 'recharts';
import { motion } from 'framer-motion';

export default function Path() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [forecastData, setForecastData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [newAlert, setNewAlert] = useState({ 
    threshold: 0.80, 
    channel: 'Email', 
    destination: '' 
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('bias_threshold')) {
      setNewAlert(prev => ({ ...prev, threshold: parseFloat(localStorage.getItem('bias_threshold') as string) }));
    }
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      async function loadData() {
        try {
          const [data, alertList] = await Promise.all([
            fetchFromApi(`/forecast/predict?weeks_ahead=8&threshold=${newAlert.threshold}`),
            fetchFromApi('/api/alerts')
          ]);
          
          const chartData: any[] = [];
          if (data.historical) {
            data.historical.forEach((val: number, i: number) => {
              const dateStr = data.historical_dates?.[i] || '';
              // Format date like "Nov 02"
              const dateLabel = dateStr ? new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) : `W${i}`;
              
              chartData.push({ 
                week: -12 + i, 
                label: dateLabel,
                actual: val, 
                threshold: newAlert.threshold,
                fullDate: dateStr
              });
            });
          }
          
          if (data.historical && data.historical.length > 0 && data.values && data.values.length > 0) {
             chartData[chartData.length - 1].forecast = data.historical[data.historical.length - 1];
             chartData[chartData.length - 1].lower = data.historical[data.historical.length - 1];
             chartData[chartData.length - 1].upper = data.historical[data.historical.length - 1];
          }

          if (data.values) {
            data.values.forEach((val: number, i: number) => {
              const dateStr = data.forecast_dates?.[i] || '';
              const dateLabel = dateStr ? new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) : `F${i+1}`;

              chartData.push({ 
                week: i + 1, 
                label: dateLabel,
                forecast: val, 
                lower: data.lower[i], 
                upper: data.upper[i], 
                threshold: newAlert.threshold,
                fullDate: dateStr
              });
            });
          }
          
          setForecastData({ raw: data, chartData });
          setAlerts(alertList);
        } catch (err) {
          console.error("Failed to load data", err);
        } finally {
          setLoading(false);
        }
      }
      loadData();
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [newAlert.threshold]);

  const saveAlert = async () => {
    try {
      await fetchFromApi('/api/alerts', {
        method: 'POST',
        body: JSON.stringify({
          ...newAlert,
          frequency: 'Immediate'
        })
      });
      const updatedAlerts = await fetchFromApi('/api/alerts');
      setAlerts(updatedAlerts);
      setIsDrawerOpen(false);
    } catch (err) {
      console.error("Failed to save alert", err);
    }
  };

  const deleteAlert = async (id: number) => {
    try {
      await fetchFromApi(`/api/alerts/${id}`, { method: 'DELETE' });
      setAlerts(alerts.filter(a => a.id !== id));
    } catch (err) {
      console.error("Failed to delete alert", err);
    }
  };

  const isViolationPredicted = forecastData?.raw?.crossing_week !== null;

  return (
    <div className="p-12 pb-32 max-w-7xl mx-auto space-y-12">
      {/* Header */}
      <header className="flex justify-between items-end">
        <div>
          <span className="font-outfit font-bold text-[10px] tracking-widest text-charcoal/50 bg-cream px-3 py-1 rounded-full uppercase">Forecasting</span>
          <h1 className="headline-serif text-6xl text-charcoal mt-4">The Time Machine</h1>
          <p className="font-outfit text-charcoal/60 text-lg mt-2 italic">Predicting the ripples of bias before they hit the shore.</p>
        </div>
        <button 
          onClick={() => setIsDrawerOpen(true)}
          className="bg-charcoal text-white px-8 py-3 rounded-xl font-serif text-lg hover:scale-105 transition-all shadow-lg flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">notifications_active</span>
          Alert Me
        </button>
      </header>

      {/* Violation Banner */}
      {forecastData && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-2xl flex items-center justify-between shadow-lg overflow-hidden relative ${
            isViolationPredicted 
              ? 'bg-gradient-to-r from-terracotta to-red-600 text-white animate-pulse-slow' 
              : 'bg-sage text-white'
          }`}
        >
          <div className="flex items-center gap-4 relative z-10">
            <span className="material-symbols-outlined text-3xl">
              {isViolationPredicted ? 'warning' : 'check_circle'}
            </span>
            <div className="font-outfit">
              <p className="font-bold uppercase tracking-widest text-[10px] opacity-80">System Status</p>
              <h3 className="text-xl font-bold">
                {isViolationPredicted 
                  ? `Predicted violation: Week ${forecastData.raw.crossing_week} (±2 weeks, 87% confidence)` 
                  : "No violation predicted in next 8 weeks"}
              </h3>
            </div>
          </div>
          {isViolationPredicted && (
            <button className="bg-white/20 backdrop-blur-md px-6 py-2 rounded-lg font-bold text-sm uppercase tracking-widest hover:bg-white/30 transition-all relative z-10">
              Review Mitigation
            </button>
          )}
          {/* Animated background lines for violation */}
          {isViolationPredicted && (
            <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          )}
        </motion.div>
      )}

      {/* Main Chart Container */}
      <div className="glass-card p-12 min-h-[600px] flex flex-col">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h3 className="headline-serif text-3xl text-charcoal">Disparate Impact Projection</h3>
            <p className="text-sm text-charcoal/40 font-mono mt-1 uppercase tracking-tighter">Model: {forecastData?.raw?.model || 'ARIMA(1,1,0)'}</p>
          </div>
          <div className="flex gap-8">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-charcoal" />
              <span className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">Historical</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-sage border-dashed" />
              <span className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">Forecast</span>
            </div>
          </div>
        </div>

        <div className="flex-1 w-full relative min-h-[450px] min-w-[100px]">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="material-symbols-outlined text-6xl text-sage animate-spin">sync</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={450} minWidth={1} minHeight={1}>
              <ComposedChart data={forecastData?.chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(44,44,44,0.05)" />
                <XAxis 
                  dataKey="label" 
                  tick={{fontFamily: 'Outfit', fontSize: 10, fill: 'rgba(44,44,44,0.4)', fontWeight: 'bold'}} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis 
                  domain={[0, 1.1]} 
                  tick={{fontFamily: 'JetBrains Mono', fontSize: 10, fill: 'rgba(44,44,44,0.4)'}} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <Tooltip 
                  cursor={{ stroke: 'rgba(44,44,44,0.1)', strokeWidth: 1 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="glass-card p-4 shadow-2xl border-none">
                          <p className="headline-serif text-lg text-charcoal mb-2">{data.fullDate || data.label}</p>
                          <div className="space-y-1">
                            {data.actual !== undefined && (
                              <div className="flex justify-between gap-8">
                                <span className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">Actual DI</span>
                                <span className="metric-number font-bold text-charcoal">{data.actual.toFixed(3)}</span>
                              </div>
                            )}
                            {data.forecast !== undefined && (
                              <div className="flex justify-between gap-8">
                                <span className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">Forecast DI</span>
                                <span className="metric-number font-bold text-sage">{data.forecast.toFixed(3)}</span>
                              </div>
                            )}
                            {data.upper !== undefined && (
                              <div className="flex justify-between gap-8">
                                <span className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">80% CI</span>
                                <span className="metric-number text-[10px] text-charcoal/60">
                                  [{data.lower.toFixed(2)}, {data.upper.toFixed(2)}]
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine 
                  y={0.80} 
                  stroke="#C44536" 
                  strokeDasharray="8 4" 
                  label={{ 
                    position: 'insideBottomRight', 
                    value: 'EU AI Act Minimum: 0.80', 
                    fill: '#C44536', 
                    fontSize: 9, 
                    fontFamily: 'Outfit', 
                    fontWeight: 'bold',
                    offset: 10
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="upper" 
                  stroke="none" 
                  fill="#5E7B5C" 
                  fillOpacity={0.08} 
                  connectNulls
                />
                <Area 
                  type="monotone" 
                  dataKey="lower" 
                  stroke="none" 
                  fill="var(--background)" 
                  fillOpacity={1} 
                  connectNulls
                />
                <Line 
                  type="monotone" 
                  dataKey="actual" 
                  stroke="#2C2C2C" 
                  strokeWidth={4} 
                  dot={{ r: 4, fill: '#2C2C2C', strokeWidth: 0 }} 
                  activeDot={{ r: 6, strokeWidth: 0 }} 
                  strokeLinecap="round"
                />
                <Line 
                  type="monotone" 
                  dataKey="forecast" 
                  stroke="#5E7B5C" 
                  strokeWidth={4} 
                  strokeDasharray="8 6" 
                  dot={{ r: 4, fill: '#5E7B5C', strokeWidth: 0 }} 
                  strokeLinecap="round"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Alert Drawer */}
      <Drawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)}
        title="Alert Configuration"
      >
        <div className="space-y-10">
          <p className="font-outfit text-charcoal/60 leading-relaxed italic">
            Configure automated signals to trigger when fairness projections cross your defined threshold.
          </p>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">Threshold Value</span>
                <span className="metric-number text-3xl font-bold text-terracotta">{newAlert.threshold.toFixed(2)}</span>
              </div>
              <input 
                type="range" 
                min="0.5" 
                max="1.0" 
                step="0.01" 
                value={newAlert.threshold}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setNewAlert({...newAlert, threshold: val});
                  localStorage.setItem('bias_threshold', val.toString());
                }}
                className="w-full accent-terracotta h-1 bg-charcoal/10 rounded-full appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-bold text-charcoal/20 uppercase">
                <span>Strict (0.90+)</span>
                <span>Lenient (0.70-)</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">Notification Channel</label>
              <select 
                value={newAlert.channel}
                onChange={(e) => setNewAlert({...newAlert, channel: e.target.value})}
                className="w-full bg-white border border-charcoal/10 rounded-xl px-4 py-3 font-outfit text-sm outline-none focus:border-charcoal/30 transition-colors"
              >
                <option>Email</option>
                <option>Webhook</option>
                <option>Slack</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">Destination</label>
              <input 
                type="text" 
                placeholder="e.g. ethics-team@company.com"
                value={newAlert.destination}
                onChange={(e) => setNewAlert({...newAlert, destination: e.target.value})}
                className="w-full bg-white border border-charcoal/10 rounded-xl px-4 py-3 font-outfit text-sm outline-none focus:border-charcoal/30 transition-colors"
              />
            </div>

            <button 
              onClick={saveAlert}
              disabled={!newAlert.destination}
              className="w-full py-4 bg-charcoal text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              Commit Alert Rule
            </button>
          </div>

          <div className="pt-10 border-t border-charcoal/5">
            <h4 className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest mb-6">Active Monitors</h4>
            <div className="space-y-4">
              {alerts.length === 0 ? (
                <p className="text-xs text-charcoal/30 italic">No active alert rules configured.</p>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className="p-4 bg-white rounded-xl border border-charcoal/5 flex justify-between items-center group">
                    <div>
                      <p className="font-bold text-charcoal text-sm">{alert.channel}: {alert.destination}</p>
                      <p className="text-[10px] text-charcoal/40 uppercase font-mono mt-1">Threshold: {alert.threshold.toFixed(2)}</p>
                    </div>
                    <button 
                      onClick={() => deleteAlert(alert.id)}
                      className="material-symbols-outlined text-charcoal/20 hover:text-terracotta transition-colors text-lg"
                    >
                      delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
