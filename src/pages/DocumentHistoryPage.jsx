import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Download,
  Eye,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileDown,
  Lock,
  Search,
  Check,
  Layers,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { motion } from 'framer-motion';

const ACTION_CONFIG = {
  DOCUMENT_UPLOADED: {
    label: 'Document Uploaded',
    icon: FileText,
    color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
  },
  PII_SCAN_STARTED: {
    label: 'PII Scan Started',
    icon: Search,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  },
  PII_SCAN_COMPLETED: {
    label: 'PII Scan Completed',
    icon: ShieldAlert,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  },
  PII_REVIEW_STARTED: {
    label: 'PII Review Started',
    icon: Eye,
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
  },
  PII_REVIEW_COMPLETED: {
    label: 'PII Review Completed',
    icon: Check,
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  },
  REDACTION_STARTED: {
    label: 'Redaction Started',
    icon: Lock,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  },
  REDACTION_COMPLETED: {
    label: 'Redaction Completed',
    icon: ShieldCheck,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  },
  REDACTION_FAILED: {
    label: 'Redaction Failed',
    icon: AlertCircle,
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  },
  PROTECTED_DOCUMENT_GENERATED: {
    label: 'Protected Document Generated',
    icon: Layers,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  },
  PROTECTED_DOCUMENT_DOWNLOADED: {
    label: 'Protected Document Downloaded',
    icon: FileDown,
    color: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
  },
};

const STATUS_BADGES = {
  UPLOADED: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  SCANNING: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  SCANNED: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  REVIEWED: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  REDACTED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  FAILED: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
};

import { API_BASE, apiFetch } from '../services/apiConfig';

function formatTimestamp(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export default function DocumentHistoryPage() {
  const { documentId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [docData, setDocData] = useState(null);
  const [history, setHistory] = useState([]);

  const fetchData = async () => {
    if (!documentId) return;
    try {
      setLoading(true);
      setError(null);

      const res = await apiFetch(`${API_BASE}/api/documents/${documentId}`);
      const result = await res.json();

      if (res.ok && result.success && result.data) {
        setDocData(result.data);
        setHistory(result.data.history || []);
      } else {
        throw new Error(result.error || 'Failed to load document history.');
      }
    } catch (err) {
      console.error('Fetch history error:', err);
      setError(err.message || 'Error loading document history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [documentId]);

  const handleDownloadProtected = () => {
    if (!documentId) return;
    const downloadEndpoint = `${API_BASE}/api/documents/${documentId}/download`;
    const link = document.createElement('a');
    link.href = downloadEndpoint;
    link.setAttribute('download', docData?.protectedFileName || 'protected_document.pdf');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Refresh history after download event is registered
    setTimeout(fetchData, 800);
  };

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
          <p className="text-xs text-slate-400">Loading document audit trail...</p>
        </div>
      </div>
    );
  }

  if (error || !docData) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-8">
        <button
          type="button"
          onClick={() => navigate('/documents')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back to Documents</span>
        </button>
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-center text-rose-300">
          <AlertCircle className="mx-auto h-8 w-8 text-rose-400" />
          <h3 className="mt-2 text-sm font-semibold">Document Not Found</h3>
          <p className="mt-1 text-xs text-rose-300/80">{error || 'Unable to retrieve audit records.'}</p>
        </div>
      </div>
    );
  }

  const statusBadge = STATUS_BADGES[docData.status] || STATUS_BADGES.UPLOADED;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mx-auto max-w-4xl space-y-6"
    >
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate('/documents')}
            className="mb-1 inline-flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-slate-200 cursor-pointer"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Back to Document Repository</span>
          </button>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-100">
            Document Audit Trail & History
          </h2>
          <p className="text-xs text-slate-400">
            Chronological processing events, entity decision telemetry, and redaction verification log.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchData}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-700 hover:text-white cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
          <span>Refresh History</span>
        </button>
      </div>

      {/* Document Status & Processing Summary Card */}
      <div className="rounded-xl border border-slate-800/90 bg-[#111726] p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-400">
              <FileText className="h-6 w-6" />
            </div>

            <div className="min-w-0">
              <div className="text-xs text-slate-400">Target Document</div>
              <div className="truncate font-mono text-sm font-semibold text-slate-100" title={docData.filename}>
                {docData.filename}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[11px] text-slate-400">Current Lifecycle Status</div>
              <div className={`mt-0.5 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 font-mono text-xs font-bold ${statusBadge}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                <span>{docData.status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Processing Metric Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-slate-800 bg-[#0B0F19] p-4">
                <div className="text-xs font-semibold text-slate-100 mb-4 uppercase tracking-wider">Processing Summary</div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#111726] p-3 rounded-lg border border-slate-800">
                        <div className="text-[11px] text-slate-400">Total Detected</div>
                        <div className="text-lg font-bold text-slate-100">{docData.detections?.length || 0}</div>
                    </div>
                    <div className="bg-[#111726] p-3 rounded-lg border border-slate-800">
                        <div className="text-[11px] text-rose-400">Marked Redact</div>
                        <div className="text-lg font-bold text-rose-300">{docData.detections?.filter(d => d.decision === 'REDACT').length || 0}</div>
                    </div>
                    <div className="bg-[#111726] p-3 rounded-lg border border-slate-800">
                        <div className="text-[11px] text-emerald-400">Kept</div>
                        <div className="text-lg font-bold text-emerald-300">{docData.detections?.filter(d => d.decision === 'KEEP').length || 0}</div>
                    </div>
                    <div className="bg-[#111726] p-3 rounded-lg border border-slate-800">
                        <div className="text-[11px] text-amber-400">Pending</div>
                        <div className="text-lg font-bold text-amber-300">{docData.detections?.filter(d => d.decision === 'PENDING').length || 0}</div>
                    </div>
                </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#0B0F19] p-4">
                <div className="text-xs font-semibold text-slate-100 mb-4 uppercase tracking-wider">PII Type Breakdown</div>
                <div className="space-y-2">
                    {Object.entries(docData.detections?.reduce((acc, d) => {
                        acc[d.type] = (acc[d.type] || 0) + 1;
                        return acc;
                    }, {}) || {}).map(([type, count]) => (
                        <div key={type} className="flex justify-between items-center text-xs">
                            <span className="font-mono text-slate-400">{type}</span>
                            <span className="font-bold text-slate-200">{count}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Protected Document Metadata & Download Option */}
        {docData.protectedFileName && docData.status === 'REDACTED' && (
          <div className="flex flex-col gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5 text-xs text-emerald-300">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>
                Protected copy generated: <strong className="font-mono text-slate-100">{docData.protectedFileName}</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={handleDownloadProtected}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-md transition-all hover:bg-emerald-400 active:scale-95 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Protected File</span>
            </button>
          </div>
        )}
      </div>

      {/* Audit Timeline Section */}
      <div className="rounded-xl border border-slate-800/90 bg-[#111726] p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-500/25 bg-sky-500/10 text-sky-400">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-wide text-slate-100 uppercase">
                Chronological Audit Events
              </h3>
              <p className="text-xs text-slate-400">
                Immutable processing timeline registered directly from MongoDB event logs.
              </p>
            </div>
          </div>

          <span className="font-mono text-xs text-slate-400">
            {history.length} {history.length === 1 ? 'event' : 'events'}
          </span>
        </div>

        {/* Timeline Items */}
        <div className="mt-6 relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
          {history.length > 0 ? (
            history.map((event, idx) => {
              const actionConf = ACTION_CONFIG[event.action] || {
                label: event.action,
                icon: FileText,
                color: 'text-slate-400 bg-slate-800 border-slate-700',
              };
              const IconComp = actionConf.icon;
              const formattedTime = formatTimestamp(event.timestamp);

              return (
                <div key={event._id || idx} className="relative group">
                  {/* Timeline Dot Icon */}
                  <span
                    className={`absolute -left-6 top-1 flex h-5 w-5 items-center justify-center rounded-full border ${actionConf.color}`}
                  >
                    <IconComp className="h-2.5 w-2.5" />
                  </span>

                  {/* Event Card */}
                  <div className="rounded-xl border border-slate-800 bg-[#0B0F19] p-4 transition-colors hover:border-slate-700">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-100">
                          {actionConf.label}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500">
                          {event.action}
                        </span>
                      </div>

                      <span className="font-mono text-xs text-slate-400">
                        {formattedTime}
                      </span>
                    </div>

                    {/* Metadata Badges & Aggregate Details */}
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800/60 pt-2.5">
                        {Object.entries(event.metadata).map(([key, val]) => {
                          if (val === undefined || val === null) return null;
                          return (
                            <span
                              key={key}
                              className="inline-flex items-center gap-1 rounded bg-[#111726] border border-slate-800 px-2 py-0.5 font-mono text-[11px] text-slate-300"
                            >
                              <span className="text-slate-500">{key}:</span>
                              <strong className="text-sky-300">{String(val)}</strong>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              No audit records found for this document.
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-slate-800/80 pt-4">
          <button
            type="button"
            onClick={() => navigate(`/scan/review/${documentId}`)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Open PII Review</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/scan')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-xs font-bold text-slate-950 transition-colors hover:bg-sky-400 cursor-pointer"
          >
            <span>Scan New Document</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
