import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { CATEGORY_LABELS } from '../engine/scoreContract';
import type { BreakdownItem } from '../types/contract';

interface RedFlagCardProps {
  item: BreakdownItem;
}

const SEVERITY_CONFIG = {
  high: {
    label: 'High Severity',
    textClass: 'text-[#B91C1C]',
    boxClass: 'bg-[#FDF7F7] border-[#F2DCDC]',
  },
  medium: {
    label: 'Medium Severity',
    textClass: 'text-[#B45309]',
    boxClass: 'bg-[#FEF9F2] border-[#F3DFBF]',
  },
  low: {
    label: 'Low Severity',
    textClass: 'text-[#475569]',
    boxClass: 'bg-[#F8FAFC] border-[#E2E8F0]',
  },
};

export function RedFlagCard({ item }: RedFlagCardProps) {
  const [copied, setCopied] = useState(false);
  const sev = SEVERITY_CONFIG[item.severity];
  const isMissingClause = item.eval.exact_quote.trim() === 'MISSING_CLAUSE';

  async function handleCopyQuestion() {
    try {
      await navigator.clipboard.writeText(item.eval.pushback_question);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback ignored cleanly if blocked in headless environment
    }
  }

  return (
    <article
      data-testid={`red-flag-card-${item.rule_id}`}
      className="bg-white border border-[#E5E2DC] rounded-xl p-6 space-y-5"
    >
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B6862]">
            <span className="font-medium text-[#171715]">
              {CATEGORY_LABELS[item.category]}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{item.rule_id}</span>
            <span aria-hidden="true">·</span>
            <span className="capitalize">{item.eval.confidence} confidence</span>
          </div>

          <h3 className="font-serif text-xl font-medium text-[#171715] mt-1">
            {item.title}
          </h3>
        </div>

        <div
          className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-md border text-xs font-semibold whitespace-nowrap shrink-0 tabular-nums ${sev.boxClass} ${sev.textClass}`}
        >
          <span>{sev.label}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono">-{item.deducted_points} pts</span>
        </div>
      </div>

      {/* Deviation Explanation + Extracted Metrics */}
      <div className="space-y-2">
        <p className="text-sm text-[#2D2C29] leading-relaxed">
          {item.eval.deviation_explanation}
        </p>
        {item.eval.extracted_metrics && item.eval.extracted_metrics !== 'None' && (
          <div className="text-xs text-[#575550]">
            <span className="font-semibold text-[#171715]">Extracted terms: </span>
            <span className="font-mono">{item.eval.extracted_metrics}</span>
          </div>
        )}
      </div>

      {/* Side-by-Side Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#FAF8F5] border border-[#E5E2DC] rounded-lg p-4">
          <div className="text-xs font-semibold text-[#B91C1C] mb-2">
            What They Wrote
          </div>
          {isMissingClause ? (
            <p className="text-sm text-[#575550] italic leading-relaxed">
              Clause omitted: the submitted agreement does not specify a clear cancellation method or explicit net payment timeline.
            </p>
          ) : (
            <blockquote className="text-sm text-[#171715] font-serif italic leading-relaxed">
              &ldquo;{item.eval.exact_quote}&rdquo;
            </blockquote>
          )}
        </div>

        <div className="bg-[#F6F9F6] border border-[#DCE7DE] rounded-lg p-4">
          <div className="text-xs font-semibold text-[#15803D] mb-2">
            Fair Baseline Standard
          </div>
          <p className="text-sm text-[#2D2C29] leading-relaxed">
            {item.fair_baseline}
          </p>
        </div>
      </div>

      {/* Actionable Pushback Question */}
      <div className="pt-4 border-t border-[#EFECE6] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-[#1E3A8A] mb-1">
            Suggested Pushback Question
          </div>
          <p className="text-sm text-[#171715] leading-relaxed">
            {item.eval.pushback_question}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleCopyQuestion()}
          aria-label={`Copy pushback question for ${item.title}`}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-[#171715] bg-[#FAF9F6] border border-[#D6D2C9] rounded-lg hover:bg-[#EFECE6] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A]"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#15803D]" aria-hidden="true" />
              <span className="text-[#15803D]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-[#575550]" aria-hidden="true" />
              <span>Copy Pushback</span>
            </>
          )}
        </button>
      </div>
    </article>
  );
}
