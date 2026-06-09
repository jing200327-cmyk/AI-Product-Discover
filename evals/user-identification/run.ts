import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { inputParserNode } from "../../packages/agent-core/nodes/inputParserNode";
import type {
  AgentNodeDeps,
  LlmProvider,
  ModelRouter
} from "../../packages/agent-core/nodes/types";
import { createInitialAgentState } from "../../packages/agent-core/state/createInitialState";
import { loadLocalEnv } from "../../packages/agent-core/demo/loadLocalEnv";
import { createDefaultToolRegistry } from "../../packages/agent-core/tools";
import type { AgentState } from "../../packages/shared/types";
import { userIdentificationEvalCases } from "./cases";
import { buildJudgePrompt } from "./judgePrompt";
import { assertRubricWeights, evalMetrics } from "./rubric";
import { generateMarkdownReport } from "./report";
import type {
  AutomaticRuleResult,
  Difficulty,
  EvalCaseResult,
  EvalMetric,
  EvalReport,
  JudgeResult,
  ParsedAgentOutput,
  UserIdentificationEvalCase
} from "./types";

type DeepSeekResponseBody = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

type StrictDeepSeekInput = {
  prompt: string;
  model: string;
  responseFormatJson: boolean;
  maxTokens?: number;
  temperature?: number;
  retries?: number;
};

type CapturedOutput = {
  value: string;
};

const requiredStructuredFields = [
  "step",
  "raw_idea_summary",
  "explicit_user_info",
  "inferred_user_segments",
  "recommended_core_user",
  "role_mapping",
  "user_definition_risks",
  "clarifying_questions",
  "ready_for_next_step",
  "next_step"
];

const difficultyWeights: Record<Difficulty, number> = {
  easy: 0.8,
  medium: 1,
  hard: 1.2
};

const scoreByThreshold = (average: number): string => {
  if (average >= 4.2) {
    return "优秀，可以进入下一阶段";
  }

  if (average >= 3.7) {
    return "基本可用，需要小幅优化";
  }

  if (average >= 3.0) {
    return "质量不稳定，需要重新优化 Prompt";
  }

  return "不通过，需要重写 Prompt";
};

const clampScore = (score: unknown): 1 | 2 | 3 | 4 | 5 => {
  const numericScore = typeof score === "number" ? Math.round(score) : 1;
  const clamped = Math.min(5, Math.max(1, numericScore));

  return clamped as 1 | 2 | 3 | 4 | 5;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

const parseJsonObject = (text: string): unknown => JSON.parse(text);

const stripJsonFence = (text: string): string =>
  text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

const extractJsonCandidate = (text: string): string | null => {
  const fenceMatches = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)];
  const reversedMatches = fenceMatches.reverse();

  for (const match of reversedMatches) {
    const candidate = match[1]?.trim();

    if (candidate?.startsWith("{")) {
      return candidate;
    }
  }

  const stripped = stripJsonFence(text);

  if (stripped.startsWith("{") && stripped.endsWith("}")) {
    return stripped;
  }

  const stepIndex = stripped.lastIndexOf('"step"');
  const start = stepIndex >= 0 ? stripped.lastIndexOf("{", stepIndex) : stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");

  if (start >= 0 && end > start) {
    return stripped.slice(start, end + 1);
  }

  return null;
};

const parseAgentOutput = (agentOutput: string): ParsedAgentOutput => {
  const candidate = extractJsonCandidate(agentOutput);

  if (!candidate) {
    return {
      has_json: false,
      json_parseable: false,
      has_required_fields: false,
      missing_fields: requiredStructuredFields
    };
  }

  try {
    const parsedJson = parseJsonObject(candidate);
    const record = asRecord(parsedJson);
    const missingFields = record
      ? requiredStructuredFields.filter((field) => !(field in record))
      : requiredStructuredFields;
    const clarifyingQuestions = record
      ? record.clarifying_questions
      : undefined;

    return {
      has_json: true,
      json_parseable: true,
      has_required_fields: missingFields.length === 0,
      parsed_json: parsedJson,
      missing_fields: missingFields,
      clarifying_question_count: Array.isArray(clarifyingQuestions)
        ? clarifyingQuestions.length
        : undefined
    };
  } catch {
    return {
      has_json: true,
      json_parseable: false,
      has_required_fields: false,
      missing_fields: requiredStructuredFields
    };
  }
};

const containsBroadUserLabel = (value: string): boolean =>
  ["所有人", "普通用户", "企业用户", "年轻人", "学生", "大众用户"].some((label) =>
    value.includes(label)
  );

const getRecommendedCoreUserText = (parsedJson: unknown): string => {
  const record = asRecord(parsedJson);
  const coreUser = record ? asRecord(record.recommended_core_user) : null;

  if (!coreUser) {
    return "";
  }

  return [
    asString(coreUser.segment_name),
    asString(coreUser.definition),
    asString(coreUser.reason)
  ].join(" ");
};

const hasCompleteRoleMapping = (parsedJson: unknown): boolean => {
  const record = asRecord(parsedJson);
  const roleMapping = record ? asRecord(record.role_mapping) : null;

  if (!roleMapping) {
    return false;
  }

  return ["user", "buyer", "decision_maker", "beneficiary"].every(
    (field) => asString(roleMapping[field]).trim().length > 0
  );
};

const isB2bCase = (evalCase: UserIdentificationEvalCase): boolean =>
  [evalCase.raw_idea, evalCase.extra_context].some((text) =>
    /B 端|B端|企业|公司|采购|老板|主管|医院|工厂|HR|销售/.test(text)
  );

const evaluateAutomaticRules = (
  evalCase: UserIdentificationEvalCase,
  agentOutput: string
): AutomaticRuleResult => {
  const parsedOutput = parseAgentOutput(agentOutput);
  const vetoReasons: string[] = [];
  const ruleFindings: string[] = [];
  let m09MaxScore: 1 | 2 | 3 | 4 | 5 | undefined;
  let m10MaxScore: 1 | 2 | 3 | 4 | 5 | undefined;

  if (!parsedOutput.json_parseable) {
    vetoReasons.push("未输出可解析的结构化 JSON");
    m10MaxScore = 1;
  } else if (!parsedOutput.has_required_fields) {
    vetoReasons.push(`结构化 JSON 缺少字段：${parsedOutput.missing_fields.join(", ")}`);
    m10MaxScore = 2;
  }

  if (
    parsedOutput.clarifying_question_count === undefined ||
    parsedOutput.clarifying_question_count < 3
  ) {
    vetoReasons.push("未提出至少 3 个围绕用户识别的澄清问题");
  }

  const coreUserText = getRecommendedCoreUserText(parsedOutput.parsed_json);

  if (!coreUserText.trim()) {
    vetoReasons.push("没有输出 MVP 核心用户判断");
  } else if (containsBroadUserLabel(coreUserText)) {
    ruleFindings.push("核心用户定义存在宽泛标签，需要人工确认是否充分细分");
  }

  const hasExplicitImplicitDistinction =
    parsedOutput.has_required_fields ||
    (/明确|显性/.test(agentOutput) && /推断|隐性/.test(agentOutput));

  if (!hasExplicitImplicitDistinction) {
    vetoReasons.push("没有区分显性用户信息和推断用户信息");
  }

  if (isB2bCase(evalCase) && !hasCompleteRoleMapping(parsedOutput.parsed_json)) {
    vetoReasons.push("B 端场景没有有效区分使用者、购买者、决策者和受益者");
  }

  const offScopeHits = [
    /完整\s*PRD/,
    /技术架构/,
    /数据库/,
    /开发任务/,
    /商业模式/,
    /竞品分析/
  ].filter((pattern) => pattern.test(agentOutput)).length;

  if (offScopeHits >= 3) {
    ruleFindings.push("输出疑似越界进入 PRD、竞品、技术架构或商业模式");
    m09MaxScore = 3;
  }

  return {
    parsed_output: parsedOutput,
    veto_triggered: vetoReasons.length > 0,
    veto_reasons: vetoReasons,
    m09_max_score: m09MaxScore,
    m10_max_score: m10MaxScore,
    rule_findings: ruleFindings
  };
};

const mergeJudgeWithAutomaticRules = (
  judgeResult: JudgeResult,
  automaticRules: AutomaticRuleResult
): JudgeResult => {
  const metricScores = judgeResult.metric_scores.map((metric) => {
    if (metric.metric_id === "M09" && automaticRules.m09_max_score) {
      return {
        ...metric,
        score: Math.min(metric.score, automaticRules.m09_max_score) as 1 | 2 | 3 | 4 | 5,
        reason: `${metric.reason} 自动规则：范围控制分数上限 ${automaticRules.m09_max_score}。`
      };
    }

    if (metric.metric_id === "M10" && automaticRules.m10_max_score) {
      return {
        ...metric,
        score: Math.min(metric.score, automaticRules.m10_max_score) as 1 | 2 | 3 | 4 | 5,
        reason: `${metric.reason} 自动规则：结构化输出分数上限 ${automaticRules.m10_max_score}。`
      };
    }

    return metric;
  });

  return {
    ...judgeResult,
    metric_scores: metricScores,
    veto_triggered: judgeResult.veto_triggered || automaticRules.veto_triggered,
    veto_reasons: [
      ...new Set([...judgeResult.veto_reasons, ...automaticRules.veto_reasons])
    ],
    main_failures: [
      ...new Set([...judgeResult.main_failures, ...automaticRules.rule_findings])
    ]
  };
};

const calculateCaseWeightedScore = (
  judgeResult: JudgeResult,
  metrics: EvalMetric[]
): number => {
  const scoreMap = new Map(
    judgeResult.metric_scores.map((item) => [item.metric_id, item.score])
  );

  return metrics.reduce((total, metric) => {
    const score = scoreMap.get(metric.metric_id) ?? 1;

    return total + (score / 5) * metric.weight;
  }, 0);
};

const normalizeJudgeResult = (
  rawJson: unknown,
  evalCase: UserIdentificationEvalCase
): JudgeResult => {
  const record = asRecord(rawJson);
  const rawScores = Array.isArray(record?.metric_scores)
    ? record.metric_scores
    : [];
  const scoreRecords = rawScores
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item !== null);

  return {
    case_id: asString(record?.case_id, evalCase.case_id),
    metric_scores: evalMetrics.map((metric) => {
      const found = scoreRecords.find(
        (item) => asString(item.metric_id) === metric.metric_id
      );

      return {
        metric_id: metric.metric_id,
        score: clampScore(found?.score),
        reason: asString(found?.reason, "Judge 未返回该指标理由"),
        evidence: asString(found?.evidence, "Judge 未返回该指标证据")
      };
    }),
    veto_triggered: Boolean(record?.veto_triggered),
    veto_reasons: asStringArray(record?.veto_reasons),
    main_failures: asStringArray(record?.main_failures),
    prompt_optimization_suggestions: asStringArray(
      record?.prompt_optimization_suggestions
    )
  };
};

const extractDeepSeekText = (body: DeepSeekResponseBody): string => {
  const text = body.choices
    ?.map((choice) => choice.message?.content)
    .filter((content): content is string => typeof content === "string")
    .join("\n")
    .trim();

  if (text) {
    return text;
  }

  throw new Error(body.error?.message ?? "DeepSeek response did not include text output");
};

const describeFetchError = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return "Unknown fetch error";
  }

  const maybeCause = "cause" in error ? (error as { cause?: unknown }).cause : undefined;
  const causeMessage =
    maybeCause instanceof Error
      ? maybeCause.message
      : typeof maybeCause === "string"
        ? maybeCause
        : "";

  return causeMessage ? `${error.message}: ${causeMessage}` : error.message;
};

const callStrictDeepSeek = async ({
  prompt,
  model,
  responseFormatJson,
  maxTokens,
  temperature,
  retries
}: StrictDeepSeekInput): Promise<string> => {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is required for user-identification eval.");
  }

  const baseUrl = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
  const endpoint = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const maxAttempts = retries ?? 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let response: Response;

    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: responseFormatJson
                ? `${prompt}\n\n只输出合法 JSON，不要输出 Markdown。`
                : prompt
            }
          ],
          temperature: temperature ?? 0.1,
          max_tokens: maxTokens ?? 8192,
          stream: false,
          response_format: responseFormatJson ? { type: "json_object" } : undefined
        })
      });
    } catch (error) {
      lastError = new Error(
        `DeepSeek fetch failed for ${endpoint}: ${describeFetchError(error)}`
      );

      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        continue;
      }

      throw lastError;
    }

    const body = (await response.json()) as DeepSeekResponseBody;

    if (!response.ok) {
      lastError = new Error(
        body.error?.message ?? `DeepSeek request failed with ${response.status}`
      );

      if (response.status >= 500 && attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        continue;
      }

      throw lastError;
    }

    return extractDeepSeekText(body);
  }

  throw lastError ?? new Error(`DeepSeek request failed for ${endpoint}`);
};

const createEvalDeps = (capturedOutput: CapturedOutput): AgentNodeDeps => {
  const generationModel =
    process.env.EVAL_GENERATION_MODEL ??
    process.env.DEEPSEEK_MODEL_DEFAULT ??
    "deepseek-v4-flash";

  const llmProvider: LlmProvider = {
    complete: async ({ prompt }) => {
      const output = await callStrictDeepSeek({
        prompt,
        model: generationModel,
        responseFormatJson: false,
        maxTokens: 12000,
        temperature: 0.2,
        retries: 3
      });

      capturedOutput.value = output;

      return output;
    }
  };

  const modelRouter: ModelRouter = {
    selectModel: () => generationModel
  };

  return {
    llmProvider,
    modelRouter,
    toolRegistry: createDefaultToolRegistry(),
    traceLogger: {
      record: () => undefined
    }
  };
};

const createEvalState = (evalCase: UserIdentificationEvalCase): AgentState =>
  createInitialAgentState({
    idea: evalCase.raw_idea,
    constraints: evalCase.extra_context === "无" ? [] : [evalCase.extra_context]
  });

const runAgentForCase = async (
  evalCase: UserIdentificationEvalCase
): Promise<string> => {
  const capturedOutput: CapturedOutput = { value: "" };
  const state = createEvalState(evalCase);
  const nextState = await inputParserNode(state, createEvalDeps(capturedOutput));

  if (capturedOutput.value.trim()) {
    return capturedOutput.value;
  }

  if (nextState.context) {
    return JSON.stringify(nextState.context, null, 2);
  }

  return JSON.stringify({ errors: nextState.errors }, null, 2);
};

const judgeCase = async (
  evalCase: UserIdentificationEvalCase,
  agentOutput: string
): Promise<JudgeResult> => {
  const judgeModel =
    process.env.EVAL_JUDGE_MODEL ??
    process.env.DEEPSEEK_MODEL_EVAL ??
    "deepseek-v4-pro";
  const judgePrompt = buildJudgePrompt({
    evalCase,
    metrics: evalMetrics,
    agentOutput
  });
  const judgeText = await callStrictDeepSeek({
    prompt: judgePrompt,
    model: judgeModel,
    responseFormatJson: true,
    maxTokens: 8192,
    temperature: 0,
    retries: 3
  });
  const candidate = extractJsonCandidate(judgeText) ?? judgeText;

  return normalizeJudgeResult(JSON.parse(candidate), evalCase);
};

const average = (values: number[]): number =>
  values.length > 0
    ? values.reduce((total, value) => total + value, 0) / values.length
    : 0;

const buildMetricAverages = (cases: EvalCaseResult[]) =>
  evalMetrics.map((metric) => {
    const scores = cases.map(
      (item) =>
        item.judge_result.metric_scores.find(
          (score) => score.metric_id === metric.metric_id
        )?.score ?? 1
    );

    return {
      metric_id: metric.metric_id,
      metric_name: metric.metric_name,
      average_score: Number(average(scores).toFixed(2)),
      weight: metric.weight
    };
  });

const buildFinalVerdict = (
  overallAverage: number,
  vetoCaseCount: number
): string => {
  if (vetoCaseCount > 2) {
    return "不通过，需要重写 Prompt";
  }

  const thresholdVerdict = scoreByThreshold(overallAverage);

  if (vetoCaseCount > 0 && thresholdVerdict === "优秀，可以进入下一阶段") {
    return "基本可用，需要小幅优化";
  }

  return thresholdVerdict;
};

const buildKeyFindings = (
  cases: EvalCaseResult[],
  metricAverages: ReturnType<typeof buildMetricAverages>
): string[] => {
  const findings: string[] = [];
  const vetoCount = cases.filter((item) => item.veto_triggered).length;

  if (vetoCount > 0) {
    findings.push(`存在 ${vetoCount} 个一票否决 case，需要优先处理。`);
  }

  metricAverages
    .filter((metric) => metric.average_score < 3.7)
    .forEach((metric) => {
      findings.push(`${metric.metric_id} ${metric.metric_name} 平均分偏低。`);
    });

  const lowestCases = [...cases]
    .sort((left, right) => left.case_score_1_to_5 - right.case_score_1_to_5)
    .slice(0, 3)
    .map((item) => `${item.case_id} ${item.case_name}`);

  if (lowestCases.length > 0) {
    findings.push(`最低分 case：${lowestCases.join("、")}。`);
  }

  return findings.length > 0 ? findings : ["整体输出稳定，未发现明显系统性失败。"];
};

const metricOptimizationMap: Record<string, string> = {
  M01: "强化“复述只改写不扩写”的要求，避免把方案设定加入用户理解。",
  M02: "要求逐项抽取显性用户、客户、受益者和业务对象，并允许明确写“未出现”。",
  M03: "要求每个推断用户都给出推断依据和置信度，不把推断当事实。",
  M04: "增加用户细分维度示例，禁止只输出宽泛标签。",
  M05: "要求必须选择 1-2 个 MVP 核心用户，并说明不优先服务其他群体的理由。",
  M06: "强化 B 端角色区分，分别识别使用者、购买者、决策者和受益者。",
  M07: "增加用户定义风险清单，覆盖用户过泛、客户用户混淆、场景阶段不清等问题。",
  M08: "要求澄清问题只围绕“用户是谁”，并限制 3-5 个最高价值问题。",
  M09: "强调不要生成 PRD、功能列表、竞品分析、技术架构或商业模式。",
  M10: "将最终 JSON 字段设为强制，并要求字段名固定、数组类型稳定。"
};

const buildOptimizationSuggestions = (
  cases: EvalCaseResult[],
  metricAverages: ReturnType<typeof buildMetricAverages>
): string[] => {
  const suggestions = new Set<string>();

  metricAverages
    .filter((metric) => metric.average_score < 4)
    .forEach((metric) => {
      suggestions.add(metricOptimizationMap[metric.metric_id] ?? `${metric.metric_name} 需要优化。`);
    });

  cases.forEach((item) => {
    item.judge_result.prompt_optimization_suggestions.forEach((suggestion) => {
      suggestions.add(suggestion);
    });
  });

  return [...suggestions].slice(0, 20);
};

const buildReport = (cases: EvalCaseResult[]): EvalReport => {
  const metricAverages = buildMetricAverages(cases);
  const overallAverage = Number(
    average(cases.map((item) => item.case_score_1_to_5)).toFixed(2)
  );
  const difficultyWeightedAverage = Number(
    (
      cases.reduce(
        (total, item) =>
          total + item.case_score_1_to_5 * difficultyWeights[item.difficulty],
        0
      ) /
      cases.reduce(
        (total, item) => total + difficultyWeights[item.difficulty],
        0
      )
    ).toFixed(2)
  );
  const vetoCaseCount = cases.filter((item) => item.veto_triggered).length;

  return {
    run_id: `user_identification_${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}`,
    run_time: new Date().toISOString(),
    total_cases: cases.length,
    overall_average: overallAverage,
    difficulty_weighted_average: difficultyWeightedAverage,
    final_verdict: buildFinalVerdict(overallAverage, vetoCaseCount),
    veto_case_count: vetoCaseCount,
    cases,
    metric_averages: metricAverages,
    key_findings: buildKeyFindings(cases, metricAverages),
    prompt_optimization_suggestions: buildOptimizationSuggestions(cases, metricAverages)
  };
};

const writeReportFiles = async (report: EvalReport): Promise<void> => {
  const root = join(process.cwd(), "eval-results", "user-identification");
  const runsDir = join(root, "runs");
  const json = `${JSON.stringify(report, null, 2)}\n`;
  const markdown = generateMarkdownReport(report);

  await mkdir(runsDir, { recursive: true });
  await writeFile(join(runsDir, `${report.run_id}.json`), json, "utf8");
  await writeFile(join(runsDir, `${report.run_id}.md`), markdown, "utf8");
  await writeFile(join(root, "latest.json"), json, "utf8");
  await writeFile(join(root, "latest.md"), markdown, "utf8");
};

const runEval = async (): Promise<void> => {
  loadLocalEnv();
  assertRubricWeights();

  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY is missing. User-identification eval requires real DeepSeek calls.");
  }

  const caseResults: EvalCaseResult[] = [];

  for (const [index, evalCase] of userIdentificationEvalCases.entries()) {
    console.log(
      `[${index + 1}/${userIdentificationEvalCases.length}] Running ${evalCase.case_id}: ${evalCase.case_name}`
    );
    const agentOutput = await runAgentForCase(evalCase);
    const automaticRules = evaluateAutomaticRules(evalCase, agentOutput);
    const judgeResult = mergeJudgeWithAutomaticRules(
      await judgeCase(evalCase, agentOutput),
      automaticRules
    );
    const caseWeightedScore = Number(
      calculateCaseWeightedScore(judgeResult, evalMetrics).toFixed(2)
    );
    const caseScore1To5 = Number((caseWeightedScore / 20).toFixed(2));

    caseResults.push({
      case_id: evalCase.case_id,
      case_name: evalCase.case_name,
      difficulty: evalCase.difficulty,
      raw_idea: evalCase.raw_idea,
      agent_output: agentOutput,
      judge_result: judgeResult,
      case_weighted_score: caseWeightedScore,
      case_score_1_to_5: caseScore1To5,
      veto_triggered: judgeResult.veto_triggered,
      veto_reasons: judgeResult.veto_reasons
    });
  }

  const report = buildReport(caseResults);

  await writeReportFiles(report);

  console.log(`\nEval complete: ${report.final_verdict}`);
  console.log(`Average: ${report.overall_average}`);
  console.log(`Difficulty weighted average: ${report.difficulty_weighted_average}`);
  console.log(`Veto cases: ${report.veto_case_count}`);
  console.log("Reports:");
  console.log("  eval-results/user-identification/latest.json");
  console.log("  eval-results/user-identification/latest.md");
};

runEval().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown eval error";

  console.error(`Eval failed: ${message}`);
  process.exitCode = 1;
});
