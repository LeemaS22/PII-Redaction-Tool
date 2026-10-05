import React, { useState, useEffect } from 'react';
import { Loader2, FileDown, ShieldCheck, AlertCircle, FileText, Info } from 'lucide-react';
import { API_BASE, apiFetch } from '../services/apiConfig';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('all');

  const fetchReports = async (range) => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/api/reports/summary?dateRange=${range}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load reports');
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(dateRange);
  }, [dateRange]);

  const handleExport = async () => {
    window.location.href = `${API_BASE}/api/reports/export?dateRange=${dateRange}`;
  };

  if (loading && !data) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-sky-400" /></div>;
  if (error) return <div className="p-4 text-rose-400">Unable to load report data: {error}</div>;
  if (!data || data.summary.totalDocuments === 0) return <div className="p-4 text-slate-400">No reports available yet. Upload and process a document to generate reporting data.</div>;

  const { summary, piiBreakdown, recentActivity } = data;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-100">Reports</h1>
        <div className="flex gap-2">
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="bg-slate-800 text-slate-200 p-2 rounded">
                <option value="all">All Time</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
            </select>
            <button onClick={handleExport} className="bg-sky-600 hover:bg-sky-700 text-white p-2 rounded flex items-center gap-2"><FileDown size={18}/> Export Report</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
            {label: 'Total Documents', value: summary.totalDocuments},
            {label: 'PII Detected', value: summary.totalPII},
            {label: 'Redacted', value: summary.totalRedacted},
            {label: 'Kept', value: summary.totalKept}
        ].map(stat => (
            <div key={stat.label} className="bg-slate-800 p-4 rounded-lg">
                <div className="text-slate-400 text-sm">{stat.label}</div>
                <div className="text-2xl font-bold text-slate-100">{stat.value}</div>
            </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-lg">
            <h2 className="text-lg font-bold mb-4 text-slate-100">PII Breakdown</h2>
            {piiBreakdown.map(item => (
                <div key={item.type} className="flex justify-between mb-2">
                    <span className="text-slate-300">{item.type}</span>
                    <span className="font-bold text-slate-100">{item.count}</span>
                </div>
            ))}
        </div>
        <div className="bg-slate-800 p-6 rounded-lg">
            <h2 className="text-lg font-bold mb-4 text-slate-100">Document Summary</h2>
            <div className="space-y-2">
                <div className="flex justify-between"><span>Scanned:</span><span>{summary.scannedDocuments}</span></div>
                <div className="flex justify-between"><span>Reviewed:</span><span>{summary.reviewedDocuments}</span></div>
                <div className="flex justify-between"><span>Redacted:</span><span>{summary.redactedDocuments}</span></div>
                <div className="flex justify-between"><span>Failed:</span><span>{summary.failedDocuments}</span></div>
            </div>
        </div>
      </div>
    </div>
  );
}
