import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPushbackEmail,
  calculateRiskReport,
  filterBreakdownByTab,
  formatScoreFormula,
  getTabCounts,
} from './scoreContract';
import type { RuleEval } from '../types/contract';

function makeEval(
  rule_id: string,
  triggered: boolean,
  confidence: 'high' | 'medium' | 'low' = 'high'
): RuleEval {
  return {
    rule_id,
    triggered,
    confidence,
    extracted_metrics: triggered ? '60-day notice' : 'None',
    exact_quote: triggered ? 'Sample verbatim clause from contract.' : '',
    deviation_explanation: triggered ? 'Deviates from baseline.' : 'Meets baseline.',
    pushback_question: triggered ? `Can we revise ${rule_id}?` : '',
  };
}

test('returns 100 and LOW RISK when no rules are triggered', () => {
  const report = calculateRiskReport(
    [makeEval('R01_AUTO_RENEW_LOCK', false), makeEval('R02_ONE_SIDED_PRICE_HIKE', false)],
    'consumer'
  );
  assert.equal(report.safety_score, 100);
  assert.equal(report.risk_grade, 'LOW RISK');
  assert.equal(report.flags_triggered, 0);
  assert.equal(report.breakdown.length, 0);
  assert.equal(formatScoreFormula(report), '100 (No penalties triggered) = 100');
});

test('applies role multipliers and confidence weights deterministically', () => {
  // R01: penalty=20, consumer multiplier=1.2, high=1.0 -> round(20 * 1.2 * 1.0) = 24
  // R04: penalty=22, consumer multiplier=1.0, medium=0.7 -> round(22 * 1.0 * 0.7) = round(15.4) = 15
  // Total deducted = 39 -> safety_score = 61 -> MODERATE RISK
  const report = calculateRiskReport(
    [
      makeEval('R04_ASYMMETRIC_LIABILITY', true, 'medium'),
      makeEval('R01_AUTO_RENEW_LOCK', true, 'high'),
    ],
    'consumer'
  );

  assert.equal(report.safety_score, 61);
  assert.equal(report.risk_grade, 'MODERATE RISK');
  assert.equal(report.flags_triggered, 2);
  // Sorted descending by deducted points
  assert.equal(report.breakdown[0].rule_id, 'R01_AUTO_RENEW_LOCK');
  assert.equal(report.breakdown[0].deducted_points, 24);
  assert.equal(report.breakdown[0].severity, 'high');
  assert.equal(report.breakdown[1].rule_id, 'R04_ASYMMETRIC_LIABILITY');
  assert.equal(report.breakdown[1].deducted_points, 15);
  assert.equal(report.breakdown[1].severity, 'medium');

  assert.equal(
    formatScoreFormula(report),
    '100 - 24 [Auto-Renewal] - 15 [Liability Cap] = 61'
  );
});

test('computes HIGH RISK and floors safety score at 0 when deductions exceed 100', () => {
  // Freelancer multipliers: R04=1.3 (29), R05=1.4 (31), R08=1.35 (20), R06=1.25 (15), R03=1.1 (20) => 115
  const report = calculateRiskReport(
    [
      makeEval('R03_NO_REFUND_LOCKIN', true, 'high'),
      makeEval('R04_ASYMMETRIC_LIABILITY', true, 'high'),
      makeEval('R05_SWEEPING_IP_GRAB', true, 'high'),
      makeEval('R06_SOLE_DISCRETION', true, 'high'),
      makeEval('R08_MISSING_EXIT_OR_PAYMENT', true, 'high'),
    ],
    'freelancer'
  );

  assert.equal(report.safety_score, 0);
  assert.equal(report.risk_grade, 'HIGH RISK');
  assert.equal(report.total_deducted, 115);
  assert.match(formatScoreFormula(report), /floored at 0 from -15/);
});

test('deduplicates repeated rule IDs and maps categories to filter tabs', () => {
  const report = calculateRiskReport(
    [
      makeEval('R06_SOLE_DISCRETION', true, 'low'), // ambiguity_control -> dispute_control (round(12*1*0.4)=5 -> low severity)
      makeEval('R06_SOLE_DISCRETION', true, 'high'), // duplicate ignored
      makeEval('R07_FORCED_ARBITRATION_VENUE', true, 'high'), // dispute_rights -> dispute_control
      makeEval('R02_ONE_SIDED_PRICE_HIKE', true, 'high'), // money_traps
    ],
    'business'
  );

  assert.equal(report.flags_triggered, 3);
  const counts = getTabCounts(report.breakdown);
  assert.equal(counts.all, 3);
  assert.equal(counts.dispute_control, 2);
  assert.equal(counts.money_traps, 1);
  assert.equal(counts.exit_lock_in, 0);

  const disputeItems = filterBreakdownByTab(report.breakdown, 'dispute_control');
  assert.equal(disputeItems.length, 2);
});

test('buildPushbackEmail compiles all triggered questions in severity order', () => {
  const report = calculateRiskReport(
    [
      makeEval('R01_AUTO_RENEW_LOCK', true, 'high'),
      makeEval('R02_ONE_SIDED_PRICE_HIKE', true, 'high'),
    ],
    'consumer'
  );

  const email = buildPushbackEmail(report, 'saas_terms');
  assert.match(email, /saas subscription terms/i);
  assert.match(email, /1\. Silent or Long-Window Auto-Renewal/);
  assert.match(email, /2\. Unilateral Price or Fee Increases/);
  assert.match(email, /Can we revise R01_AUTO_RENEW_LOCK\?/);
});
