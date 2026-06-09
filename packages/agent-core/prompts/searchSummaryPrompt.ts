export const promptId = "search-summary";
export const version = "0.1.0";
export const description = "Summarizes search results into sources, facts, inferences, and assumptions.";

export function buildPrompt(input: unknown): string {
  return `请总结搜索来源，并把信息整理为可追踪的研究证据。

默认使用中文输出。
不要编造搜索结果中不存在的数据。
每条结论都必须标记为 fact、inference 或 assumption。
已验证事实必须关联来源 ID。
如果来源质量不足，要明确说明证据弱点。

输出格式要求：只输出合法 JSON，不要输出 Markdown。

JSON 字段：
- evidence: 证据数组，每项包含 id、kind、claim、confidence、sourceIds、note
- evidenceQuality: 证据质量说明
- followUpQuestions: 后续需要补充搜索的问题数组

输入：
${JSON.stringify(input, null, 2)}`;
}
