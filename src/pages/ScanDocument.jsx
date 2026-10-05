import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ScanLine,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import FileDropzone from '../components/FileDropzone';
import SelectedFile from '../components/SelectedFile';
import RedactionModeSelector from '../components/RedactionModeSelector';
import DetectionOptions, {
  DETECTION_OPTION_ITEMS,
} from '../components/DetectionOptions';

const INITIAL_DETECTION_OPTIONS = DETECTION_OPTION_ITEMS.reduce(
  (acc, item) => ({ ...acc, [item.id]: true }),
  {}
);

const CHECKBOX_TO_DETECTION_TYPE = {
  person: 'PERSON_NAME',
  address: 'ADDRESS',
  email: 'EMAIL',
  phone: 'PHONE',
  aadhaar: 'AADHAAR',
  pan: 'PAN_NUMBER',
  upi: 'UPI_ID',
  dl: 'DRIVING_LICENSE',
  voter: 'VOTER_ID',
  card: 'CREDIT_CARD',
  bank: 'BANK_ACCOUNT',
  medical: 'MEDICAL_RECORD_ID',
  emp: 'EMPLOYEE_ID',
  vehicle: 'VEHICLE_REGISTRATION',
  dob: 'DATE_OF_BIRTH',
  ip: 'IP_ADDRESS',
  passport: 'PASSPORT',
};

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function fetchJsonWithRetry(url, options = {}, retries = 2) {
  const token = localStorage.getItem('redactx_auth_token');
  const headers = {
    ...(options.headers || {}),
  };

  if (token && !headers['Authorization'] && !headers['authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        credentials: 'include',
        ...options,
        headers,
      });

      const rawText = await response.text();
      // If response is HTML (cookie check or proxy warmup during server restart)
      if (rawText.trim().startsWith('<') || rawText.includes('<!doctype') || rawText.includes('<html')) {
        if (attempt < retries) {
          await new Promise((res) => setTimeout(res, 800 * (attempt + 1)));
          continue;
        }
        throw new Error('Server connection warming up. Please retry upload in a moment.');
      }

      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        if (attempt < retries) {
          await new Promise((res) => setTimeout(res, 800 * (attempt + 1)));
          continue;
        }
        throw new Error('Invalid response format received from server. Please retry.');
      }

      return { response, result: parsed };
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((res) => setTimeout(res, 800 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export default function ScanDocument() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedRedactionMode, setSelectedRedactionMode] = useState('standard');
  const [detectionOptions, setDetectionOptions] = useState(
    INITIAL_DETECTION_OPTIONS
  );
  const [errorMessage, setErrorMessage] = useState(null);
  const [scanPhase, setScanPhase] = useState('idle'); // 'idle' | 'uploading' | 'scanning' | 'complete'

  const isBusy = scanPhase !== 'idle';

  const handleFileSelected = (file) => {
    setSelectedFile(file);
    setErrorMessage(null);
  };

  const handleRemoveFile = () => {
    if (isBusy) return;
    setSelectedFile(null);
    setErrorMessage(null);
  };

  const handleToggleOption = (optionId) => {
    if (isBusy) return;
    setDetectionOptions((prev) => ({
      ...prev,
      [optionId]: !prev[optionId],
    }));
  };

  const handleToggleAll = (selectAll) => {
    if (isBusy) return;
    const updated = DETECTION_OPTION_ITEMS.reduce(
      (acc, item) => ({ ...acc, [item.id]: selectAll }),
      {}
    );
    setDetectionOptions(updated);
  };

  const handleStartScan = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    // 1. Verify that selectedFile exists
    if (!selectedFile) {
      setErrorMessage('Please select a document before starting the scan.');
      return;
    }

    setErrorMessage(null);

    try {
      // 2. Set uploading state
      setScanPhase('uploading');

      // Upload file to backend: POST /api/documents/upload
      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('file', selectedFile);

      const uploadUrl = `${API_BASE}/api/documents/upload`;
      let uploadResponseObj;

      try {
        uploadResponseObj = await fetchJsonWithRetry(uploadUrl, {
          method: 'POST',
          body: formData,
        });
      } catch (uploadErr) {
        // Fallback to /api/upload
        uploadResponseObj = await fetchJsonWithRetry(`${API_BASE}/api/upload`, {
          method: 'POST',
          body: formData,
        });
      }

      const { response: uploadResponse, result: uploadResult } = uploadResponseObj;

      if (!uploadResponse.ok || !uploadResult.success) {
        throw new Error(uploadResult?.error || `Failed to upload document (status ${uploadResponse.status}).`);
      }

      const documentId = uploadResult.data?.documentId || uploadResult.data?.id;
      if (!documentId) {
        throw new Error('Server did not return a valid document ID.');
      }

      // 3. Set scanning state
      setScanPhase('scanning');

      // Convert selected detection options into backend detectionTypes
      const selectedDetectionTypes = Object.entries(detectionOptions)
        .filter(([key, isChecked]) => isChecked && CHECKBOX_TO_DETECTION_TYPE[key])
        .map(([key]) => CHECKBOX_TO_DETECTION_TYPE[key]);

      // Call scan endpoint: POST /api/documents/:id/scan
      const scanUrl = `${API_BASE}/api/documents/${documentId}/scan`;
      const { response: scanResponse, result: scanResult } = await fetchJsonWithRetry(scanUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          detectionTypes: selectedDetectionTypes.length > 0 ? selectedDetectionTypes : ['ALL'],
        }),
      });

      if (!scanResponse.ok || !scanResult.success) {
        throw new Error(scanResult?.error || `Failed to complete document scan (status ${scanResponse.status}).`);
      }

      // 4. Set complete state
      setScanPhase('complete');

      // 5. Navigate to /scan/results with real backend scan data
      setTimeout(() => {
        navigate('/scan/results', {
          state: {
            documentId: scanResult.data.documentId,
            filename: scanResult.data.filename || selectedFile.name,
            fileType: scanResult.data.fileType || selectedFile.name.split('.').pop()?.toUpperCase() || 'FILE',
            fileSize: scanResult.data.fileSize,
            status: scanResult.data.status,
            piiCount: scanResult.data.piiCount,
            detections: scanResult.data.detections || [],
            redactionMode: selectedRedactionMode,
            detectionOptions,
          },
        });
      }, 400);
    } catch (err) {
      console.error('Scan workflow error:', err);
      setErrorMessage(err.message || 'An error occurred during scan execution.');
      setScanPhase('idle');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-100">
          Scan Document
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Upload a document or image to detect and protect sensitive information.
        </p>
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
            className="text-xs text-rose-400 underline-offset-2 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Upload Area or Selected Document Card */}
        <div className="space-y-6 lg:col-span-7">
          {!selectedFile ? (
            <FileDropzone
              onFileSelected={handleFileSelected}
              errorMessage={errorMessage}
              onErrorChange={setErrorMessage}
            />
          ) : (
            <SelectedFile
              file={selectedFile}
              onRemove={handleRemoveFile}
            />
          )}

          {/* Quick Guide Card */}
          <div className="rounded-xl border border-slate-800/80 bg-[#111726]/60 p-5">
            <h4 className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <FileCheck2 className="h-4 w-4 text-sky-400" />
              <span>Supported Document Formats</span>
            </h4>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-400 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-800 bg-[#090D16] p-2.5">
                <div className="font-semibold text-slate-200">PDF Documents</div>
                <div className="text-[11px] text-slate-500">Invoices, records, contracts</div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#090D16] p-2.5">
                <div className="font-semibold text-slate-200">Word Files (.docx)</div>
                <div className="text-[11px] text-slate-500">Letters, profiles, memos</div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#090D16] p-2.5">
                <div className="font-semibold text-slate-200">Text & Images</div>
                <div className="text-[11px] text-slate-500">TXT, PNG, JPG, JPEG</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Redaction Mode + Detection Options + Start Scan Button */}
        <div className="space-y-6 lg:col-span-5">
          <RedactionModeSelector
            selectedMode={selectedRedactionMode}
            onSelectMode={(mode) => {
              if (!isBusy) setSelectedRedactionMode(mode);
            }}
          />

          <DetectionOptions
            options={detectionOptions}
            onToggleOption={handleToggleOption}
            onToggleAll={handleToggleAll}
          />

          {/* Start Scan Button with active workflow states */}
          <div className="rounded-xl border border-slate-800 bg-[#111726] p-4">
            <button
              type="button"
              disabled={!selectedFile || isBusy}
              onClick={handleStartScan}
              className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all ${
                isBusy
                  ? 'cursor-wait bg-sky-500/80 text-slate-950 opacity-90'
                  : selectedFile
                  ? 'cursor-pointer bg-sky-500 text-slate-950 shadow-md shadow-sky-500/10 hover:bg-sky-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 active:scale-[0.99]'
                  : 'cursor-not-allowed bg-slate-800/80 text-slate-500'
              }`}
            >
              {scanPhase === 'uploading' && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              )}
              {scanPhase === 'scanning' && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Scanning...</span>
                </>
              )}
              {scanPhase === 'complete' && (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  <span>Scan Complete</span>
                </>
              )}
              {scanPhase === 'idle' && (
                <>
                  <ScanLine className="h-4 w-4" />
                  <span>Start Scan</span>
                  {selectedFile && <ArrowRight className="h-4 w-4" />}
                </>
              )}
            </button>

            {scanPhase === 'uploading' && (
              <p className="mt-2 text-center text-[11px] text-sky-400">
                Uploading document to RedactX scan pipeline...
              </p>
            )}
            {scanPhase === 'scanning' && (
              <p className="mt-2 text-center text-[11px] text-sky-400">
                Running deterministic PII detection rules...
              </p>
            )}
            {scanPhase === 'complete' && (
              <p className="mt-2 text-center text-[11px] text-emerald-400">
                Scan completed. Redirecting to results...
              </p>
            )}
            {scanPhase === 'idle' && !selectedFile && (
              <p className="mt-2 text-center text-[11px] text-slate-500">
                Select or drop a file to enable scanning.
              </p>
            )}
            {scanPhase === 'idle' && selectedFile && (
              <p className="mt-2 text-center text-[11px] text-emerald-400">
                Document ready. Click to initialize scan workflow.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Security & Privacy Notice */}
      <footer className="mt-8 rounded-xl border border-slate-800/80 bg-[#111726]/40 p-4 text-center">
        <p className="text-xs text-slate-400">
          Your documents are processed through the RedactX privacy workflow. Sensitive information will be identified before redaction.
        </p>
      </footer>
    </div>
  );
}
