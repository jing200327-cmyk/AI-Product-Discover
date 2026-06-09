import type { EvalMetric, UserIdentificationEvalCase } from "./types";

export function buildJudgePrompt(input: {
  evalCase: UserIdentificationEvalCase;
  metrics: EvalMetric[];
  agentOutput: string;
}): string {
  return `你是 AI Product Discover 的 Prompt 评测专家。

你需要根据给定测试用例、Rubric 和被测 Agent 输出，对「产品理解阶段 Step 1：识别用户是谁」进行评分。

你只能评估用户识别质量，不要评估功能设计、PRD、竞品、技术架构或商业模式。

请严格根据以下内容评分：

1. 测试用例；
2. 期望用户细分；
3. 期望核心用户；
4. 期望角色区分；
5. 需要识别的风险；
6. 期望澄清问题；
7. 常见错误输出；
8. 10 个 Rubric 指标；
9. 一票否决项；
10. 被测 Agent 的实际输出。

评分要求：

- 每个指标必须给 1-5 分；
- 必须给出简短但具体的 reason；
- 必须引用被测输出中的 evidence；
- 不要因为表达方式不同就扣分，重点看产品判断是否正确；
- 对于 allow_uncertain=true 的 case，允许模型不强行确定唯一核心用户；
- 对于 acceptable_alternatives 中列出的核心用户，只要取舍理由充分，可以得高分；
- 如果模型进入大量功能设计、PRD、竞品、技术方案，需要降低 M09；
- 如果输出缺少 JSON 或结构化上下文，需要降低 M10；
- 如果 B 端 case 不区分使用者、购买者、决策者、受益者，需要触发一票否决；
- 如果模型把“所有人”“企业用户”“普通用户”直接作为核心用户且不拆分，需要触发一票否决。

请只输出严格 JSON，不要输出 Markdown，不要添加解释性文本。

输出 JSON schema：
{
  "case_id": "${input.evalCase.case_id}",
  "metric_scores": [
    {
      "metric_id": "M01",
      "score": 1,
      "reason": "",
      "evidence": ""
    }
  ],
  "veto_triggered": false,
  "veto_reasons": [],
  "main_failures": [],
  "prompt_optimization_suggestions": []
}

测试用例：
${JSON.stringify(input.evalCase, null, 2)}

Rubric：
${JSON.stringify(input.metrics, null, 2)}

被测 Agent 输出：
${input.agentOutput}`;
}
