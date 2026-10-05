import React, { useState, useEffect } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { API_BASE, apiFetch } from '../services/apiConfig';

export default function PIIAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  useEffect(() => {
    apiFetch(`${API_BASE}/api/analytics/pii-exposure`)
      .then(res => res.json())
      .then(json => { setData(json.data || []); setLoading(false); })
      .catch(() => { setData([]); setLoading(false); });
  }, []);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-sky-400" /></div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">PII Risk Explorer</h1>
      <div className="bg-slate-800 p-6 rounded-lg">
        {data.map(item => (
            <div key={item.type} className="flex justify-between p-3 border-b border-slate-700">
                <span className="text-slate-200 font-medium">{item.type}</span>
                <span className={`px-2 py-1 rounded text-sm ${item.riskScore === 'HIGH' ? 'bg-rose-900 text-rose-200' : 'bg-amber-900 text-amber-200'}`}>{item.riskScore} Risk ({item.count} detections)</span>
            </div>
        ))}
      </div>
    </div>
  );
}
