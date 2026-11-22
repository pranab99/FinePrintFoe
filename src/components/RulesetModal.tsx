import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { CATEGORY_LABELS, ruleset } from '../engine/scoreContract';

interface RulesetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RulesetModal({ isOpen, onClose }: RulesetModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#171715]/50 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ruleset-modal-title"
        className="bg-white border border-[#E5E2DC] rounded-xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-xl overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-[#E5E2DC] flex items-start justify-between gap-4 bg-[#FAF9F6]">
          <div>
            <p className="text-xs font-medium text-[#6B6862] tabular-nums">
              {ruleset.name} · Version {ruleset.version} · Base Score {ruleset.base_score}
            </p>
            <h2
              id="ruleset-modal-title"
              className="font-serif text-2xl font-semibold text-[#171715] mt-1"
            >
              Baseline Fair-Terms Rubric (8 Rules)
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close ruleset modal"
            className="p-2 text-[#575550] hover:text-[#171715] hover:bg-[#EFECE6] rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A]"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          <p className="text-sm text-[#575550] leading-relaxed">
            Every submitted contract starts at <strong className="text-[#171715] tabular-nums">100 points</strong>.
            Triggered clauses deduct <span className="font-mono text-xs bg-[#F3F1EC] px-1.5 py-0.5 rounded">round(Base Penalty × Role Multiplier × Confidence Weight)</span>,
            where High = 1.0, Medium = 0.7, and Low = 0.4.
          </p>

          <div className="divide-y divide-[#E5E2DC] border border-[#E5E2DC] rounded-lg">
            {ruleset.rules.map((rule, index) => (
              <div key={rule.id} className="p-5 bg-white">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <div className="text-xs font-medium text-[#6B6862] flex items-center gap-2">
                      <span className="font-mono text-[#1E3A8A]">0{index + 1}</span>
                      <span aria-hidden="true">·</span>
                      <span>{CATEGORY_LABELS[rule.category]}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{rule.id}</span>
                    </div>
                    <h3 className="font-serif text-lg font-medium text-[#171715] mt-1">
                      {rule.title}
                    </h3>
                  </div>
                  <div className="text-right font-mono text-sm font-semibold text-[#B91C1C] tabular-nums shrink-0">
                    -{rule.penalty} base pts
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="bg-[#F6F9F6] border border-[#DCE7DE] rounded-lg p-3.5">
                    <div className="text-xs font-semibold text-[#15803D] mb-1">
                      Fair Baseline
                    </div>
                    <p className="text-[#2D2C29] leading-relaxed">{rule.fair_baseline}</p>
                  </div>
                  <div className="bg-[#FDF7F7] border border-[#F2DCDC] rounded-lg p-3.5">
                    <div className="text-xs font-semibold text-[#B91C1C] mb-1">
                      Flaw Trigger
                    </div>
                    <p className="text-[#2D2C29] leading-relaxed">{rule.flaw_trigger}</p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-[#F0EDE6] flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-[#575550] tabular-nums">
                  <span className="font-medium text-[#171715]">Role Multipliers:</span>
                  <span>Consumer: <strong className="font-mono">{rule.role_multipliers.consumer.toFixed(2)}×</strong></span>
                  <span>Freelancer: <strong className="font-mono">{rule.role_multipliers.freelancer.toFixed(2)}×</strong></span>
                  <span>Tenant: <strong className="font-mono">{rule.role_multipliers.tenant.toFixed(2)}×</strong></span>
                  <span>Business: <strong className="font-mono">{rule.role_multipliers.business.toFixed(2)}×</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#E5E2DC] bg-[#FAF9F6] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-white bg-[#171715] hover:bg-[#2E2D29] rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A]"
          >
            Close Rubric
          </button>
        </div>
      </div>
    </div>
  );
}
