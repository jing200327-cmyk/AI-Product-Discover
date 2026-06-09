import type { ProductIdeaInput } from "../../shared/types";

export const promptId = "target-user-identification";
export const version = "0.3.0";
export const description =
  "Identifies target users and evidence for Step2 from a raw product idea.";

type TargetUserPromptInput = {
  rawIdea: string;
  extraContext?: string;
};

const systemPrompt = `你是 AI Product Discover 的「Step2：目标用户识别」Agent。

你只负责根据用户输入的产品想法识别目标用户，并说明判断依据。

你有 3 个内部子任务：
1. 目标用户识别 Agent：提取或推断最可能使用该产品的人群。
2. 用户细分 Agent：区分核心用户、次级用户、影响者、付费决策者。
3. 用户依据解释 Agent：说明判断依据来自关键词、场景推断、任务推断或商业关系推断。

必须遵守：
- 只分析目标用户。
- 优先提取原文中明确出现的用户。
- 原文没有明确用户时，可以基于产品任务做克制推断。
- 每个用户都必须有 evidence。
- 不允许把所有用户都标记为 core_user。
- 不要分析核心问题、价值主张、使用场景、替代方案、痛点强度、产品机会、竞品、PRD 或 Demo。
- 只输出合法 JSON，不要输出 Markdown。`;

const outputSchemaInstruction = `输出 JSON 必须符合：
{
  "step": "step2",
  "title": "目标用户识别",
  "status": "completed | needs_more_info",
  "targetUsers": [
    {
      "id": "user_001",
      "name": "",
      "userType": "core_user | secondary_user | influencer | decision_maker",
      "description": "",
      "evidenceType": "keyword | scenario_inference | task_inference | business_inference",
      "evidence": [],
      "confidence": "high | medium | low"
    }
  ],
  "missingInfoPrompt": ""
}

如果输入太短，无法识别用户：
- status 使用 "needs_more_info"
- targetUsers 可以为空数组
- missingInfoPrompt 使用 "当前想法中缺少明确的用户信息，请补充：这个产品主要给谁用？"`;

const normalizePromptInput = (input: unknown): TargetUserPromptInput => {
  const productInput = input as Partial<ProductIdeaInput>;
  const extraContext = [
    productInput.targetAudience ? `目标用户补充：${productInput.targetAudience}` : "",
    productInput.problem ? `问题补充：${productInput.problem}` : "",
    productInput.constraints?.length
      ? `约束补充：${productInput.constraints.join("；")}`
      : ""
  ]
    .filter(Boolean)
    .join("\n");

  return {
    rawIdea: productInput.idea ?? JSON.stringify(input),
    extraContext
  };
};

export function buildPrompt(input: unknown): string {
  const { rawIdea, extraContext } = normalizePromptInput(input);

  return `${systemPrompt}

用户输入：
${rawIdea}

额外上下文：
${extraContext || "无"}

${outputSchemaInstruction}`;
}
