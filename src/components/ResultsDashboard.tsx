import { useState } from 'react';
import { Check, CheckCircle2, Mail, RotateCcw } from 'lucide-react';
import {
  DOC_TYPE_LABELS,
  FILTER_TABS,
  ROLE_LABELS,
  buildPushbackEmail,
  filterBreakdownByTab,
  getTabCounts,
} from '../engine/scoreContract';
import type {
  FilterTabKey,
  GeminiContractAnalysis,
  RiskReport,
  UserRole,
} from '../types/contract';
import { RedFlagCard } from './RedFlagCard';
import { ScoreGauge } from './ScoreGauge';
import { ScoreMathInspector } from './ScoreMathInspector';

interface ResultsDashboardProps {
  analysis: GeminiContractAnalysis;
  report: RiskReport;
  onRoleChange: (role: UserRole) => void;
  onReset: () => void;
}

const ROLES: UserRole[] = ['consumer', 'freelancer', 'tenant', 'business'];

export function ResultsDashboard({
  analysis,
  report,
  onRoleChange,
  onReset,
}: ResultsDashboardProps) {
  const [activeTab, setActiveTab] = useState<FilterTabKey>('all');
  const [copiedEmail, setCopiedEmail] = useState(false);

  const tabCounts = getTabCounts(report.breakdown);
  const filteredItems = filterBreakdownByTab(report.breakdown, activeTab);

  async function handleCopyFullEmail() {
    const emailDraft = buildPushbackEmail(report, analysis.detected_doc_type);
    try {
      await navigator.clipboard.writeText(emailDraft);
      setCopiedEmail(true);
      window.setTimeout(() => setCopiedEmail(false), 2500);
    } catch {
      // Ignore clipboard permission errors in restricted contexts
    }
  }

  return (
    <section
      id="results-dashboard"
      aria-label="Contract Risk Analysis Results"
      className="scroll-mt-24 space-y-6"
    >
      {/* Hero Score Card */}
      <div className="bg-white border border-[#E5E2DC] rounded-xl p-6 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-4 flex flex-col items-center justify-center lg:border-r lg:border-[#EFECE6] lg:pr-8">
            <ScoreGauge score={report.safety_score} grade={report.risk_grade} />
            <div className="mt-4 text-xs text-[#6B6862] tabular-nums">
              {report.flags_triggered} of 8 rules triggered · -{report.total_deducted} pts total
            </div>
          </div>

          <div className="lg:col-span-8 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#6B6862]">
                <span className="font-semibold text-[#171715]">
                  {DOC_TYPE_LABELS[analysis.detected_doc_type]}
                </span>
                <span className="hidden sm:inline" aria-hidden="true">·</span>
                <span>Evaluated for {ROLE_LABELS[report.role]}</span>
                <span className="hidden sm:inline" aria-hidden="true">·</span>
                <span>Ruleset v{report.ruleset_version}</span>
              </div>

              <div className="inline-flex items-center gap-1 p-1 bg-[#F3F1EC] rounded-lg">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={report.role === r}
                    onClick={() => onRoleChange(r)}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] ${
                      report.role === r
                        ? 'bg-white text-[#171715] shadow-xs'
                        : 'text-[#575550] hover:text-[#171715]'
                    }`}
                  >
                    {ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-serif text-2xl font-semibold text-[#171715]">
                What You&apos;re Actually Agreeing To
              </h2>
              <p className="mt-2.5 text-[15px] text-[#2D2C29] leading-relaxed max-w-prose">
                {analysis.plain_summary}
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleCopyFullEmail()}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#1E3A8A] hover:bg-[#172E6E] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1E3A8A]"
              >
                {copiedEmail ? (
                  <>
                    <Check className="w-4 h-4" aria-hidden="true" />
                    <span>Copied Full Pushback Email</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" aria-hidden="true" />
                    <span>Copy Full Pushback Email</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#171715] bg-[#FAF9F6] border border-[#D6D2C9] hover:bg-[#EFECE6] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A]"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Analyze Another Document</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Score Math Inspector */}
      <ScoreMathInspector report={report} />

      {/* Category Filter Tabs */}
      {report.breakdown.length > 0 ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-serif text-xl font-semibold text-[#171715]">
              Triggered Clause Deviations
            </h2>

            <div
              role="tablist"
              aria-label="Filter red flags by category"
              className="flex flex-wrap items-center gap-1 p-1 bg-[#EFECE6] rounded-lg"
            >
              {FILTER_TABS.map((tab) => {
                const isSelected = activeTab === tab.key;
                const count = tabCounts[tab.key];
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] ${
                      isSelected
                        ? 'bg-white text-[#171715] shadow-xs'
                        : 'text-[#575550] hover:text-[#171715]'
                    }`}
                  >
                    {tab.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {filteredItems.length > 0 ? (
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <RedFlagCard key={item.rule_id} item={item} />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-[#E5E2DC] rounded-xl p-8 text-center space-y-3">
              <p className="text-sm text-[#575550]">
                No deviations triggered in this category.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className="px-4 py-2 text-xs font-semibold text-[#1E3A8A] bg-[#F3F6FC] rounded-lg hover:bg-[#E7EEFA] transition-colors cursor-pointer"
              >
                Show All Flags ({tabCounts.all})
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-[#DCE7DE] rounded-xl p-8 text-center space-y-2">
          <CheckCircle2
            className="w-8 h-8 text-[#15803D] mx-auto"
            aria-hidden="true"
          />
          <h3 className="font-serif text-xl font-medium text-[#171715]">
            No Fair-Terms Deviations Triggered
          </h3>
          <p className="text-sm text-[#575550] max-w-lg mx-auto leading-relaxed">
            None of the 8 baseline trap triggers were found in the submitted text. Review the plain-English summary above before signing.
          </p>
        </div>
      )}
    </section>
  );
}
