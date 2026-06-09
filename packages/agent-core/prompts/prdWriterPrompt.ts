export const promptId = "prd-writer";
export const version = "0.1.0";
export const description = "Writes a developer-ready MVP PRD.";

export function buildPrompt(input: unknown): string {
  return `请生成一份可开发的 MVP PRD。

默认使用中文输出。

要求：
- PRD 必须可开发，不要停留在愿景描述。
- 不编造市场数据。
- 明确区分已验证事实、模型推断和待验证假设。
- 功能范围要适合 MVP，不要一次性实现完整产品。
- 每个核心功能都要包含用户价值、输入、输出、状态和验收标准。

请输出：
1. 产品名称
2. 背景与问题
3. 目标用户
4. MVP 目标
5. 非目标
6. 用户故事
7. 核心功能
8. 数据结构需求
9. 页面与交互要求
10. 状态与异常处理
11. 成功指标
12. 风险与待验证假设
13. 验收标准

输入：
${JSON.stringify(input, null, 2)}`;
}
