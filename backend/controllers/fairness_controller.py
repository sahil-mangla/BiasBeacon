import time
import numpy as np
import pandas as pd
from backend.models.ml_logic import (
    generate_synthetic_loan_data, 
    calculate_financial_impact,
    FairnessMetrics,
    RootCauseAnalyzer,
    ForecastingEngine
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
    df, reference_group = generate_synthetic_loan_data(weeks=20, samples_per_week=400, seed=42)
    
    # 1. Fairness Metrics
    fm = FairnessMetrics(df, target_col='approved', protected_col='group', 
                         privileged_group='White', unprivileged_group='Black', date_col='date')
    weekly_metrics = fm.compute_weekly()

    # 2. Root Cause Analysis
    rc_analyzer = RootCauseAnalyzer(df, target_col='approved', protected_col='group', 
                                    fairness_series=weekly_metrics['disparate_impact'])
    rc_analyzer.set_time_column(date_col='date', privileged_group='White', baseline_weeks=4)
    drift_df = rc_analyzer.run_analysis()['drift_df']

    # 3. Forecast
    forecaster = ForecastingEngine(weekly_metrics, metric_name='disparate_impact', 
                                   threshold=0.85, crossing_direction='below')
    forecast_values, crossing_week, lower, upper, model_tag = forecaster.predict_crossing_date(future_weeks=8)
    
    forecast_data = {
        "historical": [float(x) for x in weekly_metrics['disparate_impact'].tail(12).values],
        "values": [float(x) for x in forecast_values],
        "lower": [float(x) for x in lower],
        "upper": [float(x) for x in upper],
        "crossing_week": int(crossing_week) if crossing_week is not None else None,
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
