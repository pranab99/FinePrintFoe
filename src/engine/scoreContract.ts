import rulesetData from '../rules/ruleset.v1.json' with { type: 'json' };
import type {
  BreakdownItem,
  ConfidenceLevel,
  DocType,
  FilterTabKey,
  RiskGrade,
  RiskReport,
  RuleCategory,
  RuleEval,
  Ruleset,
  UserRole,
} from '../types/contract';

export const ruleset = rulesetData as Ruleset;

export const CONFIDENCE_WEIGHT: Record<ConfidenceLevel, number> = {
  high: 1.0,
  medium: 0.7,
  low: 0.4,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  consumer: 'Consumer',
  freelancer: 'Freelancer',
  tenant: 'Tenant',
  business: 'Business',
};

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  saas_terms: 'SaaS Subscription Terms',
  lease_agreement: 'Residential / Commercial Lease',
  freelance_contract: 'Freelance SOW / Contractor Agreement',
  insurance_policy: 'Insurance Policy',
  general_terms: 'General Terms & Conditions',
};

const CATEGORY_TO_FILTER_GROUP: Record<RuleCategory, Exclude<FilterTabKey, 'all'>> = {
  money_traps: 'money_traps',
  exit_lock_in: 'exit_lock_in',
  liability_ip: 'liability_ip',
  ambiguity_control: 'dispute_control',
  dispute_rights: 'dispute_control',
  missing_protection: 'missing_protection',
};

const SHORT_RULE_LABELS: Record<string, string> = {
  R01_AUTO_RENEW_LOCK: 'Auto-Renewal',
  R02_ONE_SIDED_PRICE_HIKE: 'Price Hike',
  R03_NO_REFUND_LOCKIN: 'No-Refund Lock-In',
  R04_ASYMMETRIC_LIABILITY: 'Liability Cap',
  R05_SWEEPING_IP_GRAB: 'IP Grab',
  R06_SOLE_DISCRETION: 'Sole Discretion',
  R07_FORCED_ARBITRATION_VENUE: 'Forced Arbitration',
  R08_MISSING_EXIT_OR_PAYMENT: 'Missing Terms',
};

export const CATEGORY_LABELS: Record<RuleCategory, string> = {
  exit_lock_in: 'Exit & Lock-In',
  money_traps: 'Money Traps',
  liability_ip: 'Liability & IP',
  ambiguity_control: 'Ambiguity & Control',
  dispute_rights: 'Dispute Rights',
  missing_protection: 'Missing Protections',
};

export const FILTER_TABS: Array<{ key: FilterTabKey; label: string }> = [
  { key: 'all', label: 'All Flags' },
  { key: 'money_traps', label: 'Money Traps' },
  { key: 'exit_lock_in', label: 'Exit & Lock-In' },
  { key: 'liability_ip', label: 'Liability & IP' },
  { key: 'dispute_control', label: 'Dispute & Control' },
  { key: 'missing_protection', label: 'Missing Protections' },
];

export function calculateRiskReport(evaluations: RuleEval[], role: UserRole): RiskReport {
  let score = ruleset.base_score;
  let totalDeducted = 0;
  const breakdown: BreakdownItem[] = [];
  const seenRuleIds = new Set<string>();

  for (const ev of evaluations) {
    if (!ev.triggered) continue;
    if (seenRuleIds.has(ev.rule_id)) continue;

    const rule = ruleset.rules.find((r) => r.id === ev.rule_id);
    if (!rule) continue;

    seenRuleIds.add(ev.rule_id);

    const roleMult = rule.role_multipliers[role] ?? 1.0;
    const confFactor = CONFIDENCE_WEIGHT[ev.confidence] ?? 0.7;
    const deducted = Math.round(rule.penalty * roleMult * confFactor);

    totalDeducted += deducted;
    score = Math.max(0, score - deducted);

    breakdown.push({
      rule_id: rule.id,
      title: rule.title,
      short_label: SHORT_RULE_LABELS[rule.id] ?? rule.title,
      category: rule.category,
      filter_group: CATEGORY_TO_FILTER_GROUP[rule.category],
      fair_baseline: rule.fair_baseline,
      base_penalty: rule.penalty,
      role_multiplier: roleMult,
      confidence_factor: confFactor,
      deducted_points: deducted,
      severity: deducted >= 18 ? 'high' : deducted >= 12 ? 'medium' : 'low',
      eval: ev,
    });
  }

  breakdown.sort((a, b) => b.deducted_points - a.deducted_points);

  const risk_grade: RiskGrade =
    score >= 80 ? 'LOW RISK' : score >= 55 ? 'MODERATE RISK' : 'HIGH RISK';

  return {
    ruleset_version: ruleset.version,
    ruleset_name: ruleset.name,
    base_score: ruleset.base_score,
    role,
    safety_score: score,
    risk_grade,
    flags_triggered: breakdown.length,
    total_deducted: totalDeducted,
    breakdown,
  };
}

export function formatScoreFormula(report: RiskReport): string {
  if (report.breakdown.length === 0) {
    return `${report.base_score} (No penalties triggered) = ${report.safety_score}`;
  }
  const terms = report.breakdown.map(
    (item) => `${item.deducted_points} [${item.short_label}]`
  );
  const rawResult = report.base_score - report.total_deducted;
  const suffix =
    rawResult < 0
      ? `= ${report.safety_score} (floored at 0 from ${rawResult})`
      : `= ${report.safety_score}`;
  return `${report.base_score} - ${terms.join(' - ')} ${suffix}`;
}

export function filterBreakdownByTab(
  breakdown: BreakdownItem[],
  tab: FilterTabKey
): BreakdownItem[] {
  if (tab === 'all') return breakdown;
  return breakdown.filter((item) => item.filter_group === tab);
}

export function getTabCounts(breakdown: BreakdownItem[]): Record<FilterTabKey, number> {
  const counts: Record<FilterTabKey, number> = {
    all: breakdown.length,
    money_traps: 0,
    exit_lock_in: 0,
    liability_ip: 0,
    dispute_control: 0,
    missing_protection: 0,
  };

  for (const item of breakdown) {
    counts[item.filter_group] += 1;
  }

  return counts;
}

export function buildPushbackEmail(
  report: RiskReport,
  docType: DocType
): string {
  if (report.breakdown.length === 0) {
    return `Hello,\n\nI reviewed the ${DOC_TYPE_LABELS[docType].toLowerCase()} and the terms look aligned with standard fair-terms baselines. I'm ready to move forward once you confirm the final execution copy.\n\nBest regards,`;
  }

  const numberedQuestions = report.breakdown
    .map(
      (item, idx) =>
        `${idx + 1}. ${item.title} (${item.short_label}):\n   ${item.eval.pushback_question}`
    )
    .join('\n\n');

  return `Hello,\n\nThank you for sending over the ${DOC_TYPE_LABELS[docType].toLowerCase()}. Before I can sign, I'd like to clarify and request reasonable adjustments on ${report.breakdown.length} point${report.breakdown.length === 1 ? '' : 's'} so the agreement aligns with standard mutual terms:\n\n${numberedQuestions}\n\nPlease let me know if we can update these sections in a revised draft or addendum.\n\nBest regards,`;
}
