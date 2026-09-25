/**
 * API Client for Vehicle Insurance Fraud Intelligence Platform
 * Connects frontend to FastAPI backend endpoints.
 * Automatically uses VITE_API_URL or defaults to http://localhost:8000
 */

export const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL)
  ? import.meta.env.VITE_API_URL
  : 'http://localhost:8000';

console.log(`[API Config] Base URL configured as: ${API_BASE_URL}`);

let isBackendAvailable = null;

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }
    isBackendAvailable = true;
    return await res.json();
  } catch (error) {
    console.warn(`[API Warning] Request to ${url} failed:`, error.message);
    isBackendAvailable = false;
    throw error;
  }
}

export async function checkHealth() {
  try {
    const data = await request('/api/health');
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function getDashboardSummary() {
  return await request('/api/dashboard/summary');
}

export async function getClaims({
  page = 1,
  pageSize = 10,
  search = '',
  fraudStatus = 'ALL',
  severity = 'ALL',
  state = 'ALL',
  sortBy = 'policy_number',
  sortDir = 'asc'
} = {}) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    fraud_status: fraudStatus,
    severity: severity,
    state: state,
    sort_by: sortBy,
    sort_dir: sortDir
  });
  if (search && search.trim()) {
    params.set('search', search.trim());
  }
  return await request(`/api/claims?${params.toString()}`);
}

export async function getClaimDetails(policyNumber) {
  return await request(`/api/claims/${policyNumber}`);
}

export async function getFraudVsGenuine() {
  return await request('/api/analytics/fraud-vs-genuine');
}

export async function getFraudByVehicle() {
  return await request('/api/analytics/fraud-by-vehicle');
}

export async function getFraudBySite() {
  return await request('/api/analytics/fraud-by-site');
}

export async function getFraudByAge() {
  return await request('/api/analytics/fraud-by-age');
}

export async function getRiskDistribution() {
  return await request('/api/analytics/risk-distribution');
}

export async function getMonthlyTrend() {
  return await request('/api/analytics/monthly-trend');
}

export async function predictClassification(claimData) {
  return await request('/api/classification/predict', {
    method: 'POST',
    body: JSON.stringify(claimData)
  });
}

export async function predictRegression(regressionData) {
  return await request('/api/regression/predict', {
    method: 'POST',
    body: JSON.stringify(regressionData)
  });
}

export async function getClassificationModels() {
  return await request('/api/classification/models');
}

export async function getClassificationEvaluation() {
  return await request('/api/classification/evaluation');
}
