import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  RefreshCw,
  Clock,
  Eye,
  Download,
  Filter,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight,
  Plus,
  Loader2,
  FileCode,
  FileSpreadsheet,
  FileImage,
} from 'lucide-react';
import { motion } from 'framer-motion';

function getFileIcon(type) {
  const ext = (type || '').toLowerCase();
  switch (ext) {
    case 'png':
    case 'jpg':
    case 'jpeg':
      return FileImage;
    case 'txt':
      return FileCode;
    case 'docx':
      return FileSpreadsheet;
    case 'pdf':
    default:
      return FileText;
  }
}

const STATUS_BADGES = {
  UPLOADED: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  SCANNING: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  SCANNED: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  REVIEWED: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  REDACTED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  FAILED: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
};

const STATUS_FILTERS = [
  'ALL',
  'REVIEWED',
  'REDACTED',
  'FAILED',
];

const DATE_FILTERS = [
  { label: 'All Time', value: 'ALL' },
  { label: 'Last 7 Days', value: '7D' },
  { label: 'Last 30 Days', value: '30D' },
];

import { API_BASE, apiFetch } from '../services/apiConfig';

function formatDate(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function DocumentsPage() {
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [activeDateFilter, setActiveDateFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      let url = `${API_BASE}/api/documents`;
      const params = new URLSearchParams();
      if (activeFilter !== 'ALL') params.append('status', activeFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await apiFetch(url);
      const result = await res.json();

      if (res.ok && result.success && Array.isArray(result.data)) {
        let docs = result.data;

        // Apply date filter
        if (activeDateFilter !== 'ALL') {
          const now = new Date();
          const days = activeDateFilter === '7D' ? 7 : 30;
          const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
          docs = docs.filter(doc => new Date(doc.createdAt) >= cutoff);
        }

        setDocuments(docs);
      } else {
        setDocuments([]);
      }
    } catch (err) {
      console.error('Fetch documents error:', err);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [activeFilter, activeDateFilter]);

  const filteredDocs = documents.filter((doc) => {
    const name = (doc.fileName || doc.filename || '').toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    return !q || name.includes(q);
  });

  const handleDownload = (e, docId, protectedFileName) => {
    e.stopPropagation();
    const downloadEndpoint = `${API_BASE}/api/documents/${docId}/download`;
    const link = document.createElement('a');
    link.href = downloadEndpoint;
    link.setAttribute('download', protectedFileName || 'protected_document.pdf');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-100">
            Document Repository & Audit Trail
          </h2>
          <p className="text-xs text-slate-400">
            Inspect document processing lifecycle, review decisions, audit logs, and sanitized copies.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchDocuments}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-700 hover:text-white cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/scan')}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-sm transition-colors hover:bg-sky-400 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Scan Document</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-800/90 bg-[#111726] p-4">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5" role="tablist">
          {STATUS_FILTERS.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveFilter(filter)}
                className={`rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-sky-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                {filter}
              </button>
            );
          })}
        </div>
        
        <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Date:</span>
            <select value={activeDateFilter} onChange={(e) => setActiveDateFilter(e.target.value)} className="rounded-lg border border-slate-800 bg-[#090D16] py-1.5 px-3 text-xs text-slate-100 focus:border-sky-500 focus:outline-none cursor-pointer">
                {DATE_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-[#090D16] py-1.5 pl-8 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Documents Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#111726] shadow-sm">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-sky-400" />
              <p className="text-xs text-slate-400">Loading documents from MongoDB...</p>
            </div>
          </div>
        ) : filteredDocs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800/80 bg-[#0B0F19] font-mono uppercase text-[11px] text-slate-400">
                <tr>
                  <th scope="col" className="py-3.5 pl-6 pr-4">Document</th>
                  <th scope="col" className="px-4 py-3.5">Status</th>
                  <th scope="col" className="px-4 py-3.5">PII Detected</th>
                  <th scope="col" className="px-4 py-3.5">Redacted</th>
                  <th scope="col" className="px-4 py-3.5">Created At</th>
                  <th scope="col" className="py-3.5 pl-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredDocs.map((doc) => {
                  const IconComp = getFileIcon(doc.fileType);
                  const statusBadgeClass = STATUS_BADGES[doc.status] || STATUS_BADGES.UPLOADED;

                  return (
                    <tr
                      key={doc.id || doc.documentId}
                      className="transition-colors hover:bg-slate-800/30 cursor-pointer"
                      onClick={() => navigate(`/documents/${doc.id || doc.documentId}/history`)}
                    >
                      {/* Document Name & Type */}
                      <td className="py-4 pl-6 pr-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10 text-sky-400">
                            <IconComp className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-slate-100 hover:text-sky-300" title={doc.fileName || doc.filename}>
                              {doc.fileName || doc.filename}
                            </div>
                            <div className="font-mono text-[11px] text-slate-500">
                              {doc.fileType} • {doc.fileSize}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold ${statusBadgeClass}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          <span>{doc.status}</span>
                        </span>
                      </td>

                      {/* PII Count */}
                      <td className="px-4 py-4 font-mono">
                        <span className={doc.piiCount > 0 ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                          {doc.piiCount}
                        </span>
                      </td>

                      {/* Redacted Count */}
                      <td className="px-4 py-4 font-mono">
                        <span className={doc.redactedCount > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'}>
                          {doc.redactedCount}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="px-4 py-4 font-mono text-slate-400">
                        {formatDate(doc.createdAt)}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-4 pl-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            title="View Audit Trail"
                            onClick={() => navigate(`/documents/${doc.id || doc.documentId}/history`)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:bg-slate-700 hover:text-white cursor-pointer"
                          >
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>History</span>
                          </button>

                          <button
                            type="button"
                            title="Review PII"
                            onClick={() => navigate(`/scan/review/${doc.id || doc.documentId}`)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:bg-slate-700 hover:text-white cursor-pointer"
                          >
                            <Eye className="h-3 w-3 text-sky-400" />
                            <span>Review</span>
                          </button>

                          {doc.status === 'REDACTED' && doc.protectedFileName && (
                            <button
                              type="button"
                              title="Download Protected Document"
                              onClick={(e) => handleDownload(e, doc.id || doc.documentId, doc.protectedFileName)}
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-slate-950 transition-colors hover:bg-emerald-400 cursor-pointer"
                            >
                              <Download className="h-3 w-3" />
                              <span>Download</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-slate-800 bg-[#0B0F19] text-slate-400">
              <FileText className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-100">
              No Documents Found
            </h4>
            <p className="mx-auto max-w-sm text-xs text-slate-400">
              {activeFilter !== 'ALL'
                ? `No documents currently match the '${activeFilter}' status filter.`
                : 'Upload and scan documents to build your privacy audit trail and history.'}
            </p>
            <button
              type="button"
              onClick={() => navigate('/scan')}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-400 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Scan Your First Document</span>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
