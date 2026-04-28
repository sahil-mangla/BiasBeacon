// Extended API client for session-based endpoints
// Existing fetchFromApi from lib/api.ts is unchanged

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export async function uploadFile(
  file: File,
  onProgress?: (pct: number) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.detail || `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.open('POST', `${API_BASE}/api/upload`);
    xhr.send(formData);
  });
}

export async function postMetrics(body: {
  session_id: string;
  target_col: string;
  protected_col: string;
  privileged_group: string;
  date_col?: string | null;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/api/metrics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Metrics failed (${res.status})`);
  }
  return res.json();
}

export async function postForecast(session_id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/forecast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Forecast failed (${res.status})`);
  }
  return res.json();
}

export async function postRootcause(session_id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/rootcause`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Rootcause failed (${res.status})`);
  }
  return res.json();
}

export async function postSimulate(body: {
  feature: string;
  method?: string;
  reference_group?: string;
  threshold?: number;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/api/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: 'reweight', reference_group: 'White', threshold: 0.80, ...body }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Simulate failed (${res.status})`);
  }
  return res.json();
}

export async function postFinancial(session_id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/financial`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Financial failed (${res.status})`);
  }
  return res.json();
}

export async function fetchDemoData(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/demo-data`);
  if (!res.ok) throw new Error('Demo data unavailable');
  return res.json();
}
