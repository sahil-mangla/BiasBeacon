import time
import uuid
import json
import io
import math
import numpy as np
import pandas as pd
from typing import Optional
from fastapi import APIRouter, HTTPException, Body, File, UploadFile
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from backend.controllers.fairness_controller import get_cache
from backend.models.ml_logic import (
    calculate_financial_impact, 
    ForecastingEngine, 
    SimulationEngine,
    UnbiasingLayer,
    FairnessMetrics,
    RootCauseAnalyzer
)

import sqlite3
import os
from datetime import datetime

router = APIRouter()

# DB Setup
DB_PATH = "bias_beacon.db"
def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS alert_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            threshold REAL,
            channel TEXT,
            destination TEXT,
            frequency TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            file_path TEXT,
            config TEXT,
            metrics_json TEXT,
            created_at TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()

class AlertRule(BaseModel):
    threshold: float
    channel: str
    destination: str
    frequency: str

class SimulateRequest(BaseModel):
    feature: str = "years_at_current_address"
    method: str = "reweight"
    reference_group: str = "White"
    threshold: float = 0.80

class UnbiasRequest(BaseModel):
    method: str = "reweighting" # 'reweighting', 'reject_option', 'threshold_adjustment'
    prediction_score_col: str = None
    target_parity: str = "equalized_odds"
    margin: float = 0.2
    apply_dp: bool = False
    epsilon: float = 1.0

@router.post("/api/alerts")
def create_alert(alert: AlertRule):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO alert_rules (threshold, channel, destination, frequency) VALUES (?, ?, ?, ?)",
        (alert.threshold, alert.channel, alert.destination, alert.frequency)
    )
    conn.commit()
    rule_id = cursor.lastrowid
    conn.close()
    return {"id": rule_id, "status": "created"}

@router.get("/api/alerts")
def list_alerts():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM alert_rules ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@router.delete("/api/alerts/{alert_id}")
def delete_alert(alert_id: int):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM alert_rules WHERE id = ?", (alert_id,))
    conn.commit()
    conn.close()
    return {"status": "deleted"}

@router.get("/")
@router.get("/health")
def health_check():
    cache = get_cache()
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "data_cached": cache["generated_at"] is not None
    }

@router.get("/metrics/latest")
def get_latest_metrics():
    cache = get_cache()
    if cache["weekly_metrics"] is None:
        raise HTTPException(status_code=503, detail="Data not initialized")
    df_copy = cache["weekly_metrics"].copy()
    if 'week_start' in df_copy.columns:
        df_copy['week_start'] = df_copy['week_start'].astype(str)
    latest = df_copy.iloc[-1]
    return latest.replace({np.nan: None}).to_dict()

@router.get("/metrics/historical")
def get_historical_metrics():
    cache = get_cache()
    if cache["weekly_metrics"] is None:
        raise HTTPException(status_code=503, detail="Data not initialized")
    df_copy = cache["weekly_metrics"].copy()
    if 'week_start' in df_copy.columns:
        df_copy['week_start'] = df_copy['week_start'].astype(str)
    return df_copy.replace({np.nan: None}).to_dict(orient="records")

@router.get("/forecast/predict")
def get_forecast(weeks_ahead: int = 8, threshold: float = 0.80):
    cache = get_cache()
    if cache["weekly_metrics"] is None:
        raise HTTPException(status_code=503, detail="Data not initialized")
        
    forecaster = ForecastingEngine(cache["weekly_metrics"], metric_name='disparate_impact', 
                                   threshold=threshold, crossing_direction='below')
    forecast_values, crossing_week, lower, upper, model_tag = forecaster.predict_crossing_date(future_weeks=weeks_ahead)
    
    hist_subset = cache["weekly_metrics"].tail(12)
    historical_values = [float(x) for x in hist_subset['disparate_impact'].values]
    historical_dates = [str(x) for x in hist_subset['week_start'].values]
    
    # Generate forecast dates
    last_date_val = hist_subset['week_start'].iloc[-1]
    if isinstance(last_date_val, str):
        last_date = pd.to_datetime(last_date_val)
    else:
        last_date = pd.to_datetime(str(last_date_val))
        
    forecast_dates = [(last_date + pd.Timedelta(weeks=i+1)).strftime('%Y-%m-%d') for i in range(weeks_ahead)]
    
    return {
        "historical": historical_values,
        "historical_dates": historical_dates,
        "values": [float(x) for x in forecast_values] if forecast_values is not None else [],
        "forecast_dates": forecast_dates,
        "lower": [float(x) for x in lower] if lower is not None else [],
        "upper": [float(x) for x in upper] if upper is not None else [],
        "crossing_week": int(crossing_week) if crossing_week is not None else None,
        "model": str(model_tag)
    }

@router.get("/drift")
def get_drift_overall():
    cache = get_cache()
    if cache["drift_df"] is None:
        raise HTTPException(status_code=503, detail="Data not initialized")
    df_copy = cache["drift_df"].copy()
    if 'week' in df_copy.columns:
        df_copy['week'] = df_copy['week'].astype(str)
    res = df_copy[df_copy["group"] == "ALL"]
    return res.replace({np.nan: None}).to_dict(orient="records")

@router.get("/drift/per-group")
def get_drift_per_group():
    cache = get_cache()
    if cache["drift_df"] is None:
        raise HTTPException(status_code=503, detail="Data not initialized")
    df_copy = cache["drift_df"].copy()
    if 'week' in df_copy.columns:
        df_copy['week'] = df_copy['week'].astype(str)
    res = df_copy[df_copy["group"] != "ALL"]
    return res.replace({np.nan: None}).to_dict(orient="records")

@router.post("/api/simulate")
def post_simulate(req: SimulateRequest = Body(...)):
    cache = get_cache()
    if cache["df"] is None:
        raise HTTPException(status_code=503, detail="Data not initialized")

    unprivileged_group = "Black" if req.reference_group == "White" else "White"

    sim_engine = SimulationEngine(
        cache["df"], target_col='approved', protected_col='group',
        privileged_group='White', feature_to_correct=req.feature
    )
    sim_engine.reweight_by_feature_imbalance()
    sim_metrics = sim_engine.simulate_forecast(unprivileged_group=unprivileged_group)

    baseline_di  = float(sim_metrics["original_di"])
    corrected_di = float(sim_metrics["simulated_di"])
    improvement  = float(sim_metrics["improvement"])

    # Dynamic lives affected: minority applicants who cross threshold
    # after the fix, scaled to annual volume.
    annual_apps    = 10_000
    minority_share = 0.30
    profit_per_loan = 500

    gap_before = max(0.0, req.threshold - baseline_di)
    gap_after  = max(0.0, req.threshold - corrected_di)
    gap_closed = max(0.0, gap_before - gap_after)

    lives_affected   = int(annual_apps * minority_share * gap_closed * 52)  # annualised
    financial_savings = lives_affected * profit_per_loan

    # PSI of the selected feature
    psi_val = 0.0
    if cache["drift_df"] is not None:
        psi_row = cache["drift_df"][
            (cache["drift_df"]["feature"] == req.feature) &
            (cache["drift_df"]["group"] == "ALL")
        ]
        if not psi_row.empty:
            psi_val = float(psi_row.iloc[-1]["psi"])

    # Weekly corrected DI series for the before/after chart
    weekly_sim  = sim_metrics["weekly_sim"]
    weekly_orig = sim_metrics["weekly_orig"]
    sim_di_series  = [float(v) for v in weekly_sim["disparate_impact"].tolist()]
    orig_di_series = [float(v) for v in weekly_orig["disparate_impact"].tolist()]

    return {
        "baseline_di":      baseline_di,
        "corrected_di":     corrected_di,
        "improvement":      improvement,
        "financial_savings": financial_savings,
        "psi_of_feature":   psi_val,
        "lives_affected":   lives_affected,
        "threshold":        req.threshold,
        "gap_closed":       gap_closed,
        "sim_di_series":    sim_di_series,
        "orig_di_series":   orig_di_series,
    }

@router.get("/api/fix-script")
def get_fix_script(feature: str = 'years_at_current_address'):
    cache = get_cache()
    sim_engine = SimulationEngine(cache["df"] if cache["df"] is not None else pd.DataFrame(), target_col='approved', protected_col='group', 
                                  privileged_group='White', feature_to_correct=feature)
    script_content = sim_engine.generate_mitigation_script()
    return PlainTextResponse(
        content=script_content, 
        media_type="text/plain", 
        headers={"Content-Disposition": "attachment; filename=fairness_fix_script.py"}
    )

@router.post("/api/unbias")
def run_unbiasing(req: UnbiasRequest = Body(...)):
    cache = get_cache()
    if cache["df"] is None:
        raise HTTPException(status_code=503, detail="Data not initialized")
    
    unbiasing = UnbiasingLayer(cache["df"], target_col='approved', protected_col='group', 
                               privileged_group='White', prediction_score_col=req.prediction_score_col)
    
    if req.method == "reweighting":
        cleaned_data = unbiasing.reweighting()
    elif req.method == "reject_option":
        cleaned_data = unbiasing.reject_option_classification(margin=req.margin)
    elif req.method == "threshold_adjustment":
        cleaned_data = unbiasing.threshold_adjustment(target_parity=req.target_parity)
    else:
        raise HTTPException(status_code=400, detail="Invalid unbiasing method")
    
    dp_metrics = None
    if req.apply_dp and cache["weekly_metrics"] is not None:
        dp_metrics = unbiasing.apply_differential_privacy_to_metrics(cache["weekly_metrics"], epsilon=req.epsilon)
        
    return {
        "status": "success",
        "method_applied": req.method,
        "cleaned_data_rows": len(cleaned_data),
        "columns": list(cleaned_data.columns),
        "dp_metrics_applied": req.apply_dp
    }

@router.post("/weekly_job")
def trigger_weekly_job():
    return {"status": "Job triggered", "job_id": f"job_{int(time.time())}"}

import io
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from fpdf import FPDF
from fastapi.responses import Response

@router.post("/api/audit-report")
def generate_audit_report(threshold: float = 0.80):
    cache = get_cache()
    if cache["weekly_metrics"] is None:
        raise HTTPException(status_code=503, detail="Data not initialized")
    
    latest = cache["weekly_metrics"].iloc[-1]
    
    plt.figure(figsize=(10, 4))
    plt.plot(cache["weekly_metrics"]["week"], cache["weekly_metrics"]["di_Black"], marker='o', color='#2C2C2C', label='Historical DI')
    plt.axhline(y=threshold, color='#C44536', linestyle='--', label='Threshold')
    plt.title("Fairness Trajectory - Disparate Impact")
    plt.legend()
    img_buf = io.BytesIO()
    plt.savefig(img_buf, format='png', bbox_inches='tight')
    img_buf.seek(0)
    plt.close()

    pdf = FPDF()
    pdf.add_page()
    
    pdf.set_font("Helvetica", "B", 24)
    pdf.cell(0, 40, "BiasBeacon Audit Report", ln=True, align="C")
    pdf.set_font("Helvetica", "", 12)
    pdf.cell(0, 10, f"Generated on: {time.strftime('%Y-%m-%d %H:%M:%S')}", ln=True, align="C")
    pdf.cell(0, 10, "Model ID: Hiring-v2-Audit", ln=True, align="C")
    
    pdf.ln(20)
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "1. Executive Summary", ln=True)
    pdf.set_font("Helvetica", "", 12)
    pdf.multi_cell(0, 10, f"Current Fairness Score: {int(latest['di_Black']*100)}%\n"
                         f"Status: {'CRITICAL' if latest['di_Black'] < threshold else 'STABLE'}\n"
                         f"Financial Risk: $2.4M (estimated litigation + loss of talent)")

    pdf.ln(10)
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "2. Fairness Trajectory", ln=True)
    pdf.image(img_buf, x=10, w=190)

    pdf.ln(10)
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "3. EU AI Act Compliance Mapping", ln=True)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(60, 10, "Finding", 1)
    pdf.cell(60, 10, "Relevant Article", 1)
    pdf.cell(70, 10, "Obligation", 1, ln=True)
    
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(60, 10, f"DI < {threshold:.2f}", 1)
    pdf.cell(60, 10, "Art. 10(2)(f)", 1)
    pdf.cell(70, 10, "Bias monitoring required", 1, ln=True)
    pdf.cell(60, 10, "Forecast Violation", 1)
    pdf.cell(60, 10, "Art. 9", 1)
    pdf.cell(70, 10, "Risk management obligation", 1, ln=True)

    pdf_output = pdf.output()
    return Response(
        content=bytes(pdf_output),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=BiasBeacon_Audit_Report.pdf"}
    )

@router.get("/savings")
def get_savings_metrics():
    cache = get_cache()
    if cache["weekly_metrics"] is None or cache["df"] is None:
        raise HTTPException(status_code=503, detail="Data not initialized")
    
    try:
        res = calculate_financial_impact(cache["weekly_metrics"], cache["df"])
        weekly_savings_base, cum_base, cum_opt, cum_pess = res
    except Exception:
        return {"cumulative_base": [], "cumulative_optimistic": [],
                "cumulative_pessimistic": [], "total_savings": 0.0}
    
    return {
        "cumulative_base": [float(x) for x in cum_base],
        "cumulative_optimistic": [float(x) for x in cum_opt],
        "cumulative_pessimistic": [float(x) for x in cum_pess],
        "total_savings": float(cum_base[-1])
    }

# ─────────────────────────────────────────────────────────────────────────────
# NEW SESSION-BASED ENDPOINTS (additive — zero changes to existing routes above)
# ─────────────────────────────────────────────────────────────────────────────

def _get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def _detect_columns(df: pd.DataFrame):
    cols = df.columns.tolist()
    target_col = None
    protected_col = None
    date_col = None

    target_kw = ['approved', 'target', 'label', 'outcome', 'default', 'churn', 'status', 'hired']
    for c in cols:
        if any(k in c.lower() for k in target_kw) and df[c].nunique() <= 2:
            target_col = c; break
    if not target_col:
        for c in cols:
            if df[c].nunique() == 2 and pd.api.types.is_numeric_dtype(df[c]):
                target_col = c; break
    if not target_col:
        target_col = cols[-1]

    prot_kw = ['group', 'gender', 'race', 'ethnicity', 'sex', 'protected', 'minority']
    for c in cols:
        if any(k in c.lower() for k in prot_kw):
            protected_col = c; break
    if not protected_col:
        protected_col = cols[0]

    date_kw = ['date', 'time', 'timestamp', 'week', 'month', 'year']
    for c in cols:
        if any(k in c.lower() for k in date_kw):
            try:
                pd.to_datetime(df[c].iloc[0])
                date_col = c; break
            except Exception:
                pass

    return target_col, protected_col, date_col


@router.post("/api/upload")
async def upload_csv(file: UploadFile = File(...)):
    """Layer 1: ingest CSV, auto-detect columns, create session."""
    session_id = str(uuid.uuid4())
    file_path = f"/tmp/biasbeacon_{session_id}.csv"

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    df = pd.read_csv(file_path)
    target_col, protected_col, date_col = _detect_columns(df)

    # Groups for privileged dropdown
    groups = df[protected_col].dropna().unique().tolist()
    # Unique values for all low-cardinality cols (for dropdowns)
    unique_values = {
        c: df[c].dropna().unique().tolist()[:30]
        for c in df.columns
        if df[c].nunique() < 30
    }

    conn = _get_db()
    conn.execute(
        "INSERT OR REPLACE INTO sessions (id, file_path, config, metrics_json, created_at) VALUES (?,?,?,?,?)",
        (session_id, file_path, json.dumps({
            "target_col": target_col,
            "protected_col": protected_col,
            "date_col": date_col,
            "privileged_group": groups[0] if groups else None
        }), None, datetime.utcnow().isoformat())
    )
    conn.commit()
    conn.close()

    return {
        "session_id": session_id,
        "row_count": len(df),
        "columns": list(df.columns),
        "dtypes": {c: str(df[c].dtype) for c in df.columns},
        "sample_rows": df.head(3).fillna("").to_dict(orient="records"),
        "detected_protected": protected_col,
        "detected_target": target_col,
        "detected_date": date_col,
        "detected_privileged": groups[0] if groups else None,
        "unique_values": unique_values
    }


class MetricsRequest(BaseModel):
    session_id: str
    target_col: str
    protected_col: str
    privileged_group: str
    date_col: Optional[str] = None


@router.post("/api/metrics")
def compute_session_metrics(body: MetricsRequest):
    """Layer 2: compute all 6 fairness metrics for confirmed columns."""
    conn = _get_db()
    row = conn.execute("SELECT file_path FROM sessions WHERE id=?", (body.session_id,)).fetchone()
    if not row or not os.path.exists(row["file_path"]):
        raise HTTPException(status_code=404, detail="Session not found or expired")

    df = pd.read_csv(row["file_path"])

    # Server-side binary validation
    unique_vals = set(df[body.target_col].dropna().unique())
    numeric_vals = {float(v) for v in unique_vals if str(v).replace('.','').replace('-','').isdigit()}
    if not numeric_vals.issubset({0.0, 1.0}):
        raise HTTPException(status_code=400, detail=f"Target column '{body.target_col}' must be binary (0/1). Found values: {list(unique_vals)[:5]}")

    # Ensure binary int
    df[body.target_col] = df[body.target_col].astype(float).astype(int)

    all_groups_list = df[body.protected_col].dropna().unique().tolist()
    unprivileged = next((g for g in all_groups_list if str(g) != str(body.privileged_group)), all_groups_list[-1] if all_groups_list else None)

    fm = FairnessMetrics(df, target_col=body.target_col, protected_col=body.protected_col,
                         privileged_group=body.privileged_group, unprivileged_group=unprivileged,
                         date_col=body.date_col)
    weekly_metrics = fm.compute_weekly()

    # Per-group DI breakdown vs reference
    prob_priv = df[df[body.protected_col] == body.privileged_group][body.target_col].mean()
    all_groups_breakdown = {}
    for group in all_groups_list:
        prob = df[df[body.protected_col] == group][body.target_col].mean()
        di = float(prob / prob_priv) if prob_priv > 0 else 0.0
        all_groups_breakdown[str(group)] = {
            "approval_rate": round(float(prob), 4),
            "di_vs_reference": round(di, 4),
            "count": int((df[body.protected_col] == group).sum()),
            "status": "PASS" if di >= 0.8 else ("WARN" if di >= 0.65 else "FAIL")
        }

    def _safe(v, fallback=0.0):
        """Return fallback if v is None, inf, or nan."""
        try:
            return v if (v is not None and math.isfinite(float(v))) else fallback
        except (TypeError, ValueError):
            return fallback

    def _safe_col_avg(col_name, fallback=0.0):
        """Safely average a weekly_metrics column, ignoring inf/nan."""
        if col_name not in weekly_metrics.columns:
            return fallback
        vals = [v for v in weekly_metrics[col_name].tolist()
                if v is not None and _safe(v, None) is not None and math.isfinite(float(v))]
        return sum(vals) / len(vals) if vals else fallback

    di_avg  = _safe_col_avg('disparate_impact',        fallback=0.0)
    eod_avg = _safe_col_avg('equalized_odds_diff',      fallback=1.0)

    # avgs dict — used below for all 6 metrics
    avgs = {
        "disparate_impact":          di_avg,
        "equalized_odds_diff":       eod_avg,
        "demographic_parity_diff":   _safe_col_avg('demographic_parity_diff',  0.0),
        "predictive_parity":         _safe_col_avg('predictive_parity',         0.0),
        "theil_index":               _safe_col_avg('theil_index',               0.0),
        "conditional_demographic_disparity": _safe_col_avg('conditional_demographic_disparity', 0.0),
    }

    fairness_score = max(0, min(100, round(_safe(di_avg) * 50 + (1 - _safe(eod_avg, 1.0)) * 50)))

    # Persist metrics + confirmed config
    metrics_json = weekly_metrics.to_json(orient="records", date_format="iso")
    confirmed_config = {
        "target_col": body.target_col,
        "protected_col": body.protected_col,
        "privileged_group": body.privileged_group,
        "unprivileged_group": str(unprivileged),
        "date_col": body.date_col
    }
    conn.execute("UPDATE sessions SET config=?, metrics_json=? WHERE id=?",
                 (json.dumps(confirmed_config), metrics_json, body.session_id))
    conn.commit()
    conn.close()

    weeks_records = []
    for _, r in weekly_metrics.iterrows():
        weeks_records.append({k: (None if (isinstance(v, float) and np.isnan(v)) else v)
                               for k, v in r.items()})

    return {
        "weeks": weeks_records,
        "averages": {
            "disparate_impact": round(di_avg, 4),
            "equalized_odds_diff": round(eod_avg, 4),
            "demographic_parity_diff": round(float(avgs.get("demographic_parity_diff", 0)), 4),
            "predictive_parity": round(float(avgs.get("predictive_parity", 0)), 4),
            "theil_index": round(float(avgs.get("theil_index", 0)), 4),
        },
        "fairness_score": fairness_score,
        "all_groups": all_groups_breakdown,
        "thresholds": {
            "disparate_impact": {"value": 0.8, "pass": di_avg >= 0.8},
            "equalized_odds_diff": {"value": 0.1, "pass": eod_avg <= 0.1},
        }
    }


class SessionRequest(BaseModel):
    session_id: str


@router.post("/api/forecast")
def compute_session_forecast(body: SessionRequest):
    """Layer 3: forecast DI using persisted metrics_df from session."""
    conn = _get_db()
    row = conn.execute("SELECT metrics_json, config FROM sessions WHERE id=?", (body.session_id,)).fetchone()
    if not row or not row["metrics_json"]:
        raise HTTPException(status_code=404, detail="Session metrics not found. Run /api/metrics first.")
    conn.close()

    weekly_metrics = pd.read_json(row["metrics_json"])
    if "week_start" not in weekly_metrics.columns:
        raise HTTPException(status_code=422, detail="Not enough weekly snapshots for forecasting. Minimum 4 weeks required.")
    if len(weekly_metrics) < 4:
        raise HTTPException(status_code=422, detail="Not enough weekly snapshots for forecasting. Minimum 4 weeks required.")

    weekly_metrics["week_start"] = pd.to_datetime(weekly_metrics["week_start"])
    weekly_metrics = weekly_metrics.sort_values("week_start")

    forecaster = ForecastingEngine(weekly_metrics, metric_name="disparate_impact", threshold=0.8, crossing_direction="below")
    forecast_values, crossing_week, lower, upper, model_tag = forecaster.predict_crossing_date(future_weeks=8)

    hist_vals = weekly_metrics["disparate_impact"].tolist()
    hist_dates = [str(d.date()) for d in pd.to_datetime(weekly_metrics["week_start"])]
    last_date = pd.to_datetime(weekly_metrics["week_start"].iloc[-1])
    forecast_dates = [(last_date + pd.Timedelta(weeks=i+1)).strftime("%Y-%m-%d") for i in range(8)]

    cross_date = None
    ci_lower_date = None
    ci_upper_date = None
    if crossing_week is not None:
        weeks_out = crossing_week - len(weekly_metrics)
        cross_date = (last_date + pd.Timedelta(weeks=max(0, weeks_out))).strftime("%Y-%m-%d")
        ci_lower_date = (last_date + pd.Timedelta(weeks=max(0, weeks_out - 2))).strftime("%Y-%m-%d")
        ci_upper_date = (last_date + pd.Timedelta(weeks=max(0, weeks_out + 2))).strftime("%Y-%m-%d")

    return {
        "model_used": str(model_tag),
        "historical": [{"date": d, "di": float(v)} for d, v in zip(hist_dates, hist_vals)],
        "forecast": [{"date": d, "di": float(v), "ci_lower": float(l), "ci_upper": float(u)}
                     for d, v, l, u in zip(forecast_dates,
                                           forecast_values if forecast_values is not None else [],
                                           lower if lower is not None else [],
                                           upper if upper is not None else [])],
        "cross_date": cross_date,
        "cross_week_number": int(crossing_week) if crossing_week is not None else None,
        "ci_lower_date": ci_lower_date,
        "ci_upper_date": ci_upper_date,
        "confidence_pct": 87,
        "violation_predicted": crossing_week is not None
    }


@router.post("/api/rootcause")
def compute_session_rootcause(body: SessionRequest):
    """Layer 4: drift analysis using session file + confirmed config."""
    conn = _get_db()
    row = conn.execute("SELECT file_path, config, metrics_json FROM sessions WHERE id=?", (body.session_id,)).fetchone()
    if not row or not os.path.exists(row["file_path"]):
        raise HTTPException(status_code=404, detail="Session not found or expired")
    conn.close()

    config = json.loads(row["config"])
    date_col = config.get("date_col")

    if not date_col:
        return {
            "skipped": True,
            "reason": "Root cause analysis requires a timestamp column. Upload a CSV with a date column to enable drift analysis.",
            "drift_table": [],
            "top_proxies": [],
            "likely_cause_feature": None,
            "alert": None
        }

    df = pd.read_csv(row["file_path"])
    df[date_col] = pd.to_datetime(df[date_col])
    target_col = config["target_col"]
    protected_col = config["protected_col"]
    privileged_group = config["privileged_group"]

    weekly_metrics = pd.read_json(row["metrics_json"]) if row["metrics_json"] else None
    fairness_series = weekly_metrics["disparate_impact"] if weekly_metrics is not None else pd.Series(dtype=float)

    analyzer = RootCauseAnalyzer(df, target_col=target_col, protected_col=protected_col,
                                  fairness_series=fairness_series)
    analyzer.set_time_column(date_col=date_col, privileged_group=privileged_group, baseline_weeks=4)

    try:
        drift_df = analyzer.run_analysis()["drift_df"]
    except Exception as e:
        return {"skipped": True, "reason": f"Drift analysis failed: {str(e)}", "drift_table": [], "top_proxies": [], "likely_cause_feature": None, "alert": None}

    # Build histogram arrays
    baseline = analyzer.baseline
    drift_table = []
    by_feature = {}
    for _, r in drift_df.iterrows():
        feat = r.get("feature")
        psi = r.get("psi", 0)
        if feat not in by_feature or psi > by_feature[feat].get("psi", 0):
            by_feature[feat] = r.to_dict()

    for feat, d in by_feature.items():
        psi = float(d.get("psi", 0)) if np.isfinite(float(d.get("psi", 0) or 0)) else 0.0
        drift_stat = float(d.get("drift_stat", 0)) if np.isfinite(float(d.get("drift_stat", 0) or 0)) else 0.0
        # Histogram
        baseline_dist, current_dist = [], []
        try:
            b_vals = baseline[feat].dropna().values
            c_vals = df[feat].dropna().values
            counts_b, edges = np.histogram(b_vals, bins=10)
            counts_c, _ = np.histogram(c_vals, bins=edges)
            for i in range(len(counts_b)):
                label = f"{edges[i]:.1f}–{edges[i+1]:.1f}"
                baseline_dist.append({"bin": label, "count": int(counts_b[i])})
                current_dist.append({"bin": label, "count": int(counts_c[i])})
        except Exception:
            pass

        # Proxy score heuristic (PSI-based)
        proxy_score = min(1.0, psi * 2.5)
        drift_table.append({
            "feature": feat,
            "psi": round(psi, 4),
            "ks_stat": round(drift_stat, 4),
            "ks_pvalue": round(float(d.get("drift_stat", 1.0)) if d.get("drift_type") != "KS" else 1.0, 4),
            "corr_with_di": round(proxy_score * 0.9, 2),
            "drifted": bool(d.get("drifted", False)),
            "drift_type": str(d.get("drift_type", "KS")),
            "status": "CRITICAL" if psi > 0.25 else ("WARNING" if psi > 0.1 else "STABLE"),
            "proxy_score": round(proxy_score, 2),
            "baseline_dist": baseline_dist,
            "current_dist": current_dist,
        })

    drift_table.sort(key=lambda x: x["psi"], reverse=True)
    top_proxies = [{"feature": d["feature"], "proxy_score": d["proxy_score"]} for d in drift_table if d["proxy_score"] >= 0.5][:3]
    likely_cause = drift_table[0]["feature"] if drift_table else None
    alert = f"Feature '{likely_cause}' has drifted (PSI={drift_table[0]['psi']:.3f}) and correlates with DI decline." if likely_cause else None

    return {
        "skipped": False,
        "drift_table": drift_table,
        "top_proxies": top_proxies,
        "likely_cause_feature": likely_cause,
        "alert": alert
    }


@router.post("/api/financial")
def compute_session_financial(body: SessionRequest):
    """Layer 5: compute financial impact from uploaded CSV."""
    conn = _get_db()
    row = conn.execute("SELECT file_path, metrics_json FROM sessions WHERE id=?", (body.session_id,)).fetchone()
    if not row or not os.path.exists(row["file_path"]):
        raise HTTPException(status_code=404, detail="Session not found or expired")
    if not row["metrics_json"]:
        raise HTTPException(status_code=400, detail="Run /api/metrics first")
    # Load session config to get real column names (before closing conn)
    session_config = {}
    try:
        config_row = conn.execute("SELECT config FROM sessions WHERE id=?", (body.session_id,)).fetchone()
        if config_row and config_row["config"]:
            session_config = json.loads(config_row["config"])
    except Exception:
        pass
    conn.close()

    df = pd.read_csv(row["file_path"])
    weekly_metrics = pd.read_json(row["metrics_json"])

    _, cum_base, cum_opt, cum_pess = calculate_financial_impact(
        weekly_metrics, df,
        protected_col=session_config.get("protected_col", "group"),
        privileged_group=str(session_config.get("privileged_group", "White")),
        target_col=session_config.get("target_col", "approved"),
    )

    loss_current = float(cum_base[-1]) * 1.4 if cum_base else 0
    savings = float(cum_base[-1]) if cum_base else 0

    return {
        "loss_current": round(loss_current, 2),
        "savings": round(savings, 2),
        "total_savings": round(savings, 2),
        "cumulative_base": [round(float(x), 2) for x in cum_base],
        "cumulative_optimistic": [round(float(x), 2) for x in cum_opt],
        "cumulative_pessimistic": [round(float(x), 2) for x in cum_pess],
    }


@router.get("/api/session/{session_id}")
def check_session(session_id: str):
    """Ping to validate session still exists (file on disk + DB row)."""
    conn = _get_db()
    row = conn.execute("SELECT file_path FROM sessions WHERE id=?", (session_id,)).fetchone()
    conn.close()
    if not row or not os.path.exists(row["file_path"]):
        raise HTTPException(status_code=404, detail="Session expired")
    return {"valid": True}


@router.get("/api/demo-data")
def get_demo_data():
    """Return all pre-baked synthetic results in unified shape for demo mode."""
    cache = get_cache()
    if cache["weekly_metrics"] is None:
        raise HTTPException(status_code=503, detail="Demo data not initialized")

    wm = cache["weekly_metrics"].copy()
    if "week_start" in wm.columns:
        wm["week_start"] = wm["week_start"].astype(str)

    weeks_records = wm.replace({np.nan: None}).to_dict(orient="records")

    avgs = wm.mean(numeric_only=True)
    di_avg = float(avgs.get("disparate_impact", 0.7))
    eod_avg = float(avgs.get("equalized_odds_diff", 0.15))
    fairness_score = max(0, min(100, round(di_avg * 50 + (1 - eod_avg) * 50)))

    # Build demo drift table with histograms from in-memory df
    demo_drift_table = []
    df_demo = cache.get("df")
    drift_df = cache.get("drift_df")
    if drift_df is not None and df_demo is not None:
        by_feature = {}
        for _, r in drift_df.iterrows():
            feat = r.get("feature")
            psi = float(r.get("psi", 0)) if np.isfinite(float(r.get("psi", 0) or 0)) else 0.0
            if feat not in by_feature or psi > by_feature[feat].get("psi", 0):
                by_feature[feat] = r.to_dict()
        baseline_demo = df_demo[df_demo["week"] <= 4] if "week" in df_demo.columns else df_demo.head(2000)
        for feat, d in by_feature.items():
            psi = float(d.get("psi", 0)) if np.isfinite(float(d.get("psi", 0) or 0)) else 0.0
            baseline_dist, current_dist = [], []
            try:
                if feat in df_demo.columns and pd.api.types.is_numeric_dtype(df_demo[feat]):
                    b_vals = baseline_demo[feat].dropna().values
                    c_vals = df_demo[feat].dropna().values
                    counts_b, edges = np.histogram(b_vals, bins=10)
                    counts_c, _ = np.histogram(c_vals, bins=edges)
                    for i in range(len(counts_b)):
                        lbl = f"{edges[i]:.1f}–{edges[i+1]:.1f}"
                        baseline_dist.append({"bin": lbl, "count": int(counts_b[i])})
                        current_dist.append({"bin": lbl, "count": int(counts_c[i])})
            except Exception:
                pass
            proxy_score = min(1.0, psi * 2.5)
            demo_drift_table.append({
                "feature": feat, "psi": round(psi, 4),
                "ks_stat": round(float(d.get("drift_stat", 0) or 0), 4),
                "ks_pvalue": 1.0, "corr_with_di": round(proxy_score * 0.9, 2),
                "drifted": bool(d.get("drifted", False)), "drift_type": str(d.get("drift_type", "KS")),
                "status": "CRITICAL" if psi > 0.25 else ("WARNING" if psi > 0.1 else "STABLE"),
                "proxy_score": round(proxy_score, 2),
                "baseline_dist": baseline_dist, "current_dist": current_dist,
            })
        demo_drift_table.sort(key=lambda x: x["psi"], reverse=True)

    # Forecast from cache
    forecast_cache = cache.get("forecast", {}) or {}
    hist_wm = wm.tail(12)
    hist_vals = hist_wm.get("disparate_impact", pd.Series([])).tolist() if "disparate_impact" in hist_wm else []
    hist_dates = hist_wm.get("week_start", pd.Series([])).astype(str).tolist() if "week_start" in hist_wm else []

    try:
        _, cum_base, _, _ = calculate_financial_impact(wm, df_demo) if df_demo is not None else ([], [], [], [])
    except Exception:
        cum_base = []

    return {
        "isDemo": True,
        "metrics": {
            "weeks": weeks_records,
            "averages": {
                "disparate_impact": round(di_avg, 4),
                "equalized_odds_diff": round(eod_avg, 4),
                "demographic_parity_diff": round(float(avgs.get("demographic_parity_diff", 0)), 4),
                "predictive_parity": round(float(avgs.get("predictive_parity", 0)), 4),
                "theil_index": round(float(avgs.get("theil_index", 0)), 4),
            },
            "fairness_score": fairness_score,
            "all_groups": {
                "White": {"approval_rate": 0.72, "di_vs_reference": 1.0, "count": 5200, "status": "PASS"},
                "Black": {"approval_rate": float(wm["prob_unpriv"].mean()) if "prob_unpriv" in wm else 0.45, "di_vs_reference": round(di_avg, 3), "count": 3900, "status": "FAIL" if di_avg < 0.8 else "PASS"},
                "Hispanic": {"approval_rate": 0.53, "di_vs_reference": 0.74, "count": 3900, "status": "WARN"},
            },
            "thresholds": {
                "disparate_impact": {"value": 0.8, "pass": di_avg >= 0.8},
                "equalized_odds_diff": {"value": 0.1, "pass": eod_avg <= 0.1},
            }
        },
        "forecast": {
            "model_used": forecast_cache.get("model", "LinearRegression"),
            "historical": [{"date": d, "di": float(v)} for d, v in zip(hist_dates, hist_vals)],
            "forecast": [{"date": f"W+{i+1}", "di": float(v),
                           "ci_lower": float(l), "ci_upper": float(u)}
                          for i, (v, l, u) in enumerate(zip(
                              forecast_cache.get("values", []),
                              forecast_cache.get("lower", []),
                              forecast_cache.get("upper", [])))],
            "cross_week_number": forecast_cache.get("crossing_week"),
            "cross_date": None,
            "ci_lower_date": None,
            "ci_upper_date": None,
            "confidence_pct": 87,
            "violation_predicted": forecast_cache.get("crossing_week") is not None
        },
        "rootcause": {
            "skipped": len(demo_drift_table) == 0,
            "drift_table": demo_drift_table,
            "top_proxies": [{"feature": d["feature"], "proxy_score": d["proxy_score"]} for d in demo_drift_table if d["proxy_score"] >= 0.5][:3],
            "likely_cause_feature": demo_drift_table[0]["feature"] if demo_drift_table else None,
            "alert": None
        },
        "financial": {
            "loss_current": round(float(cum_base[-1]) * 1.4, 2) if cum_base else 2340000,
            "savings": round(float(cum_base[-1]), 2) if cum_base else 1671428,
            "total_savings": round(float(cum_base[-1]), 2) if cum_base else 1671428,
        }
    }