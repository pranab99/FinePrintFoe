import { useRef, useState } from 'react';
import {
  AlertCircle,
  FileText,
  Loader2,
  Scale,
  Trash2,
  Upload,
} from 'lucide-react';
import { SAMPLE_CONTRACTS } from '../data/samples';
import { ROLE_LABELS } from '../engine/scoreContract';
import type { UserRole } from '../types/contract';

interface InputStageProps {
  role: UserRole;
  onRoleChange: (role: UserRole) => void;
  contractText: string;
  onContractTextChange: (text: string) => void;
  activeSampleId: string | null;
  onSelectSample: (sampleId: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  errorMessage: string | null;
  onError: (msg: string | null) => void;
}

const ROLES: UserRole[] = ['consumer', 'freelancer', 'tenant', 'business'];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to read file bytes.'));
        return;
      }
      const commaIndex = result.indexOf(',');
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}

export function InputStage({
  role,
  onRoleChange,
  contractText,
  onContractTextChange,
  activeSampleId,
  onSelectSample,
  onAnalyze,
  isAnalyzing,
  errorMessage,
  onError,
}: InputStageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExtractingFile, setIsExtractingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const trimmedLength = contractText.trim().length;
  const wordCount = contractText.trim()
    ? contractText.trim().split(/\s+/).length
    : 0;

  async function processFile(file: File) {
    onError(null);
    const lowerName = file.name.toLowerCase();
    const isTxtOrMd =
      lowerName.endsWith('.txt') ||
      lowerName.endsWith('.md') ||
      file.type === 'text/plain' ||
      file.type === 'text/markdown';
    const isPdf = lowerName.endsWith('.pdf') || file.type === 'application/pdf';

    if (!isTxtOrMd && !isPdf) {
      onError('Unsupported file format. Please upload a .txt, .md, or .pdf contract file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      onError('File exceeds the 10 MB size limit.');
      return;
    }

    setIsExtractingFile(true);
    try {
      if (isTxtOrMd) {
        const text = await file.text();
        if (!text.trim()) {
          onError('The uploaded text file is empty.');
          return;
        }
        onContractTextChange(text);
        setUploadedFileName(file.name);
      } else {
        const dataBase64 = await fileToBase64(file);
        const res = await fetch('/api/extract-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataBase64, filename: file.name }),
        });
        const payload = (await res.json()) as { text?: string; error?: string };
        if (!res.ok || !payload.text) {
          throw new Error(payload.error || 'Could not extract text from PDF.');
        }
        onContractTextChange(payload.text);
        setUploadedFileName(file.name);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to load file.');
    } finally {
      setIsExtractingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  return (
    <section
      id="input-stage"
      aria-label="Contract Input Workspace"
      className="scroll-mt-24 bg-white border border-[#E5E2DC] rounded-xl p-6 sm:p-8"
    >
      {/* Role Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#EFECE6]">
        <div>
          <h2 className="font-serif text-lg font-medium text-[#171715]">
            01. Select Your Contractual Role
          </h2>
          <p className="text-sm text-[#6B6862] mt-0.5">
            Role multipliers adjust rule penalties deterministically based on what you have at stake.
          </p>
        </div>

        <div
          role="group"
          aria-label="Contractual role selector"
          className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#F3F1EC] rounded-lg shrink-0"
        >
          {ROLES.map((r) => {
            const active = role === r;
            return (
              <button
                key={r}
                type="button"
                aria-pressed={active}
                onClick={() => onRoleChange(r)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] ${
                  active
                    ? 'bg-white text-[#171715] shadow-xs'
                    : 'text-[#575550] hover:text-[#171715]'
                }`}
              >
                {ROLE_LABELS[r]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Try Sample Contract Strip */}
      <div id="sample-contracts" className="scroll-mt-24 py-6 border-b border-[#EFECE6]">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold text-[#171715]">
            02. Try Sample Contract
          </h3>
          <span className="text-xs text-[#6B6862]">
            Load realistic trap-filled clauses in one click
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SAMPLE_CONTRACTS.map((sample) => {
            const isSelected = activeSampleId === sample.id;
            return (
              <button
                key={sample.id}
                type="button"
                onClick={() => {
                  setUploadedFileName(null);
                  onSelectSample(sample.id);
                }}
                className={`text-left p-4 rounded-lg border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] ${
                  isSelected
                    ? 'bg-[#F3F6FC] border-[#1E3A8A]'
                    : 'bg-[#FAF9F6] border-[#E5E2DC] hover:border-[#B8B3A8] hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[#171715]">
                    {sample.label}
                  </span>
                  <span className="text-xs font-medium text-[#1E3A8A] shrink-0">
                    {ROLE_LABELS[sample.recommendedRole]}
                  </span>
                </div>
                <p className="text-xs text-[#6B6862] mt-1.5 leading-relaxed">
                  {sample.subtitle}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Textarea & File Upload */}
      <div className="pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <label
            htmlFor="contract-textarea"
            className="text-sm font-semibold text-[#171715]"
          >
            03. Paste Contract Text or Upload Document
          </label>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf"
              className="hidden"
              tabIndex={-1}
              aria-hidden="true"
              id="contract-file-upload"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void processFile(file);
              }}
            />
            <button
              type="button"
              disabled={isExtractingFile || isAnalyzing}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#171715] bg-[#FAF9F6] border border-[#D6D2C9] rounded-lg hover:bg-[#EFECE6] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A]"
            >
              {isExtractingFile ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1E3A8A]" aria-hidden="true" />
              ) : (
                <Upload className="w-3.5 h-3.5 text-[#1E3A8A]" aria-hidden="true" />
              )}
              <span>{isExtractingFile ? 'Extracting PDF...' : 'Upload .txt / .md / .pdf'}</span>
            </button>

            {contractText.length > 0 && (
              <button
                type="button"
                disabled={isAnalyzing}
                onClick={() => {
                  onContractTextChange('');
                  setUploadedFileName(null);
                  onError(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#575550] hover:text-[#B91C1C] hover:bg-[#FDF7F7] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A]"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void processFile(file);
          }}
          className={`relative rounded-lg border transition-colors ${
            isDragging
              ? 'border-[#1E3A8A] bg-[#F3F6FC]'
              : 'border-[#D6D2C9] bg-[#FAF9F6]'
          }`}
        >
          <textarea
            id="contract-textarea"
            rows={10}
            value={contractText}
            onChange={(e) => {
              onContractTextChange(e.target.value);
              if (errorMessage) onError(null);
            }}
            placeholder="Paste Terms of Service, SaaS subscription terms, Freelance SOW, or Apartment Lease clauses here — or drag and drop a .txt, .md, or .pdf file..."
            className="w-full min-h-[240px] p-4 bg-transparent text-sm text-[#171715] placeholder:text-[#8A867E] leading-relaxed font-sans resize-y focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] rounded-lg"
          />
        </div>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#6B6862] tabular-nums">
          <div className="flex items-center gap-3">
            {uploadedFileName && (
              <span className="inline-flex items-center gap-1.5 text-[#1E3A8A] font-medium">
                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                Loaded: {uploadedFileName}
              </span>
            )}
            <span>{wordCount.toLocaleString()} words</span>
            <span aria-hidden="true">·</span>
            <span>{trimmedLength.toLocaleString()} / 120,000 chars</span>
          </div>
          <span>Evaluates against 8 fair-terms rules</span>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 p-4 rounded-lg bg-[#FDF7F7] border border-[#F2DCDC] flex items-start gap-3 text-sm text-[#B91C1C]"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-[#6B6862]">
            Gemini extracts verbatim quotes only. Your safety score is calculated deterministically by the ruleset engine.
          </p>
          <button
            type="button"
            disabled={isAnalyzing || isExtractingFile}
            onClick={onAnalyze}
            className="inline-flex items-center justify-center gap-2.5 px-6 py-3 text-sm font-semibold text-white bg-[#1E3A8A] hover:bg-[#172E6E] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1E3A8A]"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Auditing Clauses...</span>
              </>
            ) : (
              <>
                <Scale className="w-4 h-4" aria-hidden="true" />
                <span>Analyze Contract</span>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
