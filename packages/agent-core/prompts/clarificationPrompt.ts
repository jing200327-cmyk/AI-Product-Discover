export const promptId = "clarification";
export const version = "0.1.0";
export const description = "Generates three clarification questions for the product idea.";

export function buildPrompt(input: unknown): string {
  return `请基于产品上下文生成 3 个高价值澄清问题。

默认使用中文输出。

要求：
- 问题必须帮助缩小产品范围、明确目标用户或验证核心风险。
- 不询问已经在输入中明确回答过的问题。
- 不编造市场事实。
- 每个问题都要说明为什么需要问。
- 如果问题涉及未知市场信息，请标记为“待验证假设”。

请输出 3 个问题，每个问题包含：
1. question
2. reason
3. required
4. relatedRisk

输入：
${JSON.stringify(input, null, 2)}`;
}
