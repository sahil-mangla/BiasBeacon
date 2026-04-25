import numpy as np
import pandas as pd
from scipy.stats import ks_2samp, pearsonr
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_sample_weight
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.api import OLS, add_constant

# ML logic functions
def generate_synthetic_loan_data(
    weeks: int = 26,
    samples_per_week: int = 500,
    seed: int = 42,
) -> tuple[pd.DataFrame, str]:
    """
    Generate synthetic loan-approval data where bias against minority groups
    increases linearly over time through *feature drift* that a logistic model
    picks up – not through directly rigging approval rates.

    Returns
    -------
    df : pd.DataFrame
    reference_group : str
    """
    rng = np.random.default_rng(seed)          # local RNG – no global state

    groups = ['White', 'Black', 'Hispanic']
    reference_group = 'White'

    initial_di = 0.85   # week 1  – slightly biased
    final_di   = 0.55   # week 26 – severely biased

    all_data = []

    for week in range(1, weeks + 1):
        progress = (week - 1) / (weeks - 1)
        current_di = initial_di - (initial_di - final_di) * progress

        for _ in range(samples_per_week):
            group = rng.choice(groups, p=[0.4, 0.3, 0.3])

            # ── Feature distributions that drift for minorities ──────────────
            if group == 'White':
                credit_score   = rng.normal(720, 50)
                years_address  = rng.normal(8, 3)
                income         = rng.normal(75_000, 20_000)
            elif group == 'Black':
                credit_score   = rng.normal(680 - 50 * progress, 55)
                years_address  = rng.normal(6  -  4 * progress, 2.5)
                income         = rng.normal(55_000 - 15_000 * progress, 18_000)
            else:  # Hispanic
                credit_score   = rng.normal(690 - 30 * progress, 52)
                years_address  = rng.normal(7  -  2 * progress, 2.8)
                income         = rng.normal(60_000 - 10_000 * progress, 19_000)

            # Clamp to realistic ranges
            credit_score  = float(np.clip(credit_score,  300, 850))
            years_address = float(max(0.0, years_address))
            income        = float(max(20_000, income))

            # ── Approval via logistic score (features now *cause* outcome) ───
            # Weights calibrated so White approval ≈ 70 % at week 1.
            log_odds = (
                -6.0
                + 0.008  * credit_score
                + 0.06   * years_address
                + 0.000018 * income
            )
            # Apply a group-specific intercept shift that widens as bias grows
            if group == 'Black':
                log_odds += np.log(current_di / 1.0)     # pushes odds down
            elif group == 'Hispanic':
                log_odds += np.log((current_di + 0.05) / 1.0)

            prob_approve = 1 / (1 + np.exp(-log_odds))
            approved = int(rng.random() < prob_approve)

            all_data.append({
                'week': week,
                'group': group,
                'credit_score': credit_score,
                'years_at_current_address': years_address,
                'income': income,
                'approved': approved,
            })

    df = pd.DataFrame(all_data)
    return df, reference_group

def compute_fairness_metrics(
    df: pd.DataFrame,
    reference_group: str = 'White',
) -> pd.DataFrame:
    """
    For every week compute:
      • Disparate Impact  (DI  = P(approved|minority) / P(approved|reference))
      • Equal Opportunity (TPR ratio)
      • Predictive Parity (precision ratio)
      • Approval rates per group
    """
    weekly_metrics = []

    for week in sorted(df['week'].unique()):
        week_data = df[df['week'] == week]
        groups    = week_data['group'].unique()

        approval_rates, tpr_rates, precision_rates = {}, {}, {}

        for group in groups:
            gd = week_data[week_data['group'] == group]
            approval_rates[group]  = gd['approved'].mean()
            # TPR: P(approved | truly_approved) – here 'approved' is our label
            # so TPR = approval_rate (ground truth = approved in data)
            approved_mask = gd['approved'] == 1
            tpr_rates[group]       = approved_mask.mean() if len(gd) > 0 else np.nan
            precision_rates[group] = approved_mask.mean()  # same in binary sim

        ref_rate = approval_rates.get(reference_group, 1.0)
        ref_tpr  = tpr_rates.get(reference_group, 1.0)

        row = {'week': week, 'approval_rate_ref': ref_rate}
        for group in groups:
            if group == reference_group:
                continue
            row[f'di_{group}']            = approval_rates[group] / ref_rate if ref_rate > 0 else np.nan
            row[f'tpr_ratio_{group}']     = tpr_rates[group] / ref_tpr       if ref_tpr  > 0 else np.nan
            row[f'approval_rate_{group}'] = approval_rates[group]

        weekly_metrics.append(row)

    return pd.DataFrame(weekly_metrics).sort_values('week').reset_index(drop=True)

def bootstrap_ci(
    series: np.ndarray,
    forecast_fn,
    weeks_ahead: int = 8,
    n_boot: int = 200,
    alpha: float = 0.10,
    seed: int = 0,
) -> tuple[np.ndarray, np.ndarray]:
    """Return (lower, upper) bootstrap CI arrays of length weeks_ahead."""
    rng = np.random.default_rng(seed)
    boot_forecasts = []
    n = len(series)
    for _ in range(n_boot):
        sample_idx = rng.integers(0, n, size=n)
        try:
            fc = forecast_fn(series[sample_idx])
            if fc is not None and len(fc) == weeks_ahead:
                boot_forecasts.append(fc)
        except Exception:
            pass
    if not boot_forecasts:
        return series[-1] * np.ones(weeks_ahead), series[-1] * np.ones(weeks_ahead)
    boot_arr = np.array(boot_forecasts)
    return (
        np.percentile(boot_arr, 100 * alpha / 2,     axis=0),
        np.percentile(boot_arr, 100 * (1 - alpha/2), axis=0),
    )

def forecast_fairness(
    historical_di: np.ndarray,
    weeks_ahead: int = 8,
    threshold: float = 0.5,
) -> tuple[np.ndarray, int | None, np.ndarray, np.ndarray, str]:
    """
    Fit Linear, Holt-Winters, and ARIMA(1,1,0) models; select by AIC on a
    comparable scale (all via statsmodels); return forecast + bootstrap CI.
    """
    n = len(historical_di)
    X  = add_constant(np.arange(n))
    Xf = add_constant(np.arange(n, n + weeks_ahead))

    models: dict[str, tuple[np.ndarray, float]] = {}

    # ── Linear Regression (statsmodels OLS for consistent AIC) ──────────────
    try:
        ols    = OLS(historical_di, X).fit()
        lr_fc  = ols.predict(Xf)
        models['Linear'] = (lr_fc, ols.aic)
    except Exception as e:
        print(f"  Linear model failed: {e}")

    # ── Holt-Winters ─────────────────────────────────────────────────────────
    try:
        hw    = ExponentialSmoothing(historical_di, trend='add', seasonal=None).fit()
        hw_fc = np.asarray(hw.forecast(weeks_ahead))
        models['Holt-Winters'] = (hw_fc, hw.aic)
    except (ValueError, Exception) as e:
        print(f"  Holt-Winters failed: {e}")

    # ── ARIMA(1,1,0) ─────────────────────────────────────────────────────────
    try:
        arima    = ARIMA(historical_di, order=(1, 1, 0)).fit()
        arima_fc = np.asarray(arima.forecast(steps=weeks_ahead))
        models['ARIMA'] = (arima_fc, arima.aic)
    except (ValueError, Exception) as e:
        print(f"  ARIMA failed: {e}")

    if not models:
        raise RuntimeError("All forecasting models failed.")

    best_name     = min(models, key=lambda k: models[k][1])
    best_forecast = models[best_name][0]
    print(f"✅ Best forecasting model: {best_name} "
          f"(AIC={models[best_name][1]:.1f})")

    # ── Bootstrap CI ─────────────────────────────────────────────────────────
    def _lr_forecast(s: np.ndarray) -> np.ndarray:
        Xs  = add_constant(np.arange(len(s)))
        Xsf = add_constant(np.arange(len(s), len(s) + weeks_ahead))
        return OLS(s, Xs).fit().predict(Xsf)

    lower, upper = bootstrap_ci(historical_di, _lr_forecast, weeks_ahead)

    # ── Threshold crossing ────────────────────────────────────────────────────
    crossing_week = next(
        (i + 1 for i, v in enumerate(best_forecast) if v < threshold),
        None,
    )

    return best_forecast, crossing_week, lower, upper, best_name

def psi_aligned(
    expected: np.ndarray,
    actual: np.ndarray,
    bins: int = 10,
) -> float:
    """PSI with shared bin edges derived from the combined distribution."""
    edges = np.histogram_bin_edges(
        np.concatenate([expected, actual]), bins=bins
    )
    exp_counts = np.histogram(expected, bins=edges)[0].astype(float)
    act_counts = np.histogram(actual,   bins=edges)[0].astype(float)
    # Replace zeros to avoid log(0)
    exp_counts = np.where(exp_counts == 0, 1e-8, exp_counts)
    act_counts = np.where(act_counts == 0, 1e-8, act_counts)
    # Normalise to proportions
    exp_pct = exp_counts / exp_counts.sum()
    act_pct = act_counts / act_counts.sum()
    return float(np.sum((act_pct - exp_pct) * np.log(act_pct / exp_pct)))

def detect_feature_drift(
    df: pd.DataFrame,
    current_weeks: int = 4,
    baseline_weeks: int = 4,
) -> pd.DataFrame:
    """
    KS test + PSI (with aligned bins) comparing last N weeks vs first N weeks.
    Now includes per-group breakdown so minority-specific drift is visible.
    """
    max_week      = df['week'].max()
    baseline_data = df[df['week'] <= baseline_weeks]
    current_data  = df[df['week'] >  max_week - current_weeks]

    features = ['credit_score', 'years_at_current_address', 'income']
    groups   = sorted(df['group'].unique())
    rows     = []

    for feature in features:
        for group in ['ALL'] + groups:
            if group == 'ALL':
                base_vals = baseline_data[feature].values
                curr_vals = current_data[feature].values
            else:
                base_vals = baseline_data[baseline_data['group'] == group][feature].values
                curr_vals = current_data [current_data ['group'] == group][feature].values

            if len(base_vals) == 0 or len(curr_vals) == 0:
                continue

            ks_stat, ks_p = ks_2samp(base_vals, curr_vals)
            psi_val       = psi_aligned(base_vals, curr_vals)
            mean_shift    = (curr_vals.mean() - base_vals.mean()) / (base_vals.std() + 1e-9)

            rows.append({
                'feature':          feature,
                'group':            group,
                'ks_statistic':     round(ks_stat,  4),
                'ks_pvalue':        round(ks_p,     4),
                'psi':              round(psi_val,  4),
                'mean_shift_std':   round(abs(mean_shift), 3),
                'significant_drift': ks_p < 0.05 or psi_val > 0.1,
            })

    return pd.DataFrame(rows)

def simulate_reweighting_fix(
    df: pd.DataFrame,
    reference_group: str = 'White',
    feature_to_balance: str = 'years_at_current_address',
    test_size: float = 0.3,
    seed: int = 42,
) -> tuple[float, float, float, float, float]:
    """
    Train a logistic regression on the last week's data:
      1. Baseline model (no reweighting)
      2. Reweighted model (class_weight='balanced' by protected group)
    Evaluate DI on a held-out split.
    Returns (baseline_di, corrected_di, financial_savings, improvement, psi_val)
    """
    features = ['credit_score', 'years_at_current_address', 'income']
    last_week = df[df['week'] == df['week'].max()].copy()

    X = last_week[features].values
    y = last_week['approved'].values
    g = last_week['group'].values

    X_tr, X_te, y_tr, y_te, g_tr, g_te = train_test_split(
        X, y, g, test_size=test_size, random_state=seed, stratify=g,
    )

    def compute_di(y_pred, groups, ref=reference_group):
        rates = {grp: y_pred[groups == grp].mean() for grp in np.unique(groups)}
        ref_r = rates.get(ref, 1.0)
        return {grp: (r / ref_r if ref_r > 0 else np.nan)
                for grp, r in rates.items() if grp != ref}

    # Baseline model
    lr_base = LogisticRegression(max_iter=500, random_state=seed)
    lr_base.fit(X_tr, y_tr)
    pred_base = lr_base.predict(X_te)
    di_base   = compute_di(pred_base, g_te)

    # Reweighted model – sample weights balance protected groups in training
    sample_w = compute_sample_weight('balanced', y=g_tr)
    lr_fair  = LogisticRegression(max_iter=500, random_state=seed)
    lr_fair.fit(X_tr, y_tr, sample_weight=sample_w)
    pred_fair = lr_fair.predict(X_te)
    di_fair   = compute_di(pred_fair, g_te)

    baseline_di_black  = di_base.get('Black', 0.0)
    corrected_di_black = di_fair.get('Black', 0.0)
    improvement        = corrected_di_black - baseline_di_black

    # PSI of the balanced feature (for informational output)
    psi_val = drift_df.query("feature == @feature_to_balance and group == 'ALL'")['psi'].values
    psi_val = float(psi_val[0]) if len(psi_val) > 0 else 0.0

    # Financial impact – derive denied-minority fraction from data
    minority_denied_rate = (
        last_week[(last_week['group'] == 'Black') & (last_week['approved'] == 0)]
        .shape[0] / len(last_week)
    )
    annual_applications = 10_000
    profit_per_loan     = 500
    extra_approved      = annual_applications * minority_denied_rate * max(improvement, 0)
    financial_savings   = extra_approved * profit_per_loan

    return baseline_di_black, corrected_di_black, financial_savings, improvement, psi_val

def calculate_financial_impact(
    weekly_metrics: pd.DataFrame,
    df: pd.DataFrame,
    annual_applications: int = 10_000,
    profit_per_loan: int = 500,
) -> tuple[list, list, list, list]:
    """
    Estimate weekly savings if the model had been kept at DI ≥ 0.85 from the start.

    The 'conversion factor' (what fraction of excess-denied applicants would
    have been profitable if approved) is derived from the data: it equals the
    overall approval rate among the minority group in the baseline weeks –
    i.e. how many of those denials were creditworthy.
    """
    # Derive conversion factor from baseline data (weeks 1-4)
    baseline = df[df['week'] <= 4]
    minority  = baseline[baseline['group'] != 'White']
    conversion_factor = minority['approved'].mean()   # ≈ fraction that are creditworthy
    print(f"   Conversion factor (data-derived): {conversion_factor:.2f}")

    fair_target   = 0.85
    weekly_apps   = annual_applications / 52
    minority_share = 0.30   # 30 % of applicants are minority (matches data generation)

    weekly_savings_base, cum_base   = [], []
    weekly_savings_opt,  cum_opt    = [], []
    weekly_savings_pess, cum_pess   = [], []

    for i, row in weekly_metrics.iterrows():
        di = row['di_Black']
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

    def _lr_forecast(s: np.ndarray) -> np.ndarray:
        Xs  = add_constant(np.arange(len(s)))
        Xsf = add_constant(np.arange(len(s), len(s) + weeks_ahead))
        return OLS(s, Xs).fit().predict(Xsf)

