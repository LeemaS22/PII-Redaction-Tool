import { API_BASE, apiFetch } from './apiConfig';

export async function fetchDashboardStats() {
  const res = await apiFetch(`${API_BASE}/api/dashboard/stats`);
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to fetch dashboard statistics.');
  }
  return json.data;
}

export async function fetchPiiBreakdown() {
  const res = await apiFetch(`${API_BASE}/api/dashboard/pii-breakdown`);
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to fetch PII breakdown.');
  }
  return json.data;
}

export async function fetchDocumentStatusBreakdown() {
  const res = await apiFetch(`${API_BASE}/api/dashboard/document-status`);
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to fetch document status breakdown.');
  }
  return json.data;
}

export async function fetchRecentDocuments(limit = 6) {
  const res = await apiFetch(`${API_BASE}/api/dashboard/recent-documents?limit=${limit}`);
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to fetch recent documents.');
  }
  return json.data;
}

export async function fetchRecentActivity(limit = 10) {
  const res = await apiFetch(`${API_BASE}/api/dashboard/recent-activity?limit=${limit}`);
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to fetch recent activity.');
  }
  return json.data;
}
