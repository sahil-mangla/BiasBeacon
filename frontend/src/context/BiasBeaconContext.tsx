'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SessionConfig {
  target_col: string;
  protected_col: string;
  privileged_group: string;
  date_col: string | null;
}

export interface Session {
  session_id: string;
  filename: string;
  row_count: number;
  config: SessionConfig;
}

export interface MetricsState {
  weeks: any[];
  averages: Record<string, number>;
  fairness_score: number;
  all_groups: Record<string, { approval_rate: number; di_vs_reference: number; count: number; status: string }>;
  thresholds: Record<string, { value: number; pass: boolean }>;
}

export interface ForecastState {
  model_used: string;
  historical: { date: string; di: number }[];
  forecast: { date: string; di: number; ci_lower: number; ci_upper: number }[];
  cross_date: string | null;
  cross_week_number: number | null;
  ci_lower_date: string | null;
  ci_upper_date: string | null;
  confidence_pct: number;
  violation_predicted: boolean;
}

export interface RootcauseState {
  skipped: boolean;
  reason?: string;
  drift_table: any[];
  top_proxies: { feature: string; proxy_score: number }[];
  likely_cause_feature: string | null;
  alert: string | null;
}

export interface FinancialState {
  loss_current: number;
  savings: number;
  total_savings: number;
  cumulative_base?: number[];
}

export interface AppState {
  session: Session | null;
  isDemo: boolean;
  isProcessing: boolean;
  processingStep: number; // 0–6
  metrics: MetricsState | null;
  forecast: ForecastState | null;
  rootcause: RootcauseState | null;
  simulation: any | null;
  financial: FinancialState | null;
  uploadInfo: any | null; // raw /api/upload response
}

// ─── Actions ─────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_UPLOAD_INFO'; payload: any }
  | { type: 'SET_SESSION'; payload: Session }
  | { type: 'SET_METRICS'; payload: MetricsState }
  | { type: 'SET_FORECAST'; payload: ForecastState }
  | { type: 'SET_ROOTCAUSE'; payload: RootcauseState }
  | { type: 'SET_SIMULATION'; payload: any }
  | { type: 'SET_FINANCIAL'; payload: FinancialState }
  | { type: 'SET_DEMO'; payload: { metrics: MetricsState | null; forecast: ForecastState | null; rootcause: RootcauseState | null; simulation: any; financial: FinancialState | null; uploadInfo: null } }
  | { type: 'RESTORE_SESSION'; payload: Partial<AppState> }
  | { type: 'SET_PROCESSING'; payload: { isProcessing: boolean; step?: number } }
  | { type: 'RESET' };

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState: AppState = {
  session: null,
  isDemo: false,
  isProcessing: false,
  processingStep: 0,
  metrics: null,
  forecast: null,
  rootcause: null,
  simulation: null,
  financial: null,
  uploadInfo: null,
};

// ─── Reducer ─────────────────────────────────────────────────────────────────

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_UPLOAD_INFO':
      return { ...state, uploadInfo: action.payload };
    case 'SET_SESSION':
      return { ...state, session: action.payload, isDemo: false };
    case 'SET_METRICS':
      return { ...state, metrics: action.payload };
    case 'SET_FORECAST':
      return { ...state, forecast: action.payload };
    case 'SET_ROOTCAUSE':
      return { ...state, rootcause: action.payload };
    case 'SET_SIMULATION':
      return { ...state, simulation: action.payload };
    case 'SET_FINANCIAL':
      return { ...state, financial: action.payload };
    case 'SET_DEMO':
      return { ...state, isDemo: true, session: null, isProcessing: false, processingStep: 0, metrics: action.payload.metrics, forecast: action.payload.forecast, rootcause: action.payload.rootcause, simulation: action.payload.simulation, financial: action.payload.financial, uploadInfo: null };
    case 'RESTORE_SESSION':
      return { ...state, ...action.payload };
    case 'SET_PROCESSING':
      return { ...state, isProcessing: action.payload.isProcessing, processingStep: action.payload.step ?? state.processingStep };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const BiasBeaconContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

const STORAGE_KEY = 'biasbeacon_session';
const SESSION_TTL_HOURS = 24;

export function BiasBeaconProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // On mount: check localStorage for existing session
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    
    async function loadDemo() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/demo-data`);
        if (res.ok) {
          const demoData = await res.json();
          dispatch({ type: 'SET_DEMO', payload: demoData });
        }
      } catch (err) {
        console.error("Failed to load demo data", err);
      }
    }

    if (!raw) {
      loadDemo();
      return;
    }

    try {
      const stored = JSON.parse(raw);
      const ageHours = (Date.now() - stored.created_at) / 3600000;
      if (ageHours >= SESSION_TTL_HOURS) {
        localStorage.removeItem(STORAGE_KEY);
        loadDemo();
        return;
      }
      // Validate session is still alive on the backend
      const sessionId = stored.session?.session_id;
      if (!sessionId) {
        loadDemo();
        return;
      }
      fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/session/${sessionId}`)
        .then(r => {
          if (r.ok) {
            dispatch({ type: 'RESTORE_SESSION', payload: stored.appState });
          } else {
            localStorage.removeItem(STORAGE_KEY);
            loadDemo();
          }
        })
        .catch(() => {
          localStorage.removeItem(STORAGE_KEY);
          loadDemo();
        });
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      loadDemo();
    }
  }, []);

  return (
    <BiasBeaconContext.Provider value={{ state, dispatch }}>
      {children}
    </BiasBeaconContext.Provider>
  );
}

export function useBiasBeacon() {
  const ctx = useContext(BiasBeaconContext);
  if (!ctx) throw new Error('useBiasBeacon must be used inside BiasBeaconProvider');
  return ctx;
}

// Helper to save full state to localStorage
export function saveSessionToStorage(session: Session, appState: Partial<AppState>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ session, appState, created_at: Date.now() }));
}

export function clearSessionStorage() {
  localStorage.removeItem(STORAGE_KEY);
}
