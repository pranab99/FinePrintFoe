export type UserRole = 'consumer' | 'freelancer' | 'tenant' | 'business';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type DocType =
  | 'saas_terms'
  | 'lease_agreement'
  | 'freelance_contract'
  | 'insurance_policy'
  | 'general_terms';

export type RuleCategory =
  | 'exit_lock_in'
  | 'money_traps'
  | 'liability_ip'
  | 'ambiguity_control'
  | 'dispute_rights'
  | 'missing_protection';

export type FilterTabKey =
  | 'all'
  | 'money_traps'
  | 'exit_lock_in'
  | 'liability_ip'
  | 'dispute_control'
  | 'missing_protection';

export interface RuleDefinition {
  id: string;
  category: RuleCategory;
  title: string;
  fair_baseline: string;
  flaw_trigger: string;
  penalty: number;
  role_multipliers: Record<UserRole, number>;
}

export interface Ruleset {
  version: string;
  name: string;
  base_score: number;
  rules: RuleDefinition[];
}

export interface RuleEval {
  rule_id: string;
  triggered: boolean;
  confidence: ConfidenceLevel;
  extracted_metrics: string;
  exact_quote: string;
  deviation_explanation: string;
  pushback_question: string;
}

export interface GeminiContractAnalysis {
  detected_doc_type: DocType;
  plain_summary: string;
  evaluations: RuleEval[];
}

export interface BreakdownItem {
  rule_id: string;
  title: string;
  short_label: string;
  category: RuleCategory;
  filter_group: Exclude<FilterTabKey, 'all'>;
  fair_baseline: string;
  base_penalty: number;
  role_multiplier: number;
  confidence_factor: number;
  deducted_points: number;
  severity: 'high' | 'medium' | 'low';
  eval: RuleEval;
}

export type RiskGrade = 'LOW RISK' | 'MODERATE RISK' | 'HIGH RISK';

export interface RiskReport {
  ruleset_version: string;
  ruleset_name: string;
  base_score: number;
  role: UserRole;
  safety_score: number;
  risk_grade: RiskGrade;
  flags_triggered: number;
  total_deducted: number;
  breakdown: BreakdownItem[];
}

export interface AnalyzeApiResponse {
  analysis: GeminiContractAnalysis;
  report: RiskReport;
}

export interface SampleContract {
  id: string;
  label: string;
  subtitle: string;
  recommendedRole: UserRole;
  text: string;
}
