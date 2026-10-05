import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  ScanLine,
  AlertTriangle,
  ShieldCheck,
  ArrowUpRight,
  Clock,
  FileDown,
  Eye,
} from 'lucide-react';
import { motion } from 'framer-motion';

const CATEGORY_CONFIG = {
  upload: {
    icon: UploadCloud,
    iconStyle: 'border-sky-500/25 bg-sky-500/10 text-sky-400',
  },
  scan: {
    icon: ScanLine,
    iconStyle: 'border-indigo-500/25 bg-indigo-500/10 text-indigo-400',
  },
  detection: {
    icon: AlertTriangle,
    iconStyle: 'border-amber-500/25 bg-amber-500/10 text-amber-400',
  },
  protection: {
    icon: ShieldCheck,
    iconStyle: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400',
  },
};

export default function RecentActivity({ activities = [] }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');

  const filteredActivities =
    filter === 'all'
      ? activities
      : activities.filter((item) => item.category === filter);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.2 }}
      aria-labelledby="recent-activity-heading"
      className="rounded-xl border border-slate-800/90 bg-[#111726] p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <h2
            id="recent-activity-heading"
            className="text-base font-semibold text-slate-100"
          >
            Audit Trail Feed
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Real-time event stream from MongoDB AuditLog collection
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-1 rounded-lg border border-slate-800 bg-[#0B0F19] p-1"
            role="group"
            aria-label="Filter recent activity"
          >
            {[
              { id: 'all', label: 'All Events' },
              { id: 'upload', label: 'Uploads' },
              { id: 'scan', label: 'Scans' },
              { id: 'detection', label: 'Reviews' },
              { id: 'protection', label: 'Protected' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  filter === tab.id
                    ? 'bg-slate-800 text-slate-100 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => navigate('/documents')}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-[#0B0F19] px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-700 hover:text-white whitespace-nowrap cursor-pointer"
          >
            <span>Document Repository</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-4 divide-y divide-slate-800/70">
        {filteredActivities.length > 0 ? (
          filteredActivities.map((item) => {
            const config =
              CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.upload;
            const IconComponent = config.icon;

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (item.documentId) {
                    navigate(`/documents/${item.documentId}/history`);
                  }
                }}
                className="flex flex-col justify-between gap-3 py-3.5 transition-colors first:pt-1 last:pb-1 sm:flex-row sm:items-center hover:bg-slate-800/20 px-2 rounded-lg cursor-pointer"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${config.iconStyle}`}
                  >
                    <IconComponent className="h-4 w-4" />
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-100">
                      {item.action}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="font-mono text-sky-300 truncate max-w-[220px]" title={item.documentName}>
                        {item.documentName}
                      </span>
                      {item.detail && (
                        <>
                          <span className="text-slate-600" aria-hidden="true">
                            ·
                          </span>
                          <span>{item.detail}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pl-12 font-mono text-xs text-slate-400 tabular-nums sm:pl-0 sm:text-right whitespace-nowrap">
                  {item.timestamp}
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-10 text-center space-y-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-[#0B0F19] text-slate-500">
              <Clock className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-semibold text-slate-300">
              No Recent Activity Logged
            </h4>
            <p className="mx-auto max-w-xs text-[11px] text-slate-500">
              Process documents to generate live audit trail records.
            </p>
          </div>
        )}
      </div>
    </motion.section>
  );
}
