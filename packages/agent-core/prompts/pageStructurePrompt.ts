export const promptId = "page-structure";
export const version = "0.1.0";
export const description = "Creates developer-ready page structure specifications.";

export function buildPrompt(input: unknown): string {
  return `请生成 MVP 的页面结构说明。

默认使用中文输出。

要求：
- 页面结构必须可交付给前端开发。
- 不设计营销落地页，优先工作台体验。
- 页面结构必须包含页面名称、目标、模块、字段、操作、状态、异常和跳转。
- 不实现 UI 代码，只输出结构说明。

请为每个页面输出：
1. 页面名称
2. 页面目标
3. 页面路由
4. 页面模块
5. 字段
6. 用户操作
7. 加载状态
8. 空状态
9. 错误状态
10. 异常处理
11. 页面跳转
12. 依赖数据

输入：
${JSON.stringify(input, null, 2)}`;
}
