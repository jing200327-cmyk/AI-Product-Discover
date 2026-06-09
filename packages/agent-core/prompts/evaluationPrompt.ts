export const promptId = "evaluation";
export const version = "0.1.0";
export const description = "Evaluates the product idea and generated discovery output.";

export function buildPrompt(input: unknown): string {
  return `请对产品想法和当前研究产物进行评测打分。

默认使用中文输出。
不要编造市场数据或用户反馈。
如果证据不足，要在 evidenceQualityScore 中扣分。
分数使用 0 到 100。
区分已验证事实、模型推断和待验证假设对评分的影响。

输出格式要求：只输出合法 JSON，不要输出 Markdown。

JSON 字段：
- totalScore: 总分
- marketScore: 市场机会分
- userPainScore: 用户痛点分
- differentiationScore: 差异化分
- feasibilityScore: 可行性分
- evidenceQualityScore: 证据质量分
- strengths: 主要加分点数组
- deductionReasons: 扣分原因数组
- risks: 风险数组
- recommendations: 优化建议数组

输入：
${JSON.stringify(input, null, 2)}`;
}
