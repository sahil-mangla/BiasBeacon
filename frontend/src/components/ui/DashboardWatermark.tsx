'use client';
import { useBiasBeacon } from '@/context/BiasBeaconContext';

export default function DashboardWatermark() {
  const { state } = useBiasBeacon();
  const label = state.session 
    ? state.session.filename
    : state.isDemo 
    ? 'DEMO MODE ACTIVE'
    : 'DEMO MODE ACTIVE';

  return (
    <div className="fixed top-6 right-6 z-[100] pointer-events-none">
      <span className="font-mono text-[10px] font-bold text-charcoal/20 border border-charcoal/10 px-2 py-1 rounded tracking-[0.2em] bg-white/5 backdrop-blur-sm">
        {label}
      </span>
    </div>
  );
}
