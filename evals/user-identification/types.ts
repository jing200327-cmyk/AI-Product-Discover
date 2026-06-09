export type Difficulty = "easy" | "medium" | "hard";

export type Confidence = "low" | "medium" | "high";

export type MvpPriority = "low" | "medium" | "high";

export type UserIdentificationEvalCase = {
  case_id: string;
  case_name: string;
  difficulty: Difficulty;
  raw_idea: string;
  extra_context: string;
  test_focus: string;
  expected_user_segments: Array<{
    segment_name: string;
    user_identity: string;
    current_stage: string;
    main_goal: string;
    confidence: Confidence;
    mvp_priority: MvpPriority;
  }>;
  expected_core_user: {
    segment_name: string;
    reason: string;
    allow_uncertain?: boolean;
    acceptable_alternatives?: string[];
  };
  expected_role_mapping: {
    user: string;
    buyer: string;
    decision_maker: string;
    beneficiary: string;
  };
  key_risks_to_identify: string[];
  expected_clarifying_questions: string[];
  common_bad_outputs: string[];
  scoring_notes: string;
};

export type EvalMetric = {
  metric_id: string;
  metric_name: string;
  metric_description: string;
  weight: number;
  score_1_description: string;
  score_3_description: string;
  score_5_description: string;
  failure_examples: string[];
};

export type JudgeResult = {
  case_id: string;
  metric_scores: Array<{
    metric_id: string;
    score: 1 | 2 | 3 | 4 | 5;
    reason: string;
    evidence: string;
  }>;
  veto_triggered: boolean;
  veto_reasons: string[];
  main_failures: string[];
  prompt_optimization_suggestions: string[];
};

export type ParsedAgentOutput = {
  has_json: boolean;
  json_parseable: boolean;
  has_required_fields: boolean;
  parsed_json?: unknown;
  missing_fields: string[];
  clarifying_question_count?: number;
};

export type AutomaticRuleResult = {
  parsed_output: ParsedAgentOutput;
  veto_triggered: boolean;
  veto_reasons: string[];
  m09_max_score?: 1 | 2 | 3 | 4 | 5;
  m10_max_score?: 1 | 2 | 3 | 4 | 5;
  rule_findings: string[];
};

export type EvalCaseResult = {
  case_id: string;
  case_name: string;
  difficulty: Difficulty;
  raw_idea: string;
  agent_output: string;
  judge_result: JudgeResult;
  case_weighted_score: number;
  case_score_1_to_5: number;
  veto_triggered: boolean;
  veto_reasons: string[];
};

export type MetricAverage = {
  metric_id: string;
  metric_name: string;
  average_score: number;
  weight: number;
};

export type EvalReport = {
  run_id: string;
  run_time: string;
  total_cases: number;
  overall_average: number;
  difficulty_weighted_average: number;
  final_verdict: string;
  veto_case_count: number;
  cases: EvalCaseResult[];
  metric_averages: MetricAverage[];
  key_findings: string[];
  prompt_optimization_suggestions: string[];
};
