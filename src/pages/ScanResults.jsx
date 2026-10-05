import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  FileText,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  FileCode,
  FileSpreadsheet,
  FileImage,
  Eye,
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

const TYPE_LABELS = {
  PERSON_NAME: 'Person Name',
  ADDRESS: 'Address',
  EMAIL: 'Email Address',
  PHONE: 'Phone Number',
  AADHAAR: 'Aadhaar Number',
  CREDIT_CARD: 'Credit / Debit Card',
  BANK_ACCOUNT: 'Bank Account Number',
  IP_ADDRESS: 'IP Address',
  DATE_OF_BIRTH: 'Date of Birth',
  PASSPORT: 'Passport Number',
};

const TYPE_COLORS = {
  PERSON_NAME: { badge: 'bg-violet-500/10 border-violet-500/30 text-violet-400', dot: 'bg-violet-400' },
  ADDRESS: { badge: 'bg-teal-500/10 border-teal-500/30 text-teal-400', dot: 'bg-teal-400' },
  EMAIL: { badge: 'bg-sky-500/10 border-sky-500/30 text-sky-400', dot: 'bg-sky-400' },
  PHONE: { badge: 'bg-blue-500/10 border-blue-500/30 text-blue-400', dot: 'bg-blue-400' },
  AADHAAR: { badge: 'bg-amber-500/10 border-amber-500/30 text-amber-400', dot: 'bg-amber-400' },
  CREDIT_CARD: { badge: 'bg-rose-500/10 border-rose-500/30 text-rose-400', dot: 'bg-rose-400' },
  BANK_ACCOUNT: { badge: 'bg-purple-500/10 border-purple-500/30 text-purple-400', dot: 'bg-purple-400' },
  IP_ADDRESS: { badge: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400', dot: 'bg-emerald-400' },
  DATE_OF_BIRTH: { badge: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400', dot: 'bg-cyan-400' },
  PASSPORT: { badge: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400', dot: 'bg-indigo-400' },
};

function formatDisplayValue(type, value) {
  if (!value) return '';
  const clean = String(value).trim();

  if (type === 'AADHAAR') {
    const digits = clean.replace(/\D/g, '');
    if (digits.length >= 4) {
      return `**** **** ${digits.slice(-4)}`;
    }
    return clean;
  }

  if (type === 'CREDIT_CARD') {
    const digits = clean.replace(/\D/g, '');
    if (digits.length >= 4) {
      return `************${digits.slice(-4)}`;
    }
    return clean;
  }

  if (type === 'BANK_ACCOUNT') {
    const digits = clean.replace(/\D/g, '');
    if (digits.length >= 4) {
      return `********${digits.slice(-4)}`;
    }
    return clean;
  }

  return clean;
}

export default function ScanResults() {
  const location = useLocation();
  const navigate = useNavigate();

  // Retrieve scan result from navigation state
  const scanData = location.state || null;

  const documentId = scanData?.documentId || '';
  const filename = scanData?.filename || 'document.pdf';
  const fileType = scanData?.fileType || 'PDF';
  const fileSize = scanData?.fileSize || '0 B';
  const status = scanData?.status || 'SCANNED';
  const piiCount = typeof scanData?.piiCount === 'number' ? scanData.piiCount : (scanData?.detections?.length ?? 0);
  const detections = Array.isArray(scanData?.detections) ? scanData.detections : [];
  const redactionStrategy = scanData?.redactionMode || 'standard';

  const IconComponent = getFileIcon(fileType);

  const handleStartReview = () => {
    if (documentId) {
      navigate(`/scan/review/${documentId}`, {
        state: {
          documentId,
          filename,
          fileType,
          fileSize,
          status,
          detections,
          redactionMode: redactionStrategy,
        },
      });
    } else {
      navigate('/scan/review', {
        state: {
          filename,
          fileType,
          fileSize,
          status,
          detections,
          redactionMode: redactionStrategy,
        },
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mx-auto max-w-4xl space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>Document Scan Pipeline</span>
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-100">
            Scan Complete
          </h2>
          <p className="text-xs text-slate-400">
            Deterministic PII entity extraction and classification completed.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/scan')}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-700 hover:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
          <span>Scan Another Document</span>
        </button>
      </div>

      {/* Document Overview Card */}
      <div className="rounded-xl border border-slate-800/90 bg-[#111726] p-6 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Document Details
        </h3>

        <div className="mt-4 flex flex-col gap-4 rounded-xl border border-slate-800/80 bg-[#0B0F19] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-400">
              <IconComponent className="h-6 w-6" />
            </div>

            <div className="min-w-0">
              <div className="text-xs text-slate-400">Document</div>
              <div
                className="truncate font-mono text-sm font-semibold text-slate-100"
                title={filename}
              >
                {filename}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 border-t border-slate-800/80 pt-3 sm:border-t-0 sm:pt-0">
            <div>
              <div className="text-xs text-slate-400">File Type</div>
              <div className="font-mono text-xs font-semibold text-sky-300">
                {fileType}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400">File Size</div>
              <div className="font-mono text-xs font-semibold text-slate-200 tabular-nums">
                {fileSize}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400">Status</div>
              <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>{status}</span>
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400">PII Detected</div>
              <div className="font-mono text-xs font-semibold text-slate-100 tabular-nums">
                <span
                  className={
                    piiCount > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'
                  }
                >
                  {piiCount}
                </span>{' '}
                {piiCount === 1 ? 'instance' : 'instances'}
              </div>
            </div>
          </div>
        </div>

        {/* Selected Redaction Strategy Overview */}
        <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-800/80 bg-[#090D16]/60 px-4 py-2.5 text-xs">
          <span className="text-slate-400">Configured Redaction Strategy:</span>
          <span className="font-mono font-semibold uppercase text-sky-300">
            {redactionStrategy}
          </span>
        </div>
      </div>

      {/* Real PII Detections Card */}
      <div className="rounded-xl border border-slate-800/90 bg-[#111726] p-6">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-500/25 bg-sky-500/10 text-sky-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-wide text-slate-100 uppercase">
                PII Detected
              </h3>
              <p className="text-xs text-slate-400">
                {piiCount > 0
                  ? `${piiCount} sensitive ${piiCount === 1 ? 'identifier' : 'identifiers'} isolated by backend regex engine`
                  : 'Zero sensitive identifiers detected in this document'}
              </p>
            </div>
          </div>

          <div className="font-mono text-xs font-semibold text-slate-300 tabular-nums">
            Total: {piiCount}
          </div>
        </div>

        {/* Detections List */}
        {detections.length > 0 ? (
          <div className="mt-4 divide-y divide-slate-800/60">
            {detections.map((detection, idx) => {
              const typeColor = TYPE_COLORS[detection.type] || {
                badge: 'bg-slate-800 border-slate-700 text-slate-300',
                dot: 'bg-slate-400',
              };
              const typeLabel = TYPE_LABELS[detection.type] || detection.type;
              const confidencePercent = Math.round((detection.confidence ?? 0.95) * 100);
              const displayVal = formatDisplayValue(detection.type, detection.value);

              return (
                <div
                  key={detection.id || idx}
                  className="flex flex-col justify-between gap-3 py-3.5 transition-colors first:pt-1 last:pb-1 sm:flex-row sm:items-center"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${typeColor.dot}`}
                      aria-hidden="true"
                    />

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold ${typeColor.badge}`}
                        >
                          {typeLabel}
                        </span>
                        <span className="font-mono text-xs text-slate-500">
                          [{detection.startIndex}..{detection.endIndex}]
                        </span>
                      </div>

                      <div className="font-mono text-sm font-medium text-slate-100 break-all">
                        {displayVal}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pl-5 sm:pl-0 sm:text-right shrink-0">
                    <div className="text-xs">
                      <span className="text-slate-500">Confidence: </span>
                      <span className="font-mono font-semibold text-emerald-400 tabular-nums">
                        {confidencePercent}%
                      </span>
                    </div>

                    <span className="rounded border border-slate-800 bg-[#090D16] px-2 py-0.5 font-mono text-[10px] text-slate-400">
                      {detection.source || 'REGEX'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h4 className="mt-3 text-sm font-semibold text-slate-100">
              No Sensitive Information Detected
            </h4>
            <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400">
              This document was scanned against active detection rules and contained zero matching PII instances.
            </p>
          </div>
        )}

        {/* Action Button: Review PII */}
        {detections.length > 0 && (
          <div className="mt-6 flex flex-col gap-3 border-t border-slate-800/80 pt-5 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={handleStartReview}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-500 px-5 py-2.5 text-xs font-semibold text-slate-950 shadow-md shadow-sky-500/10 transition-colors hover:bg-sky-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 cursor-pointer"
            >
              <Eye className="h-4 w-4" />
              <span>Review PII Decisions</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
