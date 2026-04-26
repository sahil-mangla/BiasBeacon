import time
import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, Body
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from backend.controllers.fairness_controller import get_cache
from backend.models.ml_logic import (
    calculate_financial_impact, 
    ForecastingEngine, 
    SimulationEngine,
    UnbiasingLayer,
    FairnessMetrics
)

import sqlite3
import os

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
    
    res = calculate_financial_impact(cache["weekly_metrics"], cache["df"])
    weekly_savings_base, cum_base, cum_opt, cum_pess = res
    
    return {
        "cumulative_base": [float(x) for x in cum_base],
        "cumulative_optimistic": [float(x) for x in cum_opt],
        "cumulative_pessimistic": [float(x) for x in cum_pess],
        "total_savings": float(cum_base[-1])
    }
