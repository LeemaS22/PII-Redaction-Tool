import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  RefreshCw,
  Clock,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Loader2,
  Filter,
} from 'lucide-react';
import { motion } from 'framer-motion';

const ACTION_CONFIG = {
  DOCUMENT_UPLOADED: { label: 'Document Uploaded', color: 'text-sky-400' },
  PII_SCAN_STARTED: { label: 'PII Scan Started', color: 'text-blue-400' },
  PII_SCAN_COMPLETED: { label: 'PII Scan Completed', color: 'text-amber-400' },
  PII_REVIEW_STARTED: { label: 'Review Started', color: 'text-indigo-400' },
  PII_REVIEW_COMPLETED: { label: 'Review Completed', color: 'text-cyan-400' },
  REDACTION_STARTED: { label: 'Redaction Started', color: 'text-purple-400' },
  REDACTION_COMPLETED: { label: 'Redaction Completed', color: 'text-emerald-400' },
  REDACTION_FAILED: { label: 'Redaction Failed', color: 'text-rose-400' },
  PROTECTED_DOCUMENT_GENERATED: { label: 'Protected Document Generated', color: 'text-emerald-400' },
  PROTECTED_DOCUMENT_DOWNLOADED: { label: 'Protected Document Downloaded', color: 'text-teal-400' },
};

import { API_BASE, apiFetch } from '../services/apiConfig';

function formatTimestamp(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState('ALL');
  const [activeActivity, setActiveActivity] = useState('ALL');
  const [activeDate, setActiveDate] = useState('ALL');

  const fetchHistory = async () => {
    try {
      setLoading(true);
      // NOTE: Using a hypothetical combined endpoint or fetching all logs if not available
      const res = await apiFetch(`${API_BASE}/api/audit-logs`);
      const result = await res.json();
      if (res.ok && result.success) {
        setActivities(result.data || []);
      }
    } catch (err) {
      console.error('Fetch history error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filteredActivities = activities.filter(act => {
    const matchesSearch = !searchQuery || act.metadata?.filename?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = activeStatus === 'ALL' || act.status === activeStatus;
    const matchesActivity = activeActivity === 'ALL' || act.action === activeActivity;
    
    // Simple date filter logic
    let matchesDate = true;
    if (activeDate !== 'ALL') {
        const now = new Date();
        const days = activeDate === '7D' ? 7 : 30;
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        matchesDate = new Date(act.timestamp) >= cutoff;
    }
    
    return matchesSearch && matchesStatus && matchesActivity && matchesDate;
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-slate-100">History</h2>
        <button onClick={fetchHistory} className="text-slate-400 hover:text-slate-200"><RefreshCw className="h-4 w-4" /></button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 p-4 bg-[#111726] rounded-xl border border-slate-800">
        <input type="text" placeholder="Search document..." onChange={e => setSearchQuery(e.target.value)} className="bg-[#090D16] p-2 rounded-lg text-xs" />
        <select onChange={e => setActiveStatus(e.target.value)} className="bg-[#090D16] p-2 rounded-lg text-xs"><option value="ALL">Status: All</option></select>
        <select onChange={e => setActiveActivity(e.target.value)} className="bg-[#090D16] p-2 rounded-lg text-xs"><option value="ALL">Activity: All</option></select>
        <select onChange={e => setActiveDate(e.target.value)} className="bg-[#090D16] p-2 rounded-lg text-xs"><option value="ALL">Date: All Time</option></select>
      </div>

      {/* Activity List */}
      <div className="space-y-4">
        {filteredActivities.map(act => {
            const config = ACTION_CONFIG[act.action] || { label: act.action, color: 'text-slate-400' };
            return (
                <div key={act._id} className="p-4 bg-[#111726] rounded-xl border border-slate-800 flex justify-between items-center">
                    <div>
                        <div className="text-xs text-slate-400">{formatTimestamp(act.timestamp)}</div>
                        <div className={`font-semibold ${config.color}`}>{config.label}</div>
                        <div className="text-sm text-slate-200">{act.metadata?.filename}</div>
                    </div>
                    <div className="text-xs font-mono text-slate-500">Status: {act.status}</div>
                </div>
            );
        })}
      </div>
    </motion.div>
  );
}
