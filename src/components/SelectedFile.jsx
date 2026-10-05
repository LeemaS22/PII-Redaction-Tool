import React from 'react';
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  FileImage,
  X,
  CheckCircle2,
} from 'lucide-react';

function getFileIcon(extension) {
  switch (extension) {
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

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function SelectedFile({ file, onRemove }) {
  if (!file) return null;

  const extension = file.name.split('.').pop()?.toLowerCase() || 'FILE';
  const IconComponent = getFileIcon(extension);
  const formattedSize = formatFileSize(file.size);
  const uppercaseExtension = extension.toUpperCase();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Selected Document
        </h3>
        <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
          <CheckCircle2 className="h-3 w-3" />
          <span>Ready for scanning</span>
        </span>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-slate-700/80 bg-[#111726] p-4 transition-colors hover:border-slate-600 sm:p-5">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-400">
            <IconComponent className="h-6 w-6" />
          </div>

          <div className="min-w-0">
            <div
              className="truncate text-sm font-semibold text-slate-100"
              title={file.name}
            >
              {file.name}
            </div>
            <div className="mt-1 flex items-center gap-1.5 font-mono text-xs text-slate-400 tabular-nums">
              <span className="font-semibold text-sky-300">
                {uppercaseExtension}
              </span>
              <span className="text-slate-600" aria-hidden="true">
                •
              </span>
              <span>{formattedSize}</span>
            </div>
          </div>
        </div>

        {/* Remove Button */}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove file ${file.name}`}
          className="ml-3 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-400 transition-colors hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300 focus-visible:outline-2 focus-visible:outline-rose-400"
          title="Remove selected file"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
