import { useState } from 'react';
import { Calculator, ChevronDown, ChevronUp } from 'lucide-react';
import { CATEGORY_LABELS, ROLE_LABELS, formatScoreFormula } from '../engine/scoreContract';
import type { RiskReport } from '../types/contract';

interface ScoreMathInspectorProps {
  report: RiskReport;
}

export function ScoreMathInspector({ report }: ScoreMathInspectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const formulaString = formatScoreFormula(report);

  return (
    <div
      id="methodology"
      className="scroll-mt-24 bg-white border border-[#E5E2DC] rounded-xl overflow-hidden"
    >
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 text-left hover:bg-[#FAF9F6] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1E3A8A]"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 min-w-0">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#171715] whitespace-nowrap shrink-0">
            <Calculator className="w-4 h-4 text-[#1E3A8A]" aria-hidden="true" />
            Score Math Inspector
          </span>
          <span className="font-mono text-xs text-[#575550] truncate tabular-nums">
            {formulaString}
          </span>
        </div>

        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E3A8A] whitespace-nowrap shrink-0">
          <span>{isOpen ? 'Hide Ledger' : 'Inspect Formula'}</span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-4 h-4" aria-hidden="true" />
          )}
        </span>
      </button>

      {isOpen && (
        <div className="px-6 pb-6 pt-2 border-t border-[#EFECE6] space-y-4">
          <div className="p-4 bg-[#FAF9F6] border border-[#E5E2DC] rounded-lg">
            <div className="text-xs font-medium text-[#6B6862] mb-1">
              Deterministic Risk Equation ({ROLE_LABELS[report.role]} Multipliers · Ruleset v{report.ruleset_version})
            </div>
            <div
              data-testid="score-formula-equation"
              className="font-mono text-sm text-[#171715] break-words tabular-nums"
            >
              {formulaString}
            </div>
          </div>

          {report.breakdown.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#E5E2DC] text-xs font-semibold text-[#6B6862]">
                    <th className="py-2.5 pr-4">Triggered Rule</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Base Penalty</th>
                    <th className="py-2.5 px-3 text-right">Role Mult</th>
                    <th className="py-2.5 px-3 text-right">Confidence</th>
                    <th className="py-2.5 pl-3 text-right">Deducted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EDE6] tabular-nums">
                  {report.breakdown.map((item) => (
                    <tr key={item.rule_id} className="hover:bg-[#FAF9F6]">
                      <td className="py-3 pr-4">
                        <div className="font-medium text-[#171715]">{item.title}</div>
                        <div className="text-xs font-mono text-[#6B6862]">
                          {item.rule_id}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-xs text-[#575550] whitespace-nowrap">
                        {CATEGORY_LABELS[item.category]}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[#575550]">
                        {item.base_penalty}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[#575550]">
                        {item.role_multiplier.toFixed(2)}×
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[#575550]">
                        {item.eval.confidence} ({item.confidence_factor.toFixed(1)}×)
                      </td>
                      <td className="py-3 pl-3 text-right font-mono font-semibold text-[#B91C1C]">
                        -{item.deducted_points} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[#D6D2C9] bg-[#FAF9F6] font-semibold text-[#171715] tabular-nums">
                    <td colSpan={5} className="py-3 px-3 text-right text-xs">
                      Base {report.base_score} − Total Deducted ({report.total_deducted}) = Final Safety Score
                    </td>
                    <td className="py-3 pl-3 text-right font-mono text-base">
                      {report.safety_score} / 100
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="text-sm text-[#575550]">
              Zero penalty rules triggered. Full baseline score of 100 preserved.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
