import requests
import pandas as pd
import numpy as np

# Generate a mock biased dataset
np.random.seed(42)
n_samples = 500

data = {
    'id': range(n_samples),
    'gender': np.random.choice(['Male', 'Female'], size=n_samples, p=[0.6, 0.4]),
    'income_bin': np.random.choice(['Low', 'Medium', 'High'], size=n_samples),
    'credit_score': np.random.normal(700, 50, n_samples)
}

df = pd.DataFrame(data)

# Create bias: Males with high income get approved more often
def approve(row):
    score = row['credit_score'] / 800
    if row['gender'] == 'Male':
        score += 0.2
    if row['income_bin'] == 'High':
        score += 0.1
    return 1 if score + np.random.normal(0, 0.1) > 0.8 else 0

df['approved'] = df.apply(approve, axis=1)

# Save to CSV
df.to_csv('test_bias_data.csv', index=False)

# Test the upload API
url = 'http://localhost:8080/api/upload-data'

try:
    with open('test_bias_data.csv', 'rb') as f:
        files = {'file': ('test_bias_data.csv', f, 'text/csv')}
        response = requests.post(url, files=files)
        
    print("Status Code:", response.status_code)
    
    if response.status_code == 200:
        data = response.json()
        print("\n--- Response ---")
        print(f"Status: {data.get('status')}")
        print(f"Message: {data.get('message')}")
        
        print("\n--- Detected Features ---")
        for k, v in data.get('detected', {}).items():
            print(f"{k}: {v}")
            
        print("\n--- Analysis Report ---")
        report = data.get('analysis_report', {})
        print(f"Category: {report.get('bias_category')}")
        print(f"Overall Status: {report.get('overall_status')}")
        print("Metrics Summary:")
        for k, v in report.get('metrics_summary', {}).items():
            print(f"  {k}: {v}")
        print("Violations:")
        for v in report.get('violations', []):
            print(f"  - {v}")
            
except Exception as e:
    print("Error:", e)
