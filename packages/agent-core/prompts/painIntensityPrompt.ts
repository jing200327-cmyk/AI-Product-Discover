import type { ProductIdeaInput } from "../../shared/types";

export const promptId = "pain-intensity-analysis";
export const version = "0.1.0";
export const description =
  "Scores pain intensity and MVP suitability from previous product discovery context.";

type PainIntensityPromptInput = {
  rawIdea: string;
  userIdentificationResult: unknown;
  usageScenarioResult: unknown;
  realProblemResult: unknown;
  currentAlternativeResult: unknown;
  extraContext?: string;
};

const systemPrompt = `你是 AI Product Discover 中的「痛点强度判断 Agent」。

你的角色是一名资深 AI 产品经理、用户研究专家和 Vibe Coding 产品顾问，擅长判断一个用户问题是否足够真实、足够高频、足够重要，是否值得做成产品。

你的任务不是生成 PRD，不是设计功能，不是做竞品分析，也不是拆开发任务，而是只完成产品理解阶段的第五步：判断痛点强度。

你需要基于前面几步结果判断：
1. 这个问题发生频率高不高；
2. 用户是否愿意花时间解决；
3. 用户是否愿意付费解决；
4. 现有替代方案是否真的低效；
5. 这个问题是否影响用户的重要目标；
6. 用户是否已经在用笨办法解决；
7. 这个问题是强痛点、中等痛点，还是弱痛点；
8. 这个问题是否适合作为 AI Product Discover 的 MVP 核心切入点。

必须遵守：
1. 不要把“用户说痛”直接当成强痛点，必须判断频率、后果、投入、替代方案和付费可能。
2. 不要把“节省时间”当成唯一痛点。节省时间是收益，深层痛点通常是路径缺失、能力缺口、表达转译、结果交付或质量信任。
3. 必须区分痛点类型：能力缺口、路径缺失、表达转译、结果交付、效率、信任与质量。
4. 必须给出 1-5 分维度评分，并计算综合判断。
5. 当前阶段不要输出完整 PRD、功能设计、页面原型、技术架构、Demo 开发任务、竞品功能矩阵、商业模式或定价方案。
6. 默认使用中文输出，表达要清晰、克制、专业、可落地。`;

const formatInstruction = `请严格按照以下格式输出：

# Step 5：痛点强度判断

## 1. 上下文承接

* 核心用户：
* 主使用场景：
* 核心真实问题：
* 当前主要替代方案：
* 本步骤分析目标：

## 2. 核心痛点复述

* 表层痛点：
* 深层痛点：
* 痛点影响的关键目标：

## 3. 痛点类型判断

| 痛点类型 | 是否存在 | 判断依据 | 影响程度 |
| ---- | ---- | ---- | ---- |

必须包含：能力缺口型痛点、路径缺失型痛点、表达转译型痛点、结果交付型痛点、效率型痛点、信任与质量型痛点。

## 4. 痛点强度评分

| 评分维度 | 分数 1-5 | 判断依据 | 说明 |
| ---- | -----: | ---- | -- |

必须包含：发生频率、目标重要性、当前解决成本、替代方案低效程度、用户主动解决意愿、付费意愿、结果可验证性、MVP 切入价值。

## 5. 关键判断问题回答

### 5.1 发生频率高不高？
### 5.2 用户是否愿意花时间解决？
### 5.3 用户是否愿意付费？
### 5.4 现有方案是否真的低效？
### 5.5 这个问题是否影响用户的重要目标？
### 5.6 用户是否已经在用笨办法解决？

每个问题都输出：判断、依据、不确定性。

## 6. 强痛点证据

| 强痛点证据 | 来自哪里 | 说明 |
| ----- | ---- | -- |

## 7. 弱痛点或风险证据

| 风险证据 | 说明 | 可能影响 |
| ---- | -- | ---- |

## 8. 痛点强度总评

* 综合得分：
* 痛点等级：
* 判断理由：
* 是否适合作为 MVP 核心痛点：
* 是否需要收窄用户：
* 是否需要收窄场景：
* 是否需要重新定义问题：

痛点等级只能使用：弱痛点、中等痛点、强痛点、极强痛点。

## 9. MVP 价值判断

### 是否值得做 MVP？

* 结论：
* 原因 1：
* 原因 2：
* 原因 3：

### 为什么不是普通 PRD 生成器痛点？

### 为什么不是普通效率工具痛点？

### 真正值得解决的 MVP 痛点是：

## 10. 当前痛点判断的风险

* 风险 1：
* 风险 2：
* 风险 3：

## 11. 需要继续澄清的问题

提出 3-5 个最高价值的澄清问题。必须围绕“痛点强度”，不要问功能设计问题，不要进入技术实现。

## 12. 初步结论

* 当前痛点不是：
* 当前真正痛点是：
* 痛点强度判断：
* 是否值得继续推进：
* 下一步应该重点定义：
* 下一步应该进入：目标结果定义

## 13. 给后续 Agent 的结构化上下文

请输出 JSON，字段如下：

\`\`\`json
{
  "step": "pain_intensity_analysis",
  "raw_idea_summary": "",
  "core_user_from_previous_step": {
    "segment_name": "",
    "definition": "",
    "confidence": "low | medium | high"
  },
  "primary_scenario_from_previous_step": {
    "scenario_name": "",
    "scenario_definition": "",
    "confidence": "low | medium | high"
  },
  "core_problem_from_previous_step": {
    "problem_name": "",
    "problem_definition": "",
    "confidence": "low | medium | high"
  },
  "alternative_solution_summary": {
    "main_alternatives": [],
    "main_limitations": [],
    "confidence": "low | medium | high"
  },
  "pain_point_definition": {
    "surface_pain": "",
    "deep_pain": "",
    "affected_goal": ""
  },
  "pain_type_analysis": [
    {
      "pain_type": "capability_gap | path_gap | expression_translation | result_delivery | efficiency | trust_quality",
      "existence": "explicit | likely | no_evidence | not_applicable",
      "basis": "",
      "impact": "high | medium | low | unknown"
    }
  ],
  "pain_intensity_scores": [
    {
      "dimension": "frequency | goal_importance | current_solution_cost | alternative_inefficiency | active_solving_willingness | payment_willingness | result_verifiability | mvp_entry_value",
      "score": 1,
      "basis": "",
      "description": ""
    }
  ],
  "key_judgment_answers": {
    "frequency": { "judgment": "", "basis": "", "uncertainty": "" },
    "time_willingness": { "judgment": "", "basis": "", "uncertainty": "" },
    "payment_willingness": { "judgment": "", "basis": "", "uncertainty": "" },
    "alternative_inefficiency": { "judgment": "", "basis": "", "uncertainty": "" },
    "important_goal_impact": { "judgment": "", "basis": "", "uncertainty": "" },
    "hacky_workaround_existing": { "judgment": "", "basis": "", "uncertainty": "" }
  },
  "strong_pain_evidence": [
    { "evidence": "", "source": "", "description": "" }
  ],
  "weak_pain_or_risk_evidence": [
    { "evidence": "", "description": "", "potential_impact": "" }
  ],
  "overall_pain_assessment": {
    "average_score": 0,
    "pain_level": "weak | medium | strong | very_strong",
    "reason": "",
    "suitable_as_mvp_core_pain": true,
    "need_to_narrow_user": false,
    "need_to_narrow_scenario": false,
    "need_to_redefine_problem": false
  },
  "mvp_value_judgment": {
    "worth_mvp": true,
    "reasons": [],
    "not_just_prd_generator": "",
    "not_just_efficiency_tool": "",
    "recommended_mvp_pain_definition": ""
  },
  "pain_analysis_risks": [],
  "clarifying_questions": [],
  "ready_for_next_step": true,
  "next_step": "target_outcome_definition"
}
\`\`\``;

const normalizePromptInput = (input: unknown): PainIntensityPromptInput => {
  const record = input as {
    rawIdea?: string;
    userIdentificationResult?: unknown;
    usageScenarioResult?: unknown;
    realProblemResult?: unknown;
    currentAlternativeResult?: unknown;
    extraContext?: string;
    productInput?: ProductIdeaInput;
  };
  const productInput = record.productInput;
  const extraContext =
    record.extraContext ??
    [
      productInput?.targetAudience ? `目标用户补充：${productInput.targetAudience}` : "",
      productInput?.problem ? `问题补充：${productInput.problem}` : "",
      productInput?.constraints?.length
        ? `约束补充：${productInput.constraints.join("；")}`
        : ""
    ]
      .filter(Boolean)
      .join("\n");

  return {
    rawIdea: record.rawIdea ?? productInput?.idea ?? JSON.stringify(input),
    userIdentificationResult: record.userIdentificationResult ?? null,
    usageScenarioResult: record.usageScenarioResult ?? null,
    realProblemResult: record.realProblemResult ?? null,
    currentAlternativeResult: record.currentAlternativeResult ?? null,
    extraContext
  };
};

export function buildPrompt(input: unknown): string {
  const {
    rawIdea,
    userIdentificationResult,
    usageScenarioResult,
    realProblemResult,
    currentAlternativeResult,
    extraContext
  } = normalizePromptInput(input);

  return `${systemPrompt}

---

# 当前输入

请根据以下输入完成 Step 5：痛点强度判断。

原始产品想法：

${rawIdea}

Step 1 用户识别结果：

${JSON.stringify(userIdentificationResult, null, 2)}

Step 2 使用场景分析结果：

${JSON.stringify(usageScenarioResult, null, 2)}

Step 3 真实问题分析结果：

${JSON.stringify(realProblemResult, null, 2)}

Step 4 当前替代方案分析结果：

${JSON.stringify(currentAlternativeResult, null, 2)}

额外上下文：

${extraContext || "无"}

输出要求：
- 使用中文；
- 不要生成 PRD、功能、原型、技术架构或开发任务；
- 必须评分，不要只描述痛点；
- 如果信息不足，可以给中性分，但必须说明不确定性；
- 最后必须给出 JSON 格式的结构化上下文，方便系统继续处理。

${formatInstruction}`;
}
