import { useEffect, useState } from 'react';
import type { RiskGrade } from '../types/contract';

interface ScoreGaugeProps {
  score: number;
  grade: RiskGrade;
}

const GRADE_STYLE: Record<
  RiskGrade,
  { stroke: string; track: string; text: string; bg: string; border: string; label: string }
> = {
  'LOW RISK': {
    stroke: '#15803D',
    track: '#E6F0E8',
    text: 'text-[#15803D]',
    bg: 'bg-[#F4F9F5]',
    border: 'border-[#CDE3D2]',
    label: 'LOW RISK',
  },
  'MODERATE RISK': {
    stroke: '#B45309',
    track: '#F5EBD8',
    text: 'text-[#B45309]',
    bg: 'bg-[#FEF9F2]',
    border: 'border-[#F3DFBF]',
    label: 'MODERATE RISK',
  },
  'HIGH RISK': {
    stroke: '#B91C1C',
    track: '#F6E2E2',
    text: 'text-[#B91C1C]',
    bg: 'bg-[#FDF7F7]',
    border: 'border-[#F2DCDC]',
    label: 'HIGH RISK',
  },
};

export function ScoreGauge({ score, grade }: ScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const style = GRADE_STYLE[grade];

  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, animatedScore));
  const visualPercent = clamped === 0 && score === 0 ? 4 : clamped;
  const strokeDashoffset = circumference - (visualPercent / 100) * circumference;

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setAnimatedScore(score);
      return;
    }

    const start = performance.now();
    const duration = 650;
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(score * eased));
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [score]);

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="relative w-40 h-40 flex items-center justify-center">
        <svg
          className="w-40 h-40 -rotate-90"
          viewBox="0 0 160 160"
          role="img"
          aria-label={`Safety score ${score} out of 100, ${grade}`}
        >
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={style.track}
            strokeWidth="12"
          />
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={style.stroke}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            data-testid="safety-score-value"
            className="font-serif text-4xl font-semibold text-[#171715] tabular-nums leading-none"
          >
            {animatedScore}
          </span>
          <span className="text-xs font-mono text-[#6B6862] mt-1 tabular-nums">
            / 100
          </span>
        </div>
      </div>

      <div
        data-testid="risk-grade-label"
        className={`mt-3 px-3.5 py-1 rounded-md border text-xs font-bold tracking-wide whitespace-nowrap ${style.bg} ${style.border} ${style.text}`}
      >
        {style.label}
      </div>
    </div>
  );
}
