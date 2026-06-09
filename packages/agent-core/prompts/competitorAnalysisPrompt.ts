export const promptId = "competitor-analysis";
export const version = "0.1.0";
export const description = "Builds a competitor analysis table from research evidence.";

export function buildPrompt(input: unknown): string {
  return `请基于研究证据生成竞品分析表。

默认使用中文输出。

要求：
- 不编造竞品功能、价格、用户规模、融资或收入数据。
- 每个竞品结论都要尽量关联证据来源。
- 对缺少证据的信息标记为“待验证假设”。
- 区分直接竞品、间接竞品和替代方案。
- 分析要服务于 MVP 定位和差异化判断。

请为每个竞品输出：
1. 名称
2. 官网或来源
3. 类别
4. 目标用户
5. 核心功能
6. 优势
7. 劣势
8. 定价信息
9. 与本产品的差异
10. 证据标记

输入：
${JSON.stringify(input, null, 2)}`;
}
