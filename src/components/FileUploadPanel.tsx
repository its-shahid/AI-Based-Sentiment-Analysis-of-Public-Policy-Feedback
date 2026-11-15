import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Loader2,
  RotateCcw,
  UploadCloud,
} from 'lucide-react';
import type { IngestionMetadata } from '../types/policy';

interface FileUploadPanelProps {
  metadata: IngestionMetadata;
  isLoading: boolean;
  uploadError: string | null;
  uploadSuccess: string | null;
  isCustomDataset: boolean;
  onFileSelected: (file: File) => Promise<void> | void;
  onRestoreDefault: () => void;
  onDismissNotice: () => void;
  onDismissError: () => void;
}

const ACCEPTED_EXTENSIONS = '.csv,.xlsx,.xls,.json,.txt,.pdf';

export const FileUploadPanel: React.FC<FileUploadPanelProps> = ({
  metadata,
  isLoading,
  uploadError,
  uploadSuccess,
  isCustomDataset,
  onFileSelected,
  onRestoreDefault,
  onDismissNotice,
  onDismissError,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file || isLoading) return;
    void onFileSelected(file);
  };

  return (
    <section
      aria-label="Dataset Upload and Ingestion"
      className="bg-white border border-[#DCE5F2] rounded-xl shadow-sm p-5 md:p-6"
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-center">
        {/* Drag-and-Drop Zone */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => !isLoading && inputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !isLoading) {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={`xl:col-span-7 rounded-xl border-2 border-dashed p-5 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            isDragging
              ? 'border-[#2563EB] bg-[#EFF6FF]'
              : 'border-[#CBD8EC] bg-[#F4F7FC]/75 hover:border-[#2563EB] hover:bg-[#F4F7FC]'
          }`}
        >
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#0B1F3A] text-white flex items-center justify-center shrink-0">
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <UploadCloud className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="text-[16px] font-semibold text-[#0B1F3A]">
                {isLoading
                  ? 'Extracting and analyzing uploaded feedback...'
                  : 'Upload Public Policy Feedback Dataset'}
              </div>
              <p className="text-[14px] text-[#475569] mt-0.5">
                Drag and drop a file here or browse · Supports{' '}
                <span className="font-mono font-medium text-[#163A70]">
                  CSV, XLSX, XLS, JSON, TXT, PDF
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            className="px-4 py-2.5 text-[15px] font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isCustomDataset ? 'Replace Dataset' : 'Browse File'}
          </button>
        </div>

        {/* Active Dataset Ingestion Summary */}
        <div className="xl:col-span-5 bg-[#F4F7FC] border border-[#DCE5F2] rounded-xl p-4 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {metadata.fileType === 'PDF' || metadata.fileType === 'TXT' ? (
                <FileText className="w-5 h-5 text-[#163A70] shrink-0" />
              ) : (
                <FileSpreadsheet className="w-5 h-5 text-[#163A70] shrink-0" />
              )}
              <div className="min-w-0">
                <div
                  className="text-[15px] font-semibold text-[#0B1F3A] truncate"
                  title={metadata.fileName}
                >
                  {metadata.fileName}
                </div>
                <div className="text-[13px] text-[#475569] font-mono tabular-nums">
                  Format: {metadata.fileType} · Extracted: {metadata.rawRowCount.toLocaleString()} · Valid: {metadata.validRowCount.toLocaleString()}
                </div>
              </div>
            </div>

            {isCustomDataset && (
              <button
                type="button"
                onClick={onRestoreDefault}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-[#163A70] bg-white border border-[#CBD8EC] hover:bg-[#EFF6FF] rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restore Demo CSV
              </button>
            )}
          </div>

          <div className="text-[13px] text-[#334155] border-t border-[#DCE5F2] pt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              Text Column:{' '}
              <strong className="font-mono text-[#0B1F3A]">
                {metadata.detectedColumns.feedback_text ?? 'feedback_text'}
              </strong>
            </span>
            {metadata.inferredColumns.length > 0 && (
              <span className="text-[#475569]">
                · Auto-inferred: {metadata.inferredColumns.join(', ')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Validation Success / Error Feedback */}
      {uploadSuccess && !uploadError && (
        <div className="mt-4 px-4 py-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg text-[15px] text-[#065F46] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0" />
            <span className="font-medium">{uploadSuccess}</span>
          </div>
          <button
            type="button"
            onClick={onDismissNotice}
            className="text-[14px] font-semibold underline cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {uploadError && (
        <div className="mt-4 px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-[15px] text-[#991B1B] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0" />
            <span>{uploadError}</span>
          </div>
          <button
            type="button"
            onClick={onDismissError}
            className="text-[14px] font-semibold underline cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}
    </section>
  );
};
