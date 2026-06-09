export const promptId = "rewrite";
export const version = "0.1.0";
export const description = "Rewrites generated output while preserving evidence boundaries.";

export function buildPrompt(input: unknown): string {
  return `请在不改变事实边界的前提下改写内容。

默认使用中文输出。

要求：
- 不新增未经验证的事实。
- 不编造市场数据、竞品信息或用户反馈。
- 保留“已验证事实”“模型推断”“待验证假设”的区分。
- 提升表达清晰度、结构化程度和可执行性。
- 如果原文缺少证据边界，请补充标记。

请输出：
1. 改写后的内容
2. 保留的已验证事实
3. 保留或新增标记的模型推断
4. 保留或新增标记的待验证假设
5. 改写说明

输入：
${JSON.stringify(input, null, 2)}`;
}
