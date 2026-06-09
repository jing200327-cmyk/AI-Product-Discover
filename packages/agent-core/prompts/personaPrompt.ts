export const promptId = "persona";
export const version = "0.1.0";
export const description = "Generates user personas based on product context and research evidence.";

export function buildPrompt(input: unknown): string {
  return `请生成适用于 MVP 设计的用户画像。

默认使用中文输出。

要求：
- 不编造用户调研结果。
- 如果没有真实访谈或调研来源，必须标记为“模型推断”。
- 用户画像要能指导功能优先级、页面结构和 PRD。
- 每个画像都要包含明确的 JTBD。

请输出 2 到 3 个用户画像，每个包含：
1. 用户名称
2. 用户细分
3. 目标
4. 痛点
5. 行为特征
6. Jobs To Be Done
7. 使用场景
8. 证据状态：已验证事实 / 模型推断 / 待验证假设

输入：
${JSON.stringify(input, null, 2)}`;
}
