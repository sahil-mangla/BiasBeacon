import time
import numpy as np
import pandas as pd
from backend.models.ml_logic import (
    generate_synthetic_loan_data, compute_fairness_metrics, 
    detect_feature_drift, forecast_fairness, simulate_reweighting_fix,
    calculate_financial_impact
)

cache = {
    "df": None,
    "weekly_metrics": None,
    "drift_df": None,
    "forecast": None,
    "generated_at": None
}

def initialize_data():
    print("🚀 Initializing synthetic data and caching results...")
    df, _ = generate_synthetic_loan_data(weeks=26, samples_per_week=500, seed=42)
    weekly_metrics = compute_fairness_metrics(df, reference_group='White')
    drift_df = detect_feature_drift(df, current_weeks=4, baseline_weeks=4)
    

    
    hist_di = weekly_metrics['di_Black'].tail(12).values
    best_fc, cross_w, lower, upper, model_tag = forecast_fairness(hist_di, weeks_ahead=8, threshold=0.85)
    
    forecast_data = {
        "historical": [float(x) for x in hist_di],
        "values": [float(x) for x in best_fc],
        "lower": [float(x) for x in lower],
        "upper": [float(x) for x in upper],
        "crossing_week": int(cross_w) if cross_w is not None else None,
        "model": str(model_tag)
    }
    
    cache["df"] = df
    cache["weekly_metrics"] = weekly_metrics
    cache["drift_df"] = drift_df
    cache["forecast"] = forecast_data
    cache["generated_at"] = time.time()
    print("✅ Initialization complete.")

def get_cache():
    return cache
