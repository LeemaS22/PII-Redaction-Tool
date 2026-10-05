import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  FileText,
  Loader2,
  Check,
  X,
  Sparkles,
  Info,
  ChevronLeft,
  Download,
  Lock,
  FileDown,
  Eye,
  FileCode,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

import { API_BASE, apiFetch } from '../services/apiConfig';

export default function PiiReviewPage() {
  const { documentId: paramDocId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const navState = location.state || {};
  const activeDocumentId = paramDocId || navState.documentId || '';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [redacting, setRedacting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [protectedData, setProtectedData] = useState(null);
  const [workflowState, setWorkflowState] = useState('READY'); // 'READY' | 'PROCESSING' | 'SUCCESS' | 'VERIFICATION_FAILED' | 'GENERATION_FAILED'
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewViewMode, setPreviewViewMode] = useState('protected-visual'); // 'protected-visual' | 'original-visual' | 'formatted'

  const [documentMetadata, setDocumentMetadata] = useState({
    filename: navState.filename || 'document.pdf',
    fileType: navState.fileType || 'PDF',
    fileSize: navState.fileSize || '0 B',
    status: navState.status || 'SCANNED',
    reviewStatus: 'PENDING',
    redactionStatus: 'NOT_STARTED',
    redactionStrategy: navState.redactionMode || 'STANDARD',
  });

  const [detections, setDetections] = useState([]);

  // Fetch or initialize detections
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!activeDocumentId) {
        if (navState.detections && Array.isArray(navState.detections)) {
          const initial = navState.detections.map((d) => ({
            ...d,
            decision: d.decision || 'PENDING',
          }));
          setDetections(initial);
        }
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await apiFetch(`${API_BASE}/api/documents/${activeDocumentId}`);
        const result = await res.json();

        if (!isMounted) return;

        if (res.ok && result.success && result.data) {
          const data = result.data;
          setDocumentMetadata({
            filename: data.filename || navState.filename || 'document.pdf',
            fileType: data.fileType || navState.fileType || 'PDF',
            fileSize: data.fileSize || navState.fileSize || '0 B',
            status: data.status || 'SCANNED',
            reviewStatus: data.reviewStatus || 'PENDING',
            redactionStatus: data.redactionStatus || 'NOT_STARTED',
            redactionStrategy: data.redactionStrategy || navState.redactionMode || 'STANDARD',
          });

          if (data.reviewStatus === 'COMPLETED') {
            setIsCompleted(true);
          }

          if (data.redactionStatus === 'COMPLETED' && data.protectedFileName) {
            setProtectedData({
              documentId: activeDocumentId,
              originalFileName: data.filename,
              protectedFileName: data.protectedFileName,
              redactedCount: data.redactedCount,
              redactionStrategy: data.redactionStrategy || 'STANDARD',
              downloadUrl: `/api/documents/${activeDocumentId}/download`,
            });
            setWorkflowState('SUCCESS');
          } else if (data.redactionStatus === 'FAILED') {
            setWorkflowState('VERIFICATION_FAILED');
            setErrorMessage('Redaction verification failed: original sensitive value is still present in the protected document text layer.');
          }

          if (Array.isArray(data.detections)) {
            const mapped = data.detections.map((d) => ({
              id: d.id || d._id,
              type: d.type,
              value: d.value,
              confidence: d.confidence,
              startIndex: d.startIndex,
              endIndex: d.endIndex,
              source: d.source,
              decision: d.decision || 'PENDING',
            }));
            setDetections(mapped);
          }
        } else {
          if (navState.detections && Array.isArray(navState.detections)) {
            const initial = navState.detections.map((d) => ({
              ...d,
              decision: d.decision || 'PENDING',
            }));
            setDetections(initial);
          }
        }
      } catch (err) {
        console.error('Error fetching review detections:', err);
        if (navState.detections && Array.isArray(navState.detections)) {
          const initial = navState.detections.map((d) => ({
            ...d,
            decision: d.decision || 'PENDING',
          }));
          setDetections(initial);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [activeDocumentId]);

  // Dynamic review counters
  const totalDetections = detections.length;
  const redactCount = detections.filter((d) => d.decision === 'REDACT').length;
  const keepCount = detections.filter((d) => d.decision === 'KEEP').length;
  const pendingCount = detections.filter((d) => d.decision === 'PENDING').length;
  const isAllReviewed = pendingCount === 0 && totalDetections > 0;

  // Single decision update with real-time backend synchronization
  const handleSetDecision = async (detectionId, decision) => {
    setDetections((prev) =>
      prev.map((d) => (d.id === detectionId ? { ...d, decision } : d))
    );
    setErrorMessage(null);
    if (workflowState === 'VERIFICATION_FAILED' || workflowState === 'GENERATION_FAILED') {
      setWorkflowState('READY');
    }

    if (activeDocumentId) {
      try {
        await apiFetch(
          `${API_BASE}/api/documents/${activeDocumentId}/detections/${detectionId}/decision`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ decision }),
          }
        );
      } catch (err) {
        console.warn('Real-time decision sync warning:', err);
      }
    }
  };

  // Batch actions: Redact All
  const handleRedactAll = async () => {
    setDetections((prev) => prev.map((d) => ({ ...d, decision: 'REDACT' })));
    setErrorMessage(null);
    if (workflowState === 'VERIFICATION_FAILED' || workflowState === 'GENERATION_FAILED') {
      setWorkflowState('READY');
    }

    if (activeDocumentId) {
      try {
        const decisions = detections.map((d) => ({
          detectionId: d.id,
          decision: 'REDACT',
        }));
        await apiFetch(`${API_BASE}/api/documents/${activeDocumentId}/detections/review`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ decisions }),
        });
      } catch (err) {
        console.warn('Batch redact sync warning:', err);
      }
    }
  };

  // Batch actions: Keep All
  const handleKeepAll = async () => {
    setDetections((prev) => prev.map((d) => ({ ...d, decision: 'KEEP' })));
    setErrorMessage(null);
    if (workflowState === 'VERIFICATION_FAILED' || workflowState === 'GENERATION_FAILED') {
      setWorkflowState('READY');
    }

    if (activeDocumentId) {
      try {
        const decisions = detections.map((d) => ({
          detectionId: d.id,
          decision: 'KEEP',
        }));
        await apiFetch(`${API_BASE}/api/documents/${activeDocumentId}/detections/review`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ decisions }),
        });
      } catch (err) {
        console.warn('Batch keep sync warning:', err);
      }
    }
  };

  // Confirm review and save decisions to MongoDB
  const handleConfirmReview = async () => {
    if (!isAllReviewed) {
      setErrorMessage('Please review all detected items before confirming.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      if (activeDocumentId) {
        const payload = {
          decisions: detections.map((d) => ({
            detectionId: d.id,
            decision: d.decision,
          })),
        };

        const res = await apiFetch(
          `${API_BASE}/api/documents/${activeDocumentId}/detections/review`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );

        const result = await res.json();
        if (!res.ok || !result.success) {
          throw new Error(result.error?.message || result.error || 'Failed to save review decisions.');
        }
      }

      setIsCompleted(true);
    } catch (err) {
      console.error('Confirm review error:', err);
      setErrorMessage(err.message || 'Error occurred while saving review decisions.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleModifyDecisions = () => {
    setWorkflowState('READY');
    setErrorMessage(null);
    setIsCompleted(false);
  };

  // Phase 6: Execute document redaction pipeline with strict state machine
  const handleGenerateProtectedDocument = async () => {
    if (!activeDocumentId || redacting) {
      if (!activeDocumentId) setErrorMessage('Document ID missing. Please scan a document first.');
      return;
    }

    setWorkflowState('PROCESSING');
    setRedacting(true);
    setErrorMessage(null);

    try {
      const res = await apiFetch(`${API_BASE}/api/documents/${activeDocumentId}/redact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy: documentMetadata.redactionStrategy || 'STANDARD',
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        const errMsg = result.error?.message || result.message || 'Failed to generate protected document.';
        const errCode = result.error?.code;
        const isVerificationFail =
          errCode === 'VERIFICATION_FAILED' ||
          /verification/i.test(errMsg) ||
          /sensitive value.*still present/i.test(errMsg);

        setWorkflowState(isVerificationFail ? 'VERIFICATION_FAILED' : 'GENERATION_FAILED');
        setErrorMessage(errMsg);
        setProtectedData(null);
        return;
      }

      setProtectedData(result.data);
      setWorkflowState('SUCCESS');
      setErrorMessage(null);
    } catch (err) {
      console.error('Redaction pipeline error:', err);
      const errMsg = err.message || 'An error occurred during document redaction.';
      const isVerificationFail =
        /verification/i.test(errMsg) ||
        /sensitive value.*still present/i.test(errMsg);

      setWorkflowState(isVerificationFail ? 'VERIFICATION_FAILED' : 'GENERATION_FAILED');
      setErrorMessage(errMsg);
      setProtectedData(null);
    } finally {
      setRedacting(false);
    }
  };

  const [downloading, setDownloading] = useState(false);

  // Phase 6: Trigger protected document download
  const handleDownloadProtected = async () => {
    if (!activeDocumentId || downloading) return;
    setDownloading(true);
    try {
      const downloadEndpoint = `${API_BASE}/api/documents/${activeDocumentId}/download`;
      const res = await apiFetch(downloadEndpoint);
      if (!res.ok) {
        throw new Error('Protected document is not ready or failed to download.');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', protectedData?.protectedFileName || 'protected_document.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      alert(err.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  // Preview Protected Document modal handler
  const handleOpenPreview = async () => {
    if (!activeDocumentId) return;
    setIsPreviewOpen(true);
    setPreviewLoading(true);

    const isPdf =
      documentMetadata.fileType === 'PDF' ||
      protectedData?.protectedFileName?.toLowerCase().endsWith('.pdf') ||
      documentMetadata.filename?.toLowerCase().endsWith('.pdf');

    // Default to visual PDF view for PDFs so it looks exactly like the uploaded document
    setPreviewViewMode(isPdf ? 'visual' : 'formatted');

    try {
      const res = await apiFetch(`${API_BASE}/api/documents/${activeDocumentId}/preview`);
      const result = await res.json();
      if (res.ok && result.success && result.data) {
        setPreviewData(result.data);
      }
    } catch (err) {
      console.error('Error fetching preview data:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
          <p className="text-xs text-slate-400">Loading document review data...</p>
        </div>
      </div>
    );
  }

  // SUCCESS SCREEN: PROTECTED DOCUMENT READY (Phase 6)
  if (workflowState === 'SUCCESS' && protectedData) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="mx-auto max-w-3xl space-y-6"
      >
        <div className="rounded-xl border border-emerald-500/30 bg-[#111726] p-8 text-center shadow-lg">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-inner">
            <ShieldCheck className="h-9 w-9" />
          </div>

          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-100">
            Protected Document Generated Successfully
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Your document has been securely sanitized according to confirmed PII decisions.
          </p>

          {/* Document Comparison Details */}
          <div className="mx-auto mt-6 max-w-md space-y-3 rounded-xl border border-slate-800 bg-[#0B0F19] p-4 text-left">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Original Document:</span>
              <span className="font-mono font-medium text-slate-200 truncate max-w-[200px]" title={protectedData.originalFileName}>
                {protectedData.originalFileName || documentMetadata.filename}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs border-t border-slate-800/80 pt-2">
              <span className="text-slate-400">Protected Document:</span>
              <span className="font-mono font-bold text-emerald-400 truncate max-w-[200px]" title={protectedData.protectedFileName}>
                {protectedData.protectedFileName}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs border-t border-slate-800/80 pt-2">
              <span className="text-slate-400">Redacted Items:</span>
              <span className="font-mono font-bold text-rose-300">
                {protectedData.redactedCount} {protectedData.redactedCount === 1 ? 'item' : 'items'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs border-t border-slate-800/80 pt-2">
              <span className="text-slate-400">Kept Items:</span>
              <span className="font-mono font-bold text-emerald-300">
                {protectedData.keptCount ?? keepCount} {keepCount === 1 ? 'item' : 'items'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs border-t border-slate-800/80 pt-2">
              <span className="text-slate-400">Redaction Strategy:</span>
              <span className="font-mono font-bold uppercase text-sky-300">
                {protectedData.redactionStrategy || documentMetadata.redactionStrategy}
              </span>
            </div>
          </div>

          {/* Reassurance Notice */}
          <div className="mx-auto mt-6 max-w-lg rounded-lg border border-slate-800/90 bg-[#090D16] p-4 text-left">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <div className="text-xs text-slate-300 leading-relaxed">
                <span className="font-semibold text-slate-100">Original Document Intact:</span>{' '}
                Original document remains intact. Protected copy successfully verified.
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleOpenPreview}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-6 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-sky-500/20 transition-all hover:bg-sky-400 active:scale-95 cursor-pointer"
            >
              <Eye className="h-4 w-4" />
              <span>Review Document Preview</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadProtected}
              disabled={downloading}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Download className={`h-4 w-4 ${downloading ? 'animate-bounce' : ''}`} />
              <span>{downloading ? 'Preparing download...' : 'Download Protected Document'}</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/scan')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-5 py-3 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
              <span>Scan Another Document</span>
            </button>
          </div>
        </div>

        {/* Protected Document Preview Modal */}
        <AnimatePresence>
          {isPreviewOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 12 }}
                transition={{ duration: 0.2 }}
                className="relative flex flex-col w-full max-w-5xl max-h-[90vh] rounded-2xl border border-slate-700/80 bg-[#0F1523] shadow-2xl overflow-hidden"
              >
                {/* Modal Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#131B2E] px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/30">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-100">
                          Protected Document Preview
                        </h3>
                        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                          Sanitized
                        </span>
                      </div>
                      <p className="text-xs font-mono text-slate-400 mt-0.5 truncate max-w-md">
                        {previewData?.filename || protectedData.protectedFileName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPreviewOpen(false)}
                      className="rounded-lg border border-slate-800 p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 cursor-pointer transition-colors"
                      title="Close Preview"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Sub-header info ribbon */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 bg-[#090D16] px-6 py-2.5 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">Strategy:</span>
                    <span className="font-mono font-bold text-sky-400">
                      {previewData?.redactionStrategy || documentMetadata.redactionStrategy}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400">Redacted:</span>
                    <span className="font-mono font-bold text-rose-400">
                      {previewData?.redactedCount ?? protectedData.redactedCount} items
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400">Preserved:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {previewData?.keptCount ?? keepCount} items
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 hidden sm:block">
                    Sensitive text layers are permanently excised from this file binary.
                  </div>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#090D16]">
                  {previewLoading ? (
                    <div className="flex h-72 items-center justify-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
                        <p className="text-xs text-slate-400">Extracting document preview...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-800 bg-[#0B0F19] p-4 sm:p-5 shadow-inner">
                      <div className="mb-3 flex items-center justify-between text-xs border-b border-slate-800/80 pb-3">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Info className="h-3.5 w-3.5 text-sky-400" />
                          <span>Sanitized Content Stream:</span>
                        </span>
                        <span className="text-[11px] text-rose-300 font-mono flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                          <span>[REDACTED] tokens highlight where sensitive PII was removed</span>
                        </span>
                      </div>

                      <div className="overflow-x-auto max-h-[58vh] font-mono text-xs text-slate-200 leading-relaxed select-text space-y-1">
                        {previewData?.textContent ? (
                          previewData.textContent.split('\n').map((line, idx) => {
                            // Highlight [REDACTED] or masked patterns
                            const parts = line.split(/(\[REDACTED\]|\*{3,}[0-9A-Za-z*@.\s-]*\*{2,}|\*{4}\s*\*{4}\s*\d{4}|\*{12}\d{4}|\*{8}\d{4})/g);
                            return (
                              <div
                                key={idx}
                                className="flex items-start py-0.5 px-2 rounded hover:bg-slate-800/50 transition-colors"
                              >
                                <span className="select-none text-slate-600 text-right w-8 mr-4 shrink-0 font-mono text-[11px]">
                                  {idx + 1}
                                </span>
                                <span className="flex-1 whitespace-pre-wrap break-all">
                                  {parts.map((part, pIdx) => {
                                    if (part === '[REDACTED]') {
                                      return (
                                        <span
                                          key={pIdx}
                                          className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm"
                                          title="Sanitized Redacted Token"
                                        >
                                          [REDACTED]
                                        </span>
                                      );
                                    }
                                    if (/^\*{3,}/.test(part) || /^\*{4}\s*\*{4}/.test(part)) {
                                      return (
                                        <span
                                          key={pIdx}
                                          className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                                          title="Partially Masked Sensitive Data"
                                        >
                                          {part}
                                        </span>
                                      );
                                    }
                                    return <span key={pIdx}>{part}</span>;
                                  })}
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="py-8 text-center text-slate-500">
                            No text preview content available for this file type.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-[#131B2E] px-6 py-4">
                  <div className="text-xs text-slate-400">
                    Showing sanitized copy of{' '}
                    <span className="font-mono text-slate-200">
                      {documentMetadata.filename}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsPreviewOpen(false)}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer transition-colors"
                    >
                      Close Preview
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadProtected}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2 text-xs font-bold text-slate-950 shadow-md shadow-emerald-500/20 hover:bg-emerald-400 active:scale-95 cursor-pointer transition-all"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download File</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="text-center">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="text-xs text-slate-400 hover:text-slate-200 hover:underline cursor-pointer"
          >
            ← Return to Dashboard
          </button>
        </div>
      </motion.div>
    );
  }

  // REVIEW COMPLETE VIEW: Ready / Processing / Verification Failed / Generation Failed
  if (isCompleted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="mx-auto max-w-3xl space-y-6"
      >
        {/* STATE 4: VERIFICATION_FAILED */}
        {workflowState === 'VERIFICATION_FAILED' && (
          <div className="rounded-xl border border-rose-500/40 bg-[#111726] p-8 text-center shadow-lg">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/40 bg-rose-500/10 text-rose-400 shadow-inner">
              <ShieldAlert className="h-9 w-9" />
            </div>

            <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-100">
              Redaction Verification Failed
            </h2>
            <p className="mt-1 text-sm text-slate-400 max-w-lg mx-auto">
              The protected document could not be verified because original sensitive content is still present in the document text layer.
            </p>

            {/* Decision Breakdown Summary */}
            <div className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-3 rounded-xl border border-slate-800 bg-[#0B0F19] p-4 text-center">
              <div>
                <div className="text-[11px] text-slate-400">Total Detections</div>
                <div className="font-mono text-lg font-bold text-slate-100 tabular-nums">
                  {totalDetections}
                </div>
              </div>

              <div className="border-x border-slate-800 px-2">
                <div className="text-[11px] text-rose-400">Marked to Redact</div>
                <div className="font-mono text-lg font-bold text-rose-300 tabular-nums">
                  {redactCount}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-emerald-400">Marked to Keep</div>
                <div className="font-mono text-lg font-bold text-emerald-300 tabular-nums">
                  {keepCount}
                </div>
              </div>
            </div>

            {/* Error Banner */}
            <div className="mx-auto mt-4 max-w-lg rounded-lg border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-300 font-mono text-left break-all">
              {errorMessage || 'Redaction verification failed: original sensitive value is still present in the protected document text layer.'}
            </div>

            {/* Reassurance Notice */}
            <div className="mx-auto mt-6 max-w-lg rounded-lg border border-slate-800/90 bg-[#090D16] p-4 text-left">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <div className="text-xs text-slate-300 leading-relaxed">
                  <span className="font-semibold text-slate-100">Original Document Intact:</span>{' '}
                  Original document remains intact. The protected copy failed verification.
                </div>
              </div>
            </div>

            {/* Failure Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleModifyDecisions}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-5 py-2.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Modify Decisions</span>
              </button>

              <button
                type="button"
                onClick={handleGenerateProtectedDocument}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-500 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-500/20 transition-all hover:bg-rose-400 active:scale-95 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE 5: GENERATION_FAILED */}
        {workflowState === 'GENERATION_FAILED' && (
          <div className="rounded-xl border border-amber-500/40 bg-[#111726] p-8 text-center shadow-lg">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/10 text-amber-400 shadow-inner">
              <AlertCircle className="h-9 w-9" />
            </div>

            <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-100">
              Protected Document Generation Failed
            </h2>
            <p className="mt-1 text-sm text-slate-400 max-w-lg mx-auto">
              An error occurred while generating the protected file.
            </p>

            {/* Decision Breakdown Summary */}
            <div className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-3 rounded-xl border border-slate-800 bg-[#0B0F19] p-4 text-center">
              <div>
                <div className="text-[11px] text-slate-400">Total Detections</div>
                <div className="font-mono text-lg font-bold text-slate-100 tabular-nums">
                  {totalDetections}
                </div>
              </div>

              <div className="border-x border-slate-800 px-2">
                <div className="text-[11px] text-rose-400">Marked to Redact</div>
                <div className="font-mono text-lg font-bold text-rose-300 tabular-nums">
                  {redactCount}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-emerald-400">Marked to Keep</div>
                <div className="font-mono text-lg font-bold text-emerald-300 tabular-nums">
                  {keepCount}
                </div>
              </div>
            </div>

            {/* Error Banner */}
            <div className="mx-auto mt-4 max-w-lg rounded-lg border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-300 font-mono text-left break-all">
              {errorMessage || 'Generation failed. Please try again.'}
            </div>

            {/* Reassurance Notice */}
            <div className="mx-auto mt-6 max-w-lg rounded-lg border border-slate-800/90 bg-[#090D16] p-4 text-left">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div className="text-xs text-slate-300 leading-relaxed">
                  <span className="font-semibold text-slate-100">Original Document Intact:</span>{' '}
                  Original document remains untouched. File generation failed.
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleModifyDecisions}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-5 py-2.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Modify Decisions</span>
              </button>

              <button
                type="button"
                onClick={handleGenerateProtectedDocument}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition-all hover:bg-amber-400 active:scale-95 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE 2: PROCESSING */}
        {workflowState === 'PROCESSING' && (
          <div className="rounded-xl border border-sky-500/30 bg-[#111726] p-8 text-center shadow-lg">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-sky-500/40 bg-sky-500/10 text-sky-400 shadow-inner">
              <Loader2 className="h-9 w-9 animate-spin text-sky-400" />
            </div>

            <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-100">
              Generating Protected Document...
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Sanitizing document, enforcing strict PII verification, and securing text layers...
            </p>

            {/* Decision Breakdown Summary */}
            <div className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-3 rounded-xl border border-slate-800 bg-[#0B0F19] p-4 text-center">
              <div>
                <div className="text-[11px] text-slate-400">Total Detections</div>
                <div className="font-mono text-lg font-bold text-slate-100 tabular-nums">
                  {totalDetections}
                </div>
              </div>

              <div className="border-x border-slate-800 px-2">
                <div className="text-[11px] text-rose-400">Marked to Redact</div>
                <div className="font-mono text-lg font-bold text-rose-300 tabular-nums">
                  {redactCount}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-emerald-400">Marked to Keep</div>
                <div className="font-mono text-lg font-bold text-emerald-300 tabular-nums">
                  {keepCount}
                </div>
              </div>
            </div>

            {/* Reassurance Notice */}
            <div className="mx-auto mt-6 max-w-lg rounded-lg border border-slate-800/90 bg-[#090D16] p-4 text-left">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                <div className="text-xs text-slate-300 leading-relaxed">
                  <span className="font-semibold text-slate-100">Original Document Untouched:</span>{' '}
                  Original document remains untouched while the protected copy is being generated.
                </div>
              </div>
            </div>

            {/* Processing Action Button */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-2 rounded-lg bg-sky-500/70 px-7 py-3 text-xs font-bold text-slate-950 cursor-not-allowed opacity-75"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating Protected Document...</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE 1: READY */}
        {workflowState === 'READY' && (
          <div className="rounded-xl border border-sky-500/30 bg-[#111726] p-8 text-center shadow-lg">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-sky-500/40 bg-sky-500/10 text-sky-400 shadow-inner">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-100">
              Review Complete
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Your PII review decisions have been securely saved to MongoDB.
            </p>

            {/* Decision Breakdown Summary */}
            <div className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-3 rounded-xl border border-slate-800 bg-[#0B0F19] p-4 text-center">
              <div>
                <div className="text-[11px] text-slate-400">Total Detections</div>
                <div className="font-mono text-lg font-bold text-slate-100 tabular-nums">
                  {totalDetections}
                </div>
              </div>

              <div className="border-x border-slate-800 px-2">
                <div className="text-[11px] text-rose-400">Marked to Redact</div>
                <div className="font-mono text-lg font-bold text-rose-300 tabular-nums">
                  {redactCount}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-emerald-400">Marked to Keep</div>
                <div className="font-mono text-lg font-bold text-emerald-300 tabular-nums">
                  {keepCount}
                </div>
              </div>
            </div>

            {/* Strict Reassurance Notice */}
            <div className="mx-auto mt-6 max-w-lg rounded-lg border border-slate-800/90 bg-[#090D16] p-4 text-left">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                <div className="text-xs text-slate-300 leading-relaxed">
                  <span className="font-semibold text-slate-100">Original Document Intact:</span>{' '}
                  The original document has <strong className="text-emerald-400">NOT</strong> been modified. Ready to generate the protected copy.
                </div>
              </div>
            </div>

            {/* Phase 6 Action: Generate Protected Document */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleModifyDecisions}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Modify Decisions</span>
              </button>

              <button
                type="button"
                onClick={handleGenerateProtectedDocument}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-7 py-3 text-xs font-bold text-slate-950 shadow-md shadow-sky-500/10 transition-all hover:bg-sky-400 active:scale-95 cursor-pointer"
              >
                <Lock className="h-4 w-4" />
                <span>Generate Protected Document</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <div className="text-center">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="text-xs text-slate-400 hover:text-slate-200 hover:underline cursor-pointer"
          >
            ← Return to Dashboard
          </button>
        </div>
      </motion.div>
    );
  }

  // ACTIVE PII REVIEW LIST VIEW (Phase 5)
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mx-auto max-w-4xl space-y-6"
    >
      {/* Header with Navigation Link */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-1 inline-flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-slate-200"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Back to Scan Results</span>
          </button>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-100">
            Document Review
          </h2>
          <p className="text-xs text-slate-400">
            <span className="font-mono text-sky-400">{documentMetadata.filename}</span> • Review each detected sensitive item and choose whether to redact or keep it.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/scan')}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-700 hover:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
          <span>New Scan</span>
        </button>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs text-rose-400 underline-offset-2 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Review Summary Card */}
      <div className="rounded-xl border border-slate-800/90 bg-[#111726] p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Review Summary
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Set decisions for all detected items before confirming.
            </p>
          </div>

          {/* Dynamic Counters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-[#090D16] px-3 py-1.5 text-xs">
              <span className="text-slate-400">Total:</span>
              <span className="font-mono font-bold text-slate-100 tabular-nums">
                {totalDetections}
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs">
              <span className="text-rose-400">Redact:</span>
              <span className="font-mono font-bold text-rose-300 tabular-nums">
                {redactCount}
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs">
              <span className="text-emerald-400">Keep:</span>
              <span className="font-mono font-bold text-emerald-300 tabular-nums">
                {keepCount}
              </span>
            </div>

            <div
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${
                pendingCount > 0
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                  : 'border-slate-800 bg-[#090D16] text-slate-400'
              }`}
            >
              <span>Pending:</span>
              <span className="font-mono font-bold tabular-nums">
                {pendingCount}
              </span>
            </div>
          </div>
        </div>

        {/* Global Batch Controls */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
          <span className="text-xs text-slate-400">Quick Batch Actions:</span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleRedactAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/20 active:scale-95 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              <span>Redact All</span>
            </button>

            <button
              type="button"
              onClick={handleKeepAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20 active:scale-95 cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Keep All</span>
            </button>
          </div>
        </div>
      </div>

      {/* Detections List for Human Review */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Detected Sensitive Entities ({totalDetections})
          </h3>
          <span className="text-[11px] text-slate-500">
            Click REDACT or KEEP on each item
          </span>
        </div>

        {detections.length > 0 ? (
          detections.map((detection, idx) => {
            const typeColor = TYPE_COLORS[detection.type] || {
              badge: 'bg-slate-800 border-slate-700 text-slate-300',
              dot: 'bg-slate-400',
            };
            const typeLabel = TYPE_LABELS[detection.type] || detection.type;
            const confidencePercent = Math.round((detection.confidence ?? 0.95) * 100);
            const displayVal = formatDisplayValue(detection.type, detection.value);
            const decision = detection.decision || 'PENDING';

            return (
              <div
                key={detection.id || idx}
                className={`rounded-xl border p-4 transition-all ${
                  decision === 'REDACT'
                    ? 'border-rose-500/40 bg-[#16121a]'
                    : decision === 'KEEP'
                    ? 'border-emerald-500/40 bg-[#0f171b]'
                    : 'border-slate-800/90 bg-[#111726]'
                }`}
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  {/* Left: Type, Position, Value */}
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold ${typeColor.badge}`}
                      >
                        {typeLabel}
                      </span>
                      <span className="font-mono text-xs text-slate-500">
                        [{detection.startIndex}..{detection.endIndex}]
                      </span>
                      <span className="text-xs text-slate-500">
                        Confidence: <strong className="font-mono text-slate-300">{confidencePercent}%</strong>
                      </span>
                    </div>

                    <div className="font-mono text-base font-semibold text-slate-100 break-all">
                      {displayVal}
                    </div>
                  </div>

                  {/* Right: Decision Action Toggle Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSetDecision(detection.id, 'REDACT')}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-mono text-xs font-bold transition-all cursor-pointer ${
                        decision === 'REDACT'
                          ? 'border border-rose-500 bg-rose-600 text-white shadow-sm shadow-rose-500/20'
                          : 'border border-slate-700 bg-slate-800/90 text-slate-300 hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-300'
                      }`}
                    >
                      {decision === 'REDACT' && <Check className="h-3.5 w-3.5" />}
                      <span>REDACT</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSetDecision(detection.id, 'KEEP')}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-mono text-xs font-bold transition-all cursor-pointer ${
                        decision === 'KEEP'
                          ? 'border border-emerald-500 bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                          : 'border border-slate-700 bg-slate-800/90 text-slate-300 hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-300'
                      }`}
                    >
                      {decision === 'KEEP' && <Check className="h-3.5 w-3.5" />}
                      <span>KEEP</span>
                    </button>
                  </div>
                </div>

                {/* Status Indicator Bar */}
                <div className="mt-3 flex items-center justify-between border-t border-slate-800/60 pt-2 text-[11px]">
                  <span className="text-slate-500">
                    Source: <span className="font-mono text-slate-400">{detection.source || 'REGEX'}</span>
                  </span>

                  <div>
                    {decision === 'REDACT' && (
                      <span className="font-semibold text-rose-400">
                        Marked for Redaction
                      </span>
                    )}
                    {decision === 'KEEP' && (
                      <span className="font-semibold text-emerald-400">
                        Marked to Keep
                      </span>
                    )}
                    {decision === 'PENDING' && (
                      <span className="text-amber-400 font-medium">
                        Decision Pending
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-slate-800 bg-[#111726] p-8 text-center text-xs text-slate-400">
            No detection records found for this document.
          </div>
        )}
      </div>

      {/* Confirmation & Final Submit Footer */}
      <div className="rounded-xl border border-slate-800/90 bg-[#111726] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-400">
            {!isAllReviewed ? (
              <span className="text-amber-400 font-medium flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Review all detected items before continuing ({pendingCount} pending).</span>
              </span>
            ) : (
              <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>All {totalDetections} detections reviewed. Ready to confirm.</span>
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={!isAllReviewed || submitting}
            onClick={handleConfirmReview}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-xs font-bold transition-all ${
              isAllReviewed && !submitting
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/10 hover:bg-sky-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 cursor-pointer active:scale-[0.99]'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
            }`}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving Decisions...</span>
              </>
            ) : (
              <>
                <span>Confirm Review</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
