import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ScanLine,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Loader2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import PrivacyScore from '../components/PrivacyScore';
import PiiChart from '../components/PiiChart';
import {
  fetchDashboardStats,
  fetchPiiBreakdown,
  fetchDocumentStatusBreakdown,
  fetchRecentDocuments,
} from '../services/dashboardApi';

export default function Dashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [stats, setStats] = useState({
    totalDocuments: 0,
    scannedDocuments: 0,
    reviewedDocuments: 0,
    redactedDocuments: 0,
    failedDocuments: 0,
    totalPII: 0,
    totalRedacted: 0,
    totalKept: 0,
    sanitizationRate: 0,
  });

  const [piiData, setPiiData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [recentDocs, setRecentDocs] = useState([]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, piiRes, statusRes, docsRes] = await Promise.all([
        fetchDashboardStats().catch((err) => {
          console.warn('Stats fetch error:', err);
          return null;
        }),
        fetchPiiBreakdown().catch((err) => {
          console.warn('PII breakdown error:', err);
          return [];
        }),
        fetchDocumentStatusBreakdown().catch((err) => {
          console.warn('Status breakdown error:', err);
          return [];
        }),
        fetchRecentDocuments(5).catch((err) => {
          console.warn('Recent docs error:', err);
          return [];
        }),
      ]);

      if (statsRes) setStats(statsRes);
      if (Array.isArray(piiRes)) setPiiData(piiRes);
      if (Array.isArray(statusRes)) setStatusData(statusRes);
      if (Array.isArray(docsRes)) setRecentDocs(docsRes);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Unable to load live dashboard statistics. Please verify backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
          <p className="text-xs text-slate-400">Loading live analytics from MongoDB...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-center space-y-3">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-400" />
        <h3 className="text-sm font-semibold text-rose-200">Dashboard Loading Error</h3>
        <p className="text-xs text-rose-300">{error}</p>
        <button
          type="button"
          onClick={loadDashboardData}
          className="inline-flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-rose-400 cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Retry Loading</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* Welcome & Executive Overview Section */}
      <section
        aria-label="Dashboard overview and quick actions"
        className="flex flex-col justify-between gap-5 rounded-xl border border-slate-800/90 bg-gradient-to-r from-[#111726] via-[#111726] to-[#0D1628] p-6 lg:flex-row lg:items-center"
      >
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4 text-sky-400" />
            <span>Executive Privacy Posture</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400 font-semibold">Live MongoDB Data</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-100">
            Data Privacy & Redaction Overview
          </h2>
          <p className="max-w-2xl text-sm text-slate-400">
            Aggregated statistics for document ingestion, PII classification, verified human review, and irreversible redaction coverage.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={loadDashboardData}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-xs font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-700 hover:text-white cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
            <span>Refresh Metrics</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/scan')}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition-colors hover:bg-sky-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 whitespace-nowrap cursor-pointer"
          >
            <ScanLine className="h-4 w-4" />
            <span>Scan New Document</span>
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* Four Core Real Statistics Cards */}
      <section aria-label="Key privacy statistics">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            index={0}
            title="Total Documents"
            value={stats.totalDocuments}
            sublabel={`${stats.scannedDocuments} scanned · ${stats.reviewedDocuments} reviewed`}
            trend={`${stats.totalDocuments} files`}
            trendDirection="up"
            trendContext="in repository"
            iconName="FileText"
            accentColor="sky"
          />

          <StatCard
            index={1}
            title="PII Detected"
            value={stats.totalPII}
            sublabel={`${piiData.length} distinct entity categories`}
            trend={`${stats.totalPII} entities`}
            trendDirection="up"
            trendContext="across documents"
            iconName="ScanSearch"
            accentColor="amber"
          />

          <StatCard
            index={2}
            title="PII Redacted"
            value={stats.totalRedacted}
            sublabel={`${stats.totalKept} entities kept by human review`}
            trend={stats.totalPII > 0 ? `${stats.sanitizationRate}% rate` : '0%'}
            trendDirection="up"
            trendContext="sanitized coverage"
            iconName="Eraser"
            accentColor="indigo"
          />

          <StatCard
            index={3}
            title="Protected Documents"
            value={stats.redactedDocuments}
            sublabel={stats.failedDocuments > 0 ? `${stats.failedDocuments} failed` : 'Zero processing errors'}
            trend={`${stats.redactedDocuments} ready`}
            trendDirection="up"
            trendContext="downloadable copies"
            iconName="ShieldCheck"
            accentColor="emerald"
          />
        </div>
      </section>

      {/* Privacy Exposure Card & PII Distribution Chart */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <PrivacyScore stats={stats} piiData={piiData} />
        </div>
        <div className="lg:col-span-7">
          <PiiChart data={piiData} />
        </div>
      </div>
    </div>
  );
}
