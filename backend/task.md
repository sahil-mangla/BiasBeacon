# Task List

## Backend
- [ ] Add sessions table + new endpoints to api.py
- [ ] Add POST /api/upload
- [ ] Add POST /api/metrics (with binary validation + multi-group + metrics persistence)
- [ ] Add POST /api/forecast (loads metrics_df from session)
- [ ] Add POST /api/rootcause (loads config from session, histogram arrays, skips if no date_col)
- [ ] Add POST /api/financial (real calculation from uploaded CSV)
- [ ] Add GET /api/session/{session_id} (validation ping)
- [ ] Add GET /api/demo-data (formats existing cache into unified shape)

## Frontend
- [ ] Create src/context/BiasBeaconContext.tsx
- [ ] Create src/lib/apiClient.ts
- [ ] Create src/components/ui/UploadWizard.tsx (4 steps + baseline report)
- [ ] Modify src/app/layout.tsx (wrap with BiasBeaconProvider)
- [ ] Modify src/app/(dashboard)/layout.tsx (dynamic watermark)
- [ ] Modify src/components/layout/Sidebar.tsx (open wizard, read context safety score)
- [ ] Modify src/app/(dashboard)/page.tsx (read metrics/forecast/financial from context)
- [ ] Modify src/app/(dashboard)/path/page.tsx (read forecast from context)
- [ ] Modify src/app/(dashboard)/trail/page.tsx (read rootcause from context)
- [ ] Modify src/app/(dashboard)/fix/page.tsx (feature list from rootcause context)
- [ ] Modify src/app/(dashboard)/record/page.tsx (actually call audit-report API)
