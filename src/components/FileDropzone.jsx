import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, AlertCircle } from 'lucide-react';

const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'txt', 'png', 'jpg', 'jpeg'];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export default function FileDropzone({ onFileSelected, errorMessage, onErrorChange }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const validateAndProcessFile = (file) => {
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !ALLOWED_EXTENSIONS.includes(fileExtension)) {
      onErrorChange('Unsupported file type.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      onErrorChange('File size exceeds the 50 MB limit.');
      return;
    }

    // Valid file
    onErrorChange(null);
    onFileSelected(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcessFile(e.target.files[0]);
    }
    // Reset file input value so re-selecting the same file triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openBrowseDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-3">
      {/* Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openBrowseDialog}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openBrowseDialog();
          }
        }}
        aria-label="Upload document dropzone"
        className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 sm:p-12 ${
          isDragging
            ? 'border-sky-400 bg-sky-500/10 scale-[1.01]'
            : 'border-slate-700/80 bg-[#111726] hover:border-slate-600 hover:bg-[#131b2e]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/png,image/jpeg"
          onChange={handleFileInputChange}
          className="hidden"
          aria-hidden="true"
        />

        {/* Lucide upload / file icon */}
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-2xl border transition-all duration-200 ${
            isDragging
              ? 'border-sky-400 bg-sky-400/20 text-sky-300'
              : 'border-slate-700 bg-slate-800/80 text-sky-400 group-hover:border-slate-600 group-hover:bg-slate-800 group-hover:text-sky-300'
          }`}
        >
          <UploadCloud className="h-8 w-8" />
        </div>

        <h3 className="mt-5 text-base font-semibold text-slate-100 sm:text-lg">
          Drag & drop your document here
        </h3>

        <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
          <span>or</span>
        </div>

        {/* Browse Files Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openBrowseDialog();
          }}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-sky-500/40 hover:bg-slate-700 hover:text-white focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          <FileText className="h-3.5 w-3.5 text-sky-400" />
          <span>Browse Files</span>
        </button>

        {/* Supported formats & max size info */}
        <div className="mt-6 flex flex-col items-center gap-1 font-mono text-xs text-slate-400">
          <div className="text-slate-300 font-medium">
            PDF • DOCX • TXT • PNG • JPG
          </div>
          <div className="text-slate-500 text-[11px]">
            Maximum size: 50 MB
          </div>
        </div>
      </div>

      {/* Error Message Alert */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
