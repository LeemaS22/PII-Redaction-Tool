import React from 'react';
import { ShieldAlert, ShieldCheck, CheckCircle2, Info } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PrivacyScore({ stats, piiData = [] }) {
  const totalPII = stats?.totalPII ?? 0;
  const totalRedacted = stats?.totalRedacted ?? 0;
  const totalKept = stats?.totalKept ?? 0;
  const totalDocuments = stats?.totalDocuments ?? 0;

  // Real percentage calculation from MongoDB
  const percentage =
    totalPII > 0 ? Math.min(100, Math.round((totalRedacted / totalPII) * 100)) : totalDocuments > 0 ? 100 : 0;

  const statusLabel =
    totalPII === 0
      ? totalDocuments > 0
        ? 'Zero Exposure'
        : 'Awaiting Documents'
      : percentage >= 80
      ? 'Strong Protection'
      : percentage >= 40
      ? 'Moderate Protection'
      : 'Exposure Detected';

  const statusColor =
    percentage >= 80
      ? 'text-emerald-400'
      : percentage >= 40
      ? 'text-amber-400'
      : 'text-rose-400';

  // Take top categories from real MongoDB detection breakdown
  const topCategories = piiData.slice(0, 4);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.12 }}
      aria-labelledby="privacy-exposure-heading"
      className="flex flex-col justify-between rounded-xl border border-slate-800/90 bg-[#111726] p-6 h-full"
    >
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="privacy-exposure-heading"
              className="text-base font-semibold text-slate-100"
            >
              Privacy Protection Index
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Live metrics aggregated from MongoDB document repository
            </p>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-500/25 bg-sky-500/10 text-sky-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-baseline justify-between gap-4 border-y border-slate-800/80 py-5">
          <div>
            <div className="flex items-baseline gap-1.5 font-mono tabular-nums">
              <span className="text-4xl font-bold tracking-tight text-slate-100">
                {totalPII > 0 ? percentage : totalDocuments > 0 ? '100' : '—'}
              </span>
              <span className="text-lg font-medium text-slate-400">
                {totalPII > 0 || totalDocuments > 0 ? '/ 100' : ''}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <CheckCircle2 className={`h-4 w-4 ${statusColor}`} />
              <span className={`font-semibold tracking-wide ${statusColor}`}>
                {statusLabel}
              </span>
              <span className="text-slate-600" aria-hidden="true">
                ·
              </span>
              <span className="font-mono text-slate-400 tabular-nums">
                {totalRedacted} redacted of {totalPII} total
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-400">Redaction Coverage</div>
            <div className="mt-1 font-mono text-sm font-semibold text-sky-400 tabular-nums">
              {totalPII > 0 ? `${percentage}% Sanitized` : totalDocuments > 0 ? 'No Exposure' : 'No Data'}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-slate-300">Sanitization Progress</span>
            <span className="font-mono text-slate-300 tabular-nums">
              {totalRedacted} / {totalPII} PII
            </span>
          </div>
          <div
            className="h-3 w-full overflow-hidden rounded-full bg-slate-800/90 p-0.5"
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Current Privacy Sanitization Percentage"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 via-teal-400 to-emerald-400 transition-all duration-300"
              style={{ width: `${Math.max(percentage, totalDocuments > 0 && totalPII === 0 ? 100 : 0)}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between font-mono text-[11px] text-slate-500 tabular-nums">
            <span>0% (Critical Risk)</span>
            <span>50% (Moderate)</span>
            <span>100% (Sanitized)</span>
          </div>
        </div>

        {/* Real Sensitivity Category Distribution */}
        <div className="mt-6 space-y-3">
          <div className="text-xs font-medium text-slate-300">
            Detected PII Category Distribution
          </div>
          {topCategories.length > 0 ? (
            topCategories.map((item, idx) => {
              const itemShare = totalPII > 0 ? Math.round((item.detected / totalPII) * 100) : 0;
              const colorClasses = [
                'bg-sky-400',
                'bg-blue-400',
                'bg-amber-400',
                'bg-rose-400',
              ];
              const colorClass = colorClasses[idx % colorClasses.length];

              return (
                <div key={item.type || idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{item.category}</span>
                    <span className="font-mono text-slate-200 tabular-nums">
                      {item.detected}{' '}
                      <span className="text-slate-500">({itemShare}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full ${colorClass}`}
                      style={{ width: `${itemShare}%` }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-lg border border-slate-800/60 bg-[#090D16] p-3 text-center text-xs text-slate-500">
              No PII entities detected in stored documents.
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-start gap-2 border-t border-slate-800/80 pt-4 text-xs text-slate-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400" />
        <p>
          {totalDocuments === 0
            ? 'Upload documents to start analyzing privacy exposure.'
            : `${totalDocuments} documents tracked in MongoDB with ${totalRedacted} redacted entities.`}
        </p>
      </div>
    </motion.section>
  );
}
