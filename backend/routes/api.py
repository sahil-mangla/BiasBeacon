import time
import numpy as np
from fastapi import APIRouter, HTTPException, Body
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from backend.controllers.fairness_controller import get_cache
from backend.models.ml_logic import simulate_reweighting_fix, calculate_financial_impact

router = APIRouter()

class SimulateRequest(BaseModel):
    feature: str = "years_at_current_address"
    method: str = "reweight"
    reference_group: str = "White"

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
    latest = cache["weekly_metrics"].iloc[-1]
    return latest.replace({np.nan: None}).to_dict()

@router.get("/metrics/historical")
def get_historical_metrics():
    cache = get_cache()
    if cache["weekly_metrics"] is None:
        raise HTTPException(status_code=503, detail="Data not initialized")
    return cache["weekly_metrics"].replace({np.nan: None}).to_dict(orient="records")

@router.get("/forecast/predict")
def get_forecast(weeks_ahead: int = 8):
    cache = get_cache()
    if cache["forecast"] is None:
        raise HTTPException(status_code=503, detail="Data not initialized")
        
    if weeks_ahead == 8:
        return cache["forecast"]
        
    hist_di = cache["weekly_metrics"]['di_Black'].tail(12).values
    from backend.models.ml_logic import forecast_fairness
    best_fc, cross_w, lower, upper, model_tag = forecast_fairness(hist_di, weeks_ahead=weeks_ahead, threshold=0.85)
    
    return {
        "historical": [float(x) for x in hist_di],
        "values": [float(x) for x in best_fc],
        "lower": [float(x) for x in lower],
        "upper": [float(x) for x in upper],
        "crossing_week": int(cross_w) if cross_w is not None else None,
        "model": str(model_tag)
    }

@router.get("/drift")
def get_drift_overall():
    cache = get_cache()
    if cache["drift_df"] is None:
        raise HTTPException(status_code=503, detail="Data not initialized")
    res = cache["drift_df"][cache["drift_df"]["group"] == "ALL"]
    return res.replace({np.nan: None}).to_dict(orient="records")

@router.get("/drift/per-group")
def get_drift_per_group():
    cache = get_cache()
    if cache["drift_df"] is None:
        raise HTTPException(status_code=503, detail="Data not initialized")
    res = cache["drift_df"][cache["drift_df"]["group"] != "ALL"]
    return res.replace({np.nan: None}).to_dict(orient="records")

@router.post("/simulate")
def post_simulate(req: SimulateRequest = Body(...)):
    cache = get_cache()
    if cache["df"] is None:
        raise HTTPException(status_code=503, detail="Data not initialized")
    
    res = simulate_reweighting_fix(
        df=cache["df"],
        drift_df=cache["drift_df"],
        reference_group=req.reference_group,
        feature_to_balance=req.feature,
        test_size=0.3,
        seed=42
    )
    base_di, corr_di, savings, impr, psi = res
    
    return {
        "baseline_di": float(base_di),
        "corrected_di": float(corr_di),
        "improvement": float(impr),
        "financial_savings": float(savings),
        "psi_of_feature": float(psi)
    }

@router.get("/generate_script")
def get_fix_script(feature: str = 'years_at_current_address'):
    script_content = f"""#!/usr/bin/env python3
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_sample_weight

def apply_fairness_fix(input_csv_path, protected_column='group', label_column='approved'):
    df = pd.read_csv(input_csv_path)
    # Target feature identified for auditing/re-weighting: {feature}
    X = df.drop(columns=[protected_column, label_column]).values
    y = df[label_column].values
    g = df[protected_column].values
    
    # Fair (reweighted)
    weights = compute_sample_weight('balanced', y=g)
    model = LogisticRegression(max_iter=500)
    model.fit(X, y, sample_weight=weights)
    return model
"""
    return PlainTextResponse(
        content=script_content, 
        media_type="text/plain", 
        headers={"Content-Disposition": "attachment; filename=fairness_fix_script.py"}
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
