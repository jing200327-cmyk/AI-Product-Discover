import { z } from "zod";
import { AgentStateSchema } from "../../shared/schemas";
import type { AgentState } from "../../shared/types";
import type { ToolDefinition } from "./types";

export const MarkdownExportInputSchema = AgentStateSchema;

export const MarkdownExportOutputSchema = z
  .object({
    markdown: z.string().min(1)
  })
  .strict();

export type MarkdownExportInput = z.infer<typeof MarkdownExportInputSchema>;
export type MarkdownExportOutput = z.infer<typeof MarkdownExportOutputSchema>;

const list = (items: string[] | undefined): string =>
  items && items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- 暂无";

const targetUserTypeLabels = {
  core_user: "核心用户",
  secondary_user: "次级用户",
  influencer: "影响者",
  decision_maker: "付费决策者"
} as const;

const evidenceTypeLabels = {
  keyword: "来自原始想法关键词",
  scenario_inference: "来自场景推断",
  task_inference: "来自任务推断",
  business_inference: "来自商业关系推断"
} as const;

const buildMarkdown = (state: AgentState): string => `# ${state.mvpPrd?.title ?? "AI Product Discover"}

## 目标用户识别

${state.targetUserIdentification?.targetUsers
  .map(
    (user) => `- ${user.name}（${targetUserTypeLabels[user.userType]}）：${user.description}
  - 依据来源：${evidenceTypeLabels[user.evidenceType]}
  - 判断依据：${user.evidence.join("；")}
  - ${user.confidence}`
  )
  .join("\n") || "- 暂无"}

## 使用场景

- 推荐主场景：${state.usageScenario?.recommendedPrimaryScenario.scenarioName ?? "暂无"}
- 场景定义：${state.usageScenario?.recommendedPrimaryScenario.scenarioDefinition ?? "暂无"}
- 触发时刻：${state.usageScenario?.recommendedPrimaryScenario.triggerMoment ?? "暂无"}
- 用户任务：${state.usageScenario?.recommendedPrimaryScenario.mainTask ?? "暂无"}
- 当前阻碍：${state.usageScenario?.recommendedPrimaryScenario.currentBlocker ?? "暂无"}
- 成功标准：${state.usageScenario?.recommendedPrimaryScenario.successCriteria ?? "暂无"}

### 场景候选

${state.usageScenario?.scenarioCandidates
  .map(
    (scenario) =>
      `- ${scenario.scenarioName}：${scenario.userTask}（触发：${scenario.triggerEvent}，MVP 优先级：${scenario.mvpPriority}）`
  )
  .join("\n") || "- 暂无"}

## 真实问题

- 推荐核心问题：${state.realProblem?.recommendedCoreProblem.problemName ?? "暂无"}
- 问题定义：${state.realProblem?.recommendedCoreProblem.problemDefinition ?? "暂无"}
- 为什么重要：${state.realProblem?.recommendedCoreProblem.whyItMatters ?? "暂无"}
- 和 PRD 的关系：${state.realProblem?.recommendedCoreProblem.relationshipWithPrd ?? "暂无"}
- 和 Vibe Coding / Codex 的关系：${state.realProblem?.recommendedCoreProblem.relationshipWithVibeCoding ?? "暂无"}
- 问题边界：${state.realProblem?.recommendedCoreProblem.problemBoundary ?? "暂无"}

### 表层需求

${state.realProblem?.surfaceNeeds
  .map((need) => `- ${need.need}：${need.description}（${need.explicitness}）`)
  .join("\n") || "- 暂无"}

### 真实问题候选

${state.realProblem?.realProblemCandidates
  .map(
    (problem) =>
      `- ${problem.problemName}：${problem.problemDescription}（MVP 优先级：${problem.mvpPriority}）`
  )
  .join("\n") || "- 暂无"}

## 现有替代方案

### 当前可能解决路径

${state.currentAlternative?.currentSolutionPaths
  .map((path) => `- ${path.pathName}：${path.workflow.join(" → ")}`)
  .join("\n") || "- 暂无"}

### 替代方案清单

${state.currentAlternative?.alternativeSolutions
  .map(
    (alternative) =>
      `- ${alternative.alternativeName}：覆盖 ${alternative.coveredTasks.join("、")}；不足：${alternative.limitations.join("、")}；威胁：${alternative.threatToProduct}`
  )
  .join("\n") || "- 暂无"}

### 差异化判断

${state.currentAlternative?.productDifferentiation
  .map(
    (item) =>
      `- ${item.direction}：${item.requiredProductCapability}（解决：${item.alternativeWeaknessAddressed}）`
  )
  .join("\n") || "- 暂无"}

### 被替代风险

${state.currentAlternative?.replacementRisks
  .map((risk) => `- ${risk.risk}：会被 ${risk.replacedBy} 替代；应对：${risk.mitigationStrategy}`)
  .join("\n") || "- 暂无"}

## 痛点强度

- 表层痛点：${state.painIntensity?.painPointDefinition.surfacePain ?? "暂无"}
- 深层痛点：${state.painIntensity?.painPointDefinition.deepPain ?? "暂无"}
- 影响目标：${state.painIntensity?.painPointDefinition.affectedGoal ?? "暂无"}
- 综合得分：${state.painIntensity?.overallPainAssessment.averageScore ?? 0}
- 痛点等级：${state.painIntensity?.overallPainAssessment.painLevel ?? "暂无"}
- 是否适合作为 MVP 核心痛点：${state.painIntensity?.overallPainAssessment.suitableAsMvpCorePain ? "是" : "否"}
- MVP 痛点定义：${state.painIntensity?.mvpValueJudgment.recommendedMvpPainDefinition ?? "暂无"}

### 评分维度

${state.painIntensity?.painIntensityScores
  .map((score) => `- ${score.dimension}：${score.score}/5，${score.description}`)
  .join("\n") || "- 暂无"}

### 强痛点证据

${state.painIntensity?.strongPainEvidence
  .map((item) => `- ${item.evidence}：${item.description}`)
  .join("\n") || "- 暂无"}

### 风险证据

${state.painIntensity?.weakPainOrRiskEvidence
  .map((item) => `- ${item.evidence}：${item.potentialImpact}`)
  .join("\n") || "- 暂无"}

## 澄清问题

${state.clarificationQuestions
  .map((question) => `- ${question.question}（原因：${question.reason}）`)
  .join("\n") || "- 暂无"}

### 澄清回答

${state.clarificationAnswers
  .map((answer) => `- ${answer.questionId}: ${answer.answer}${answer.isMock ? "（Mock）" : ""}`)
  .join("\n") || "- 暂无"}

## 研究计划

### 研究目标

${list(state.researchPlan?.goals)}

### 搜索关键词

${list(state.researchPlan?.keywords)}

## 证据摘要

${state.evidence
  .map(
    (item) =>
      `- [${item.kind}] ${item.claim}（confidence: ${item.confidence.toFixed(2)}，sources: ${item.sourceIds.join(", ") || "无"}）`
  )
  .join("\n") || "- 暂无"}

## 竞品分析

${state.competitors
  .map(
    (competitor) => `### ${competitor.name}

- 类别：${competitor.category}
- 目标用户：${competitor.targetUsers.join("、")}
- 核心功能：${competitor.coreFeatures.join("、")}
- 优势：${competitor.strengths.join("、")}
- 劣势：${competitor.weaknesses.join("、")}
- 定价：${competitor.pricing ?? "待验证"}`
  )
  .join("\n\n") || "暂无"}

## 用户画像

${state.personas
  .map(
    (persona) => `### ${persona.name}

- 细分：${persona.segment}
- 目标：${persona.goals.join("、")}
- 痛点：${persona.pains.join("、")}
- JTBD：${persona.jobsToBeDone.join("、")}`
  )
  .join("\n\n") || "暂无"}

## MVP PRD

- 背景与问题：${state.mvpPrd?.problemStatement ?? "暂无"}
- MVP 目标：
${list(state.mvpPrd?.goals)}
- 非目标：
${list(state.mvpPrd?.nonGoals)}
- 核心功能：
${list(state.mvpPrd?.coreFeatures)}
- 成功指标：
${list(state.mvpPrd?.successMetrics)}
- 风险：
${list(state.mvpPrd?.risks)}

## 页面结构

${state.pages
  .map(
    (page) => `### ${page.name}

- 路由：${page.route}
- 目标：${page.purpose}
- 模块：${page.modules.join("、")}
- 字段：${page.fields.join("、")}
- 操作：${page.operations.join("、")}
- 状态：${page.states.join("、")}
- 异常：${page.exceptions.join("、")}
- 跳转：${page.transitions.join("、")}`
  )
  .join("\n\n") || "暂无"}

## 评测结果

- 总分：${state.evaluation?.totalScore ?? 0}
- 市场机会分：${state.evaluation?.marketScore ?? 0}
- 用户痛点分：${state.evaluation?.userPainScore ?? 0}
- 差异化分：${state.evaluation?.differentiationScore ?? 0}
- 可行性分：${state.evaluation?.feasibilityScore ?? 0}
- 证据质量分：${state.evaluation?.evidenceQualityScore ?? 0}
- 扣分原因：${state.evaluation?.deductionReasons.join("；") ?? "暂无"}
- 优化建议：${state.evaluation?.recommendations.join("；") ?? "暂无"}
`;

export const markdownExportTool: ToolDefinition<
  MarkdownExportInput,
  MarkdownExportOutput
> = {
  name: "markdownExport",
  description: "Exports the current AgentState as a complete Markdown document.",
  permissionLevel: "safe_read",
  timeoutMs: 2000,
  retry: 0,
  inputSchema: MarkdownExportInputSchema,
  outputSchema: MarkdownExportOutputSchema,
  handler(input) {
    return {
      markdown: buildMarkdown(input)
    };
  },
  createDegradedOutput(_input, error) {
    return {
      markdown: `# AI Product Discover\n\n导出降级：${error.message}`
    };
  }
};
