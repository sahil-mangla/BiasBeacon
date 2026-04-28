import pandas as pd
import numpy as np
import warnings
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Union
import pickle
import json
import copy

# -- ML / Stats imports ---
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_sample_weight
from scipy import stats
from scipy.stats import ks_2samp, pearsonr
import statsmodels.api as sm
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from statsmodels.tsa.arima.model import ARIMA

# -- For simulation & script generation ---
from jinja2 import Template
import os

try:
    from diffprivlib import mechanisms as dp_mech
    DP_AVAILABLE = True
except ImportError:
    DP_AVAILABLE = False
    warnings.warn("diffprivlib not installed. Differential privacy not available.")

warnings.filterwarnings('ignore')

def generate_synthetic_loan_data(
    weeks: int = 26,
    samples_per_week: int = 500,
    seed: int = 42,
) -> tuple[pd.DataFrame, str]:
    """
    Generate synthetic loan-approval data where bias against minority groups
    increases linearly over time through *feature drift*.
    Added 'date' column for time-series operations.
    """
    rng = np.random.default_rng(seed)
    groups = ['White', 'Black', 'Hispanic']
    reference_group = 'White'
    initial_di = 0.85
    final_di   = 0.55
    all_data = []

    start_date = datetime.now() - timedelta(weeks=weeks)

    for week in range(1, weeks + 1):
        progress = (week - 1) / (weeks - 1)
        current_di = initial_di - (initial_di - final_di) * progress
        week_date = start_date + timedelta(weeks=week)

        for _ in range(samples_per_week):
            group = rng.choice(groups, p=[0.4, 0.3, 0.3])
            if group == 'White':
                credit_score   = rng.normal(720, 50)
                years_address  = rng.normal(8, 3)
                income         = rng.normal(75_000, 20_000)
            elif group == 'Black':
                credit_score   = rng.normal(680 - 50 * progress, 55)
                years_address  = rng.normal(6  -  4 * progress, 2.5)
                income         = rng.normal(55_000 - 15_000 * progress, 18_000)
            else:
                credit_score   = rng.normal(690 - 30 * progress, 52)
                years_address  = rng.normal(7  -  2 * progress, 2.8)
                income         = rng.normal(60_000 - 10_000 * progress, 19_000)

            credit_score  = float(np.clip(credit_score,  300, 850))
            years_address = float(max(0.0, years_address))
            income        = float(max(20_000, income))

            log_odds = (
                -6.0
                + 0.008  * credit_score
                + 0.06   * years_address
                + 0.000018 * income
            )
            if group == 'Black':
                log_odds += np.log(current_di / 1.0)
            elif group == 'Hispanic':
                log_odds += np.log((current_di + 0.05) / 1.0)

            prob_approve = 1 / (1 + np.exp(-log_odds))
            approved = int(rng.random() < prob_approve)
            creditworthy = int(credit_score >= 650)

            all_data.append({
                'week': week,
                'date': week_date,
                'group': group,
                'credit_score': credit_score,
                'years_at_current_address': years_address,
                'income': income,
                'creditworthy': creditworthy,
                'approved': approved,
            })

    df = pd.DataFrame(all_data)
    return df, reference_group

def calculate_financial_impact(
    weekly_metrics: pd.DataFrame,
    df: pd.DataFrame,
    annual_applications: int = 10_000,
    profit_per_loan: int = 500,
    protected_col: str = 'group',
    privileged_group: str = 'White',
    target_col: str = 'approved',
) -> tuple[list, list, list, list]:
    """Counterfactual loss estimator. Accepts dynamic column names for any CSV."""
    n_weeks = len(weekly_metrics) if weekly_metrics is not None and len(weekly_metrics) > 0 else 12
    if df is None or protected_col not in df.columns or target_col not in df.columns:
        zeros = [0.0] * n_weeks
        return zeros, zeros, zeros, zeros
    try:
        if 'week' in df.columns and pd.api.types.is_integer_dtype(df['week']):
            baseline = df[df['week'] <= 4]
        else:
            baseline = df.head(max(1, len(df) // 5))
        minority = baseline[baseline[protected_col] != privileged_group]
        target_vals = pd.to_numeric(minority[target_col], errors='coerce').dropna()
        conversion_factor = float(target_vals.mean()) if len(target_vals) > 0 else 0.5
    except Exception:
        conversion_factor = 0.5
    fair_target   = 0.85
    weekly_apps   = annual_applications / 52
    minority_share = 0.30

    weekly_savings_base, cum_base   = [], []
    weekly_savings_opt,  cum_opt    = [], []
    weekly_savings_pess, cum_pess   = [], []

    di_col = 'di_Black' if 'di_Black' in weekly_metrics.columns else 'disparate_impact'

    for i, row in weekly_metrics.iterrows():
        di = row.get(di_col, 1.0)
        gap = max(0.0, fair_target - di)

        extra_denied    = weekly_apps * minority_share * gap
        saved_base      = extra_denied * conversion_factor       * profit_per_loan
        saved_opt       = extra_denied * min(conversion_factor * 1.3, 1.0) * profit_per_loan
        saved_pess      = extra_denied * max(conversion_factor * 0.7, 0.0) * profit_per_loan

        weekly_savings_base.append(saved_base)
        weekly_savings_opt .append(saved_opt)
        weekly_savings_pess.append(saved_pess)

        cum_base.append(sum(weekly_savings_base))
        cum_opt .append(sum(weekly_savings_opt))
        cum_pess.append(sum(weekly_savings_pess))

    return weekly_savings_base, cum_base, cum_opt, cum_pess


class FairnessMetrics:
    def __init__(self, data: pd.DataFrame, target_col: str, protected_col: str,
                 privileged_group: str, unprivileged_group: str = None, date_col: str = None):
        self.data = data
        self.target_col = target_col
        self.protected_col = protected_col
        self.privileged = privileged_group
        all_vals = data[protected_col].unique()
        self.unprivileged = unprivileged_group if unprivileged_group else ([v for v in all_vals if v != privileged_group][0] if len(all_vals)>1 else None)
        self.date_col = date_col
        self.results = []

    def compute_metrics_for_group(self, group_mask: pd.Series, y_true: pd.Series, y_pred: pd.Series = None) -> dict:
        if y_pred is None:
            y_pred = y_true
        tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0,1]).ravel()
        tpr = tp / (tp + fn) if (tp+fn) > 0 else 0
        fpr = fp / (fp + tn) if (fp+tn) > 0 else 0
        ppv = tp / (tp + fp) if (tp+fp) > 0 else 0
        return {'tpr': tpr, 'fpr': fpr, 'ppv': ppv, 'count': len(y_true)}

    def disparate_impact(self, prob_priv: float, prob_unpriv: float) -> float:
        if prob_priv <= 0:
            return 0.0  # no privileged approvals → worst-case DI, not infinity
        return min(prob_unpriv / prob_priv, 4.0)  # cap at 4.0 to prevent overflow

    def equalized_odds_diff(self, tpr_priv, tpr_unpriv, fpr_priv, fpr_unpriv) -> float:
        return max(abs(fpr_unpriv - fpr_priv), abs(tpr_unpriv - tpr_priv))

    def demographic_parity_diff(self, prob_priv: float, prob_unpriv: float) -> float:
        return prob_unpriv - prob_priv

    def predictive_parity(self, ppv_priv: float, ppv_unpriv: float) -> float:
        return ppv_unpriv - ppv_priv

    def conditional_demographic_disparity(self) -> float:
        return 0.0

    def theil_index(self, outcomes: pd.Series) -> float:
        if outcomes.dtype == 'object':
            outcomes = outcomes.astype(float)
        n = len(outcomes)
        if n == 0 or outcomes.sum() == 0:
            return 0.0
        mean = outcomes.mean()
        if mean == 0:
            return 0.0
        relative = outcomes / mean
        theil = (1/n) * np.sum(relative * np.log(relative))
        return theil

    def compute_all_metrics(self, week_data: pd.DataFrame) -> dict:
        y_true = week_data['creditworthy'] if 'creditworthy' in week_data.columns else week_data[self.target_col]
        y_pred = week_data[self.target_col]

        priv_mask = week_data[self.protected_col] == self.privileged
        unpriv_mask = week_data[self.protected_col] == self.unprivileged

        priv_stats = self.compute_metrics_for_group(priv_mask, y_true[priv_mask], y_pred[priv_mask])
        unpriv_stats = self.compute_metrics_for_group(unpriv_mask, y_true[unpriv_mask], y_pred[unpriv_mask])

        prob_priv = y_pred[priv_mask].mean() if priv_mask.any() else 0
        prob_unpriv = y_pred[unpriv_mask].mean() if unpriv_mask.any() else 0

        di = self.disparate_impact(prob_priv, prob_unpriv)
        eod = self.equalized_odds_diff(priv_stats['tpr'], unpriv_stats['tpr'],
                                        priv_stats['fpr'], unpriv_stats['fpr'])
        dp_diff = self.demographic_parity_diff(prob_priv, prob_unpriv)
        pred_par = self.predictive_parity(priv_stats['ppv'], unpriv_stats['ppv'])
        cdd = self.conditional_demographic_disparity()
        theil = self.theil_index(week_data[self.target_col])

        return {
            'disparate_impact': di,
            'equalized_odds_diff': eod,
            'demographic_parity_diff': dp_diff,
            'predictive_parity': pred_par,
            'conditional_demographic_disparity': cdd,
            'theil_index': theil,
            'prob_priv': prob_priv,
            'prob_unpriv': prob_unpriv,
            'count_priv': priv_mask.sum(),
            'count_unpriv': unpriv_mask.sum()
        }

    def compute_weekly(self) -> pd.DataFrame:
        if self.date_col is None:
            if 'week' in self.data.columns:
                weeks = self.data.groupby('week')
                for week_val, week_data in weeks:
                    if len(week_data) > 0:
                        metrics = self.compute_all_metrics(week_data)
                        metrics['week'] = week_val
                        metrics['week_start'] = week_val
                        self.results.append(metrics)
            else:
                week_metrics = self.compute_all_metrics(self.data)
                week_metrics['week_start'] = datetime.now().date()
                self.results.append(week_metrics)
        else:
            # ── IMPORTANT: never mutate the original dataframe ──────────────
            data_copy = self.data.copy()
            data_copy[self.date_col] = pd.to_datetime(data_copy[self.date_col])
            df = data_copy.set_index(self.date_col).sort_index()
            weeks = df.resample('W')
            week_counter = 1
            for week_start, week_data in weeks:
                if len(week_data) < 5:
                    continue  # skip weeks too thin to compute reliable metrics

                priv_count = (week_data[self.protected_col].astype(str) == str(self.privileged)).sum()
                unpriv_count = len(week_data) - priv_count

                if priv_count < 2 or unpriv_count < 2:
                    continue  # skip weeks where a group has 0 members → DI would be inf or 0/0

                metrics = self.compute_all_metrics(week_data)
                if metrics is None:
                    continue
                metrics['week_start'] = week_start.date()
                metrics['week'] = week_counter
                self.results.append(metrics)
                week_counter += 1

        results_df = pd.DataFrame(self.results)
        if self.unprivileged == 'Black':
            results_df['di_Black'] = results_df['disparate_impact']
        return results_df


class ForecastingEngine:
    def __init__(self, metrics_df: pd.DataFrame, metric_name: str, threshold: float,
                 crossing_direction: str = 'below'):
        self.df = metrics_df.sort_values('week_start').copy()
        self.metric = metric_name
        self.threshold = threshold
        self.direction = crossing_direction
        self.model = None
        self.model_name = None

    def _detect_seasonality(self, series: pd.Series) -> bool:
        if len(series) < 5:
            return False
        autocorr = series.autocorr(lag=4)
        return False if pd.isna(autocorr) else abs(autocorr) > 0.3

    def _fit_best_model(self, series: pd.Series):
        X = np.arange(len(series)).reshape(-1,1)
        y = series.values
        lr = LinearRegression()
        lr.fit(X, y)
        lr_pred = lr.predict(X)
        lr_mae = mean_absolute_error(y, lr_pred)

        best_mae = lr_mae
        best_model = lr
        best_name = "LinearRegression"

        if self._detect_seasonality(series) and len(series) >= 10:
            try:
                hw = ExponentialSmoothing(series, seasonal_periods=4, trend='add', seasonal='add').fit()
                hw_pred = hw.fittedvalues
                hw_mae = mean_absolute_error(y[4:], hw_pred[4:]) if len(y)>4 else np.inf
                if hw_mae < best_mae:
                    best_mae = hw_mae
                    best_model = hw
                    best_name = "HoltWinters"
            except:
                pass

        try:
            arima = ARIMA(series, order=(1,1,0), trend='c').fit()
            arima_pred = arima.fittedvalues
            arima_mae = mean_absolute_error(y[2:], arima_pred[2:]) if len(y)>2 else np.inf
            if arima_mae < best_mae:
                best_mae = arima_mae
                best_model = arima
                best_name = "ARIMA(1,1,0)"
        except:
            pass

        self.model = best_model
        self.model_name = best_name

    def predict_crossing_date(self, future_weeks: int = 52):
        series = self.df.set_index('week_start')[self.metric]
        self._fit_best_model(series)

        last_date = series.index[-1]
        forecast_values = []
        residuals = []

        if self.model_name == "LinearRegression":
            X_future = np.arange(len(series), len(series)+future_weeks).reshape(-1,1)
            preds = self.model.predict(X_future)
            X_train = np.arange(len(series)).reshape(-1,1)
            train_pred = self.model.predict(X_train)
            residuals = series.values - train_pred
            forecast_values = preds
        elif self.model_name == "HoltWinters":
            preds = self.model.forecast(future_weeks)
            fitted = self.model.fittedvalues
            residuals = series.iloc[-len(fitted):].values - fitted.values
            forecast_values = preds
        elif self.model_name == "ARIMA(1,1,0)":
            preds = self.model.forecast(steps=future_weeks)
            residuals = self.model.resid[~np.isnan(self.model.resid)]
            forecast_values = preds
        else:
            return None, None, None, None, None

        cross_week = None
        for i, val in enumerate(forecast_values):
            if self.direction == 'below' and val < self.threshold:
                cross_week = i
                break
            elif self.direction == 'above' and val > self.threshold:
                cross_week = i
                break

        if cross_week is None:
            cross_week_val = None
        else:
            cross_week_val = len(series) + cross_week + 1

        if len(residuals) > 1:
            bootstrap_residuals = np.random.choice(residuals, size=1000, replace=True)
            lower_bound = np.percentile(bootstrap_residuals, 5)
            upper_bound = np.percentile(bootstrap_residuals, 95)
            lower = forecast_values + lower_bound
            upper = forecast_values + upper_bound
        else:
            lower = forecast_values - 0.05
            upper = forecast_values + 0.05

        return forecast_values, cross_week_val, lower, upper, self.model_name


class RootCauseAnalyzer:
    def __init__(self, data: pd.DataFrame, target_col: str, protected_col: str,
                 fairness_series: pd.Series, feature_columns: List[str] = None):
        self.data = data
        self.target = target_col
        self.protected = protected_col
        self.fairness_series = fairness_series
        if feature_columns is None:
            self.features = [c for c in data.columns if c not in [target_col, protected_col, 'week', 'date', 'creditworthy', 'approved']]
        else:
            self.features = feature_columns
        self.date_col = None
        self.baseline = None
        self.privileged_group = None

    def set_time_column(self, date_col: str, privileged_group: str = None, baseline_weeks=4):
        self.date_col = date_col
        self.privileged_group = privileged_group
        
        if self.data[date_col].dtype.name == 'datetime64[ns]' or type(self.data[date_col].iloc[0]) != int:
            self.data[date_col] = pd.to_datetime(self.data[date_col])
            min_date = self.data[date_col].min()
            baseline_end = min_date + timedelta(weeks=baseline_weeks)
            self.baseline = self.data[self.data[date_col] <= baseline_end]
        else:
            self.baseline = self.data[self.data[date_col] <= baseline_weeks]

    def drift_ks_numeric(self, current: pd.Series, baseline: pd.Series) -> Tuple[float, bool]:
        stat, p = ks_2samp(baseline.dropna(), current.dropna())
        return stat, p < 0.05

    def drift_psi_categorical(self, current: pd.Series, baseline: pd.Series, bins: int = 10) -> float:
        if current.dtype in ['object', 'category']:
            cats = set(current.unique()).union(set(baseline.unique()))
            psi = 0
            for cat in cats:
                p_base = (baseline == cat).mean()
                p_cur = (current == cat).mean()
                if p_base > 0 and p_cur > 0:
                    psi += (p_cur - p_base) * np.log(p_cur / p_base)
            return psi
        else:
            combined = pd.concat([baseline, current])
            try:
                q_cuts = pd.qcut(combined, q=bins, duplicates='drop')
                bins_edges = q_cuts.cat.categories
            except:
                bins_edges = np.linspace(combined.min(), combined.max(), bins+1)
            baseline_binned = pd.cut(baseline, bins_edges, include_lowest=True)
            current_binned = pd.cut(current, bins_edges, include_lowest=True)
            psi = 0
            for interval in baseline_binned.cat.categories:
                p_base = (baseline_binned == interval).mean()
                p_cur = (current_binned == interval).mean()
                if p_base > 0 and p_cur > 0:
                    psi += (p_cur - p_base) * np.log(p_cur / p_base)
            return psi

    def compute_drift_over_weeks(self) -> pd.DataFrame:
        if self.date_col is None:
            raise ValueError("Set time column first with set_time_column()")

        if self.data[self.date_col].dtype.name == 'datetime64[ns]':
            weeks = self.data.groupby(pd.Grouper(key=self.date_col, freq='W'))
        else:
            weeks = self.data.groupby(self.date_col)

        drift_records = []
        for week_start, week_data in weeks:
            for group in ['ALL'] + list(self.data[self.protected].unique()):
                if group == 'ALL':
                    cur_group_data = week_data
                    base_group_data = self.baseline
                else:
                    cur_group_data = week_data[week_data[self.protected] == group]
                    base_group_data = self.baseline[self.baseline[self.protected] == group]

                for feat in self.features:
                    cur_vals = cur_group_data[feat]
                    base_vals = base_group_data[feat]
                    
                    if cur_vals.empty or base_vals.empty:
                        continue
                    if pd.api.types.is_numeric_dtype(cur_vals):
                        stat, drifted = self.drift_ks_numeric(cur_vals, base_vals)
                        psi = self.drift_psi_categorical(cur_vals, base_vals)
                        drift_records.append({
                            'week': week_start.date() if hasattr(week_start, 'date') else week_start,
                            'group': group,
                            'feature': feat,
                            'drift_stat': stat,
                            'drifted': drifted,
                            'drift_type': 'KS',
                            'psi': psi,
                            'significant_drift': drifted or psi > 0.1
                        })
                    else:
                        psi = self.drift_psi_categorical(cur_vals, base_vals)
                        drifted = psi > 0.1
                        drift_records.append({
                            'week': week_start.date() if hasattr(week_start, 'date') else week_start,
                            'group': group,
                            'feature': feat,
                            'drift_stat': psi,
                            'drifted': drifted,
                            'drift_type': 'PSI',
                            'psi': psi,
                            'significant_drift': drifted
                        })
        return pd.DataFrame(drift_records)

    def run_analysis(self) -> dict:
        drift_df = self.compute_drift_over_weeks()
        return {
            'drift_df': drift_df
        }

class SimulationEngine:
    def __init__(self, data: pd.DataFrame, target_col: str, protected_col: str,
                 privileged_group: str, feature_to_correct: str):
        self.data = data
        self.target = target_col
        self.protected = protected_col
        self.privileged = privileged_group
        self.correction_feature = feature_to_correct
        self.corrected_data = None

    def reweight_by_feature_imbalance(self) -> pd.DataFrame:
        data_copy = self.data.copy()
        if pd.api.types.is_numeric_dtype(data_copy[self.correction_feature]):
            data_copy['_temp_bin'] = pd.qcut(data_copy[self.correction_feature], q=5, labels=False, duplicates='drop')
            groups = data_copy.groupby('_temp_bin')
        else:
            groups = data_copy.groupby(self.correction_feature)

        total_samples = len(data_copy)
        weights = np.zeros(total_samples)
        for name, idx in groups.groups.items():
            group_size = len(idx)
            weight = total_samples / (group_size * len(groups))
            weights[idx] = weight
        data_copy['_weight'] = weights
        sampled_indices = np.random.choice(data_copy.index, size=total_samples, replace=True, p=weights/weights.sum())
        self.corrected_data = data_copy.loc[sampled_indices].drop(columns=['_weight', '_temp_bin'], errors='ignore')
        return self.corrected_data

    def simulate_forecast(self, unprivileged_group):
        # Group by the integer 'week' column (date_col=None) to avoid
        # converting the week column to datetime64, which would corrupt cache["df"].
        fm_sim = FairnessMetrics(self.corrected_data, self.target, self.protected,
                                 self.privileged, unprivileged_group, date_col=None)
        metrics_sim = fm_sim.compute_weekly()
        di_sim = metrics_sim['disparate_impact'].mean() if not metrics_sim.empty else 1.0

        fm_orig = FairnessMetrics(self.data, self.target, self.protected,
                                  self.privileged, unprivileged_group, date_col=None)
        metrics_orig = fm_orig.compute_weekly()
        di_orig = metrics_orig['disparate_impact'].mean() if not metrics_orig.empty else 0.5

        improvement = (di_sim - di_orig) / di_orig if di_orig > 0 else 0
        return {
            'original_di': di_orig,
            'simulated_di': di_sim,
            'improvement': improvement,
            'weekly_sim': metrics_sim,
            'weekly_orig': metrics_orig,
        }

    def generate_mitigation_script(self) -> str:
        template_str = """#!/usr/bin/env python3
# Auto-generated fairness mitigation script
# Fix applied: re-weighting based on feature '{{ correction_feature }}'

import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression

def apply_reweighting(data, correction_feature, target_col, protected_col, privileged_group):
    data = data.copy()
    if pd.api.types.is_numeric_dtype(data[correction_feature]):
        data['_temp_bin'] = pd.qcut(data[correction_feature], q=5, labels=False, duplicates='drop')
        groups = data.groupby('_temp_bin')
    else:
        groups = data.groupby(correction_feature)
    total = len(data)
    weights = np.zeros(total)
    for name, idx in groups.groups.items():
        group_size = len(idx)
        weight = total / (group_size * len(groups))
        weights[idx] = weight
    sampled_idx = np.random.choice(data.index, size=total, replace=True, p=weights/weights.sum())
    corrected = data.loc[sampled_idx].drop('_temp_bin', axis=1, errors='ignore')
    return corrected

if __name__ == "__main__":
    df = pd.read_csv("your_training_data.csv")
    fixed_df = apply_reweighting(df, "{{ correction_feature }}", "{{ target }}", "{{ protected }}", "{{ privileged }}")
    fixed_df.to_csv("fair_training_set.csv", index=False)
    print("Fair training set saved.")
"""
        template = Template(template_str)
        script_content = template.render(
            correction_feature=self.correction_feature,
            target=self.target,
            protected=self.protected,
            privileged=self.privileged
        )
        return script_content


class UnbiasingLayer:
    def __init__(self, data: pd.DataFrame, target_col: str, protected_col: str,
                 privileged_group: str, prediction_score_col: str = None):
        self.original_data = data.copy()
        self.target = target_col
        self.protected = protected_col
        self.privileged = privileged_group
        self.unprivileged = [v for v in data[protected_col].unique() if v != privileged_group][0]
        self.score_col = prediction_score_col
        if self.score_col is None or self.score_col not in data.columns:
            self.score_col = target_col
        self.cleaned_data = None
        self.applied_method = None

    def reweighting(self) -> pd.DataFrame:
        df = self.original_data.copy()
        group_counts = df[self.protected].value_counts()
        total = len(df)
        weights = np.ones(total)
        for group, count in group_counts.items():
            desired = total / len(group_counts)
            weight = desired / count
            weights[df[self.protected] == group] = weight
        df['_weight'] = weights
        self.cleaned_data = df
        self.applied_method = "reweighting"
        return df

    def reject_option_classification(self, margin: float = 0.2, gamma: float = 0.5) -> pd.DataFrame:
        df = self.original_data.copy()
        scores = df[self.score_col].values
        original_decision = (scores > 0.5).astype(int)
        borderline = (scores >= 0.5 - margin) & (scores <= 0.5 + margin)
        is_unpriv = (df[self.protected] == self.unprivileged).values
        new_decision = original_decision.copy()
        flip_mask = borderline & is_unpriv
        new_decision[flip_mask] = 1 - new_decision[flip_mask]
        df['_adjusted_prediction'] = new_decision
        df['_adjusted_target'] = new_decision
        self.cleaned_data = df
        self.applied_method = "reject_option"
        return df

    def threshold_adjustment(self, target_parity: str = 'equalized_odds') -> pd.DataFrame:
        df = self.original_data.copy()
        scores = df[self.score_col].values
        y_true = df[self.target].values

        priv_mask = (df[self.protected] == self.privileged).values
        unpriv_mask = (df[self.protected] == self.unprivileged).values

        def find_threshold(scores_group, y_group, target_tpr):
            thresholds = np.linspace(0, 1, 101)
            best_thresh = 0.5
            best_diff = np.inf
            for thresh in thresholds:
                pred = (scores_group >= thresh).astype(int)
                tp = np.sum((pred == 1) & (y_group == 1))
                fn = np.sum((pred == 0) & (y_group == 1))
                tpr = tp / (tp+fn) if (tp+fn)>0 else 0
                diff = abs(tpr - target_tpr)
                if diff < best_diff:
                    best_diff = diff
                    best_thresh = thresh
            return best_thresh

        overall_tpr = np.sum((scores > 0.5) & (y_true==1)) / max(1, np.sum(y_true==1))
        if target_parity == 'equalized_odds':
            priv_thresh = find_threshold(scores[priv_mask], y_true[priv_mask], overall_tpr)
            unpriv_thresh = find_threshold(scores[unpriv_mask], y_true[unpriv_mask], overall_tpr)
        else:
            desired_rate = np.mean((scores > 0.5))
            priv_thresh = find_threshold(scores[priv_mask], y_true[priv_mask], desired_rate)
            unpriv_thresh = find_threshold(scores[unpriv_mask], y_true[unpriv_mask], desired_rate)

        new_pred = np.zeros_like(scores, dtype=int)
        new_pred[priv_mask] = (scores[priv_mask] >= priv_thresh).astype(int)
        new_pred[unpriv_mask] = (scores[unpriv_mask] >= unpriv_thresh).astype(int)
        df['_adjusted_prediction'] = new_pred
        df['_adjusted_target'] = new_pred
        self.cleaned_data = df
        self.applied_method = "threshold_adjustment"
        return df

    def apply_differential_privacy_to_metrics(self, metrics_df: pd.DataFrame, epsilon: float = 1.0) -> pd.DataFrame:
        if not DP_AVAILABLE:
            return metrics_df
        dp_metrics = metrics_df.copy()
        numeric_cols = ['disparate_impact', 'equalized_odds_diff', 'demographic_parity_diff',
                        'predictive_parity', 'theil_index']
        for col in numeric_cols:
            if col in dp_metrics.columns:
                mech = dp_mech.Laplace(epsilon=epsilon, sensitivity=1.0)
                noisy_values = [mech.randomise(v) for v in dp_metrics[col].values]
                dp_metrics[col] = noisy_values
        return dp_metrics

    def get_cleaned_dataset(self) -> pd.DataFrame:
        if self.cleaned_data is None:
            raise ValueError("Run one of the mitigation methods first.")
        return self.cleaned_data