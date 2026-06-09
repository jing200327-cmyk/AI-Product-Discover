export const promptId = "research-plan";
export const version = "0.1.0";
export const description = "Creates a research plan for market, user, and competitor discovery.";

export function buildPrompt(input: unknown): string {
  return `请为该产品想法生成一份可执行的研究计划。

默认使用中文输出。
不要编造市场规模、竞品数量或行业数据。
明确哪些问题需要搜索验证，哪些只是模型推断。

输出格式要求：只输出合法 JSON，不要输出 Markdown。

JSON 字段：
- goals: 研究目标数组
- keywords: 搜索关键词数组，覆盖中文和英文表达
- questions: 关键研究问题数组
- targetMarkets: 目标市场或细分场景数组
- competitorCategories: 竞品类别数组

输入：
${JSON.stringify(input, null, 2)}`;
}
