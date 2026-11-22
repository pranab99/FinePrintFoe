import { useMemo, useState } from 'react';
import { Header } from './components/Header';
import { InputStage } from './components/InputStage';
import { ResultsDashboard } from './components/ResultsDashboard';
import { RulesetModal } from './components/RulesetModal';
import { SAMPLE_CONTRACTS } from './data/samples';
import { calculateRiskReport, ruleset } from './engine/scoreContract';
import type {
  AnalyzeApiResponse,
  GeminiContractAnalysis,
  UserRole,
} from './types/contract';

export default function App() {
  const [role, setRole] = useState<UserRole>('consumer');
  const [contractText, setContractText] = useState<string>('');
  const [activeSampleId, setActiveSampleId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<GeminiContractAnalysis | null>(null);
  const [isRulesetOpen, setIsRulesetOpen] = useState(false);

  const report = useMemo(() => {
    if (!analysis) return null;
    return calculateRiskReport(analysis.evaluations, role);
  }, [analysis, role]);

  function handleSelectSample(sampleId: string) {
    const sample = SAMPLE_CONTRACTS.find((s) => s.id === sampleId);
    if (!sample) return;
    setContractText(sample.text);
    setRole(sample.recommendedRole);
    setActiveSampleId(sample.id);
    setErrorMessage(null);
  }

  function handleContractTextChange(text: string) {
    setContractText(text);
    const matchingSample = SAMPLE_CONTRACTS.find((s) => s.text === text);
    setActiveSampleId(matchingSample ? matchingSample.id : null);
  }

  async function handleAnalyze() {
    const trimmed = contractText.trim();
    if (trimmed.length < 30) {
      setErrorMessage(
        'Please paste at least 30 characters of contract text or select a sample contract above.'
      );
      return;
    }

    setErrorMessage(null);
    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed, role }),
      });

      const data = (await response.json()) as Partial<AnalyzeApiResponse> & {
        error?: string;
      };

      if (!response.ok || !data.analysis) {
        throw new Error(
          data.error || 'Unable to complete contract analysis. Please try again.'
        );
      }

      setAnalysis(data.analysis);

      window.setTimeout(() => {
        document
          .getElementById('results-dashboard')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unexpected network error.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleReset() {
    setAnalysis(null);
    setErrorMessage(null);
    document
      .getElementById('input-stage')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleJumpToSection(sectionId: string) {
    if (sectionId === 'methodology' && !analysis) {
      setIsRulesetOpen(true);
      return;
    }
    document
      .getElementById(sectionId)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#F8F7F4] text-[#171715]">
      <Header
        rulesetVersion={ruleset.version}
        onOpenRuleset={() => setIsRulesetOpen(true)}
        hasResults={Boolean(analysis && report)}
        onJumpToSection={handleJumpToSection}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-10">
        {/* Editorial Intro */}
        <section className="max-w-3xl space-y-3">
          <p className="text-xs font-medium text-[#6B6862]">
            {ruleset.name} · Deterministic Contract Auditor
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-[2.65rem] font-semibold tracking-tight text-[#171715] leading-[1.15] [text-wrap:balance]">
            Benchmark any contract against fair-terms rules — with transparent risk math
          </h1>
          <p className="text-base text-[#575550] leading-relaxed max-w-2xl">
            Paste a SaaS agreement, freelance SOW, or apartment lease. Clauses are extracted verbatim against 8 open fairness baselines, then scored with auditable role-weighted math.
          </p>
        </section>

        {/* Input Stage */}
        <InputStage
          role={role}
          onRoleChange={setRole}
          contractText={contractText}
          onContractTextChange={handleContractTextChange}
          activeSampleId={activeSampleId}
          onSelectSample={handleSelectSample}
          onAnalyze={() => void handleAnalyze()}
          isAnalyzing={isAnalyzing}
          errorMessage={errorMessage}
          onError={setErrorMessage}
        />

        {/* Loading Skeleton */}
        {isAnalyzing && (
          <section
            aria-live="polite"
            aria-label="Analyzing contract"
            className="bg-white border border-[#E5E2DC] rounded-xl p-8 space-y-4"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="h-5 w-56 bg-[#EFECE6] rounded animate-pulse" />
                <div className="h-4 w-80 bg-[#F3F1EC] rounded animate-pulse" />
              </div>
              <div className="h-12 w-12 rounded-full bg-[#EFECE6] animate-pulse" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="h-28 bg-[#FAF9F6] border border-[#EFECE6] rounded-lg animate-pulse" />
              <div className="h-28 bg-[#FAF9F6] border border-[#EFECE6] rounded-lg animate-pulse" />
            </div>
          </section>
        )}

        {/* Results Dashboard */}
        {!isAnalyzing && analysis && report && (
          <ResultsDashboard
            analysis={analysis}
            report={report}
            onRoleChange={setRole}
            onReset={handleReset}
          />
        )}
      </main>

      <footer className="border-t border-[#E5E2DC] bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#6B6862]">
          <p className="leading-relaxed">
            FinePrintFoe highlights contractual deviations against a baseline rubric for informational purposes and is not legal advice.
          </p>
          <button
            type="button"
            onClick={() => setIsRulesetOpen(true)}
            className="font-medium text-[#1E3A8A] hover:underline whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] rounded"
          >
            View Ruleset v{ruleset.version}
          </button>
        </div>
      </footer>

      <RulesetModal
        isOpen={isRulesetOpen}
        onClose={() => setIsRulesetOpen(false)}
      />
    </div>
  );
}
