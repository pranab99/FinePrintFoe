import { BookOpen } from 'lucide-react';

interface HeaderProps {
  rulesetVersion: string;
  onOpenRuleset: () => void;
  hasResults: boolean;
  onJumpToSection: (sectionId: string) => void;
}

export function Header({
  rulesetVersion,
  onOpenRuleset,
  hasResults,
  onJumpToSection,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#F8F7F4]/95 backdrop-blur-sm border-b border-[#E5E2DC]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="font-serif text-xl font-semibold tracking-tight text-[#171715] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] rounded"
        >
          FinePrintFoe
        </a>

        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-[#575550]"
        >
          <button
            type="button"
            onClick={() => onJumpToSection('input-stage')}
            className="hover:text-[#171715] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] rounded px-1 py-0.5"
          >
            Analyze
          </button>
          <button
            type="button"
            onClick={() => onJumpToSection('sample-contracts')}
            className="hover:text-[#171715] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] rounded px-1 py-0.5"
          >
            Sample Contracts
          </button>
          {hasResults && (
            <button
              type="button"
              onClick={() => onJumpToSection('results-dashboard')}
              className="hover:text-[#171715] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] rounded px-1 py-0.5"
            >
              Risk Report
            </button>
          )}
          <button
            type="button"
            onClick={() => onJumpToSection('methodology')}
            className="hover:text-[#171715] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] rounded px-1 py-0.5"
          >
            Risk Math
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenRuleset}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#171715] bg-white border border-[#D6D2C9] rounded-lg hover:border-[#171715] hover:bg-[#FAF9F7] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A]"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#1E3A8A]" aria-hidden="true" />
            <span>Ruleset v{rulesetVersion.replace(/\.0$/, '')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
