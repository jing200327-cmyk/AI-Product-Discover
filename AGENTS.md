# AGENTS.md

# AI Product Discover / 智研产品发现 Agent

## 1. 项目目标

AI Product Discover / 智研产品发现 Agent 是一个面向 AI 产品经理、创业者、独立开发者和咨询顾问的产品发现 MVP。

用户输入一个产品想法后，系统需要逐步完成：

1. 产品想法理解
2. 生成 3 个澄清问题
3. 生成研究计划
4. 执行行业与竞品研究
5. 生成竞品分析表
6. 生成用户画像
7. 生成 MVP PRD
8. 生成页面结构
9. 生成评测分数
10. 支持 Markdown / JSON 导出
11. 记录 Agent Trace

MVP 的第一目标不是生成最完整的商业分析，而是建立一条稳定、可运行、可追踪、可替换真实能力的 Agent 产品发现链路。

## 2. 技术栈

项目必须使用 TypeScript。

建议技术栈：

- Runtime: Node.js
- Language: TypeScript
- Frontend: Next.js + React
- Styling: Tailwind CSS
- Schema: Zod
- LLM Provider: 先使用 Mock LLM，后续替换 OpenAI API
- Search Provider: 先使用 Mock Search，后续替换真实搜索 API
- Export: Markdown / JSON
- Trace: 本地内存或文件级 Trace，后续可替换数据库
- Package Manager: pnpm 优先

初期不得依赖任何真实 API Key。所有核心流程必须在无网络、无密钥的情况下跑通。

## 3. 目录结构约定

后续项目初始化后，建议使用以下目录结构：

```txt
src/
  app/
    page.tsx
    api/
  components/
    workspace/
    trace/
    export/
  agent/
    nodes/
    runner.ts
    registry.ts
  schemas/
    product-idea.ts
    clarification.ts
    research-plan.ts
    competitor.ts
    persona.ts
    prd.ts
    page-structure.ts
    evaluation.ts
    trace.ts
  services/
    llm/
      mock-llm.ts
      openai-llm.ts
      types.ts
    search/
      mock-search.ts
      real-search.ts
      types.ts
  trace/
    trace-store.ts
    trace-recorder.ts
  exporters/
    markdown-exporter.ts
    json-exporter.ts
  lib/
    ids.ts
    time.ts
```

当前阶段不要提前创建复杂目录。目录应随着 Step 逐步增加。

## 4. Agent 架构约定

Agent 必须采用节点化架构。

每个 Agent Node 必须包含：

- 明确的节点名称
- 明确的输入 Schema
- 明确的输出 Schema
- 单一职责
- 可 Mock 的外部依赖
- 可记录到 Trace 的输入、输出、耗时和状态

推荐节点顺序：

1. `understandProductIdea`
2. `generateClarificationQuestions`
3. `generateResearchPlan`
4. `runMarketResearch`
5. `generateCompetitorAnalysis`
6. `generateUserPersonas`
7. `generateMvpPrd`
8. `generatePageStructure`
9. `evaluateProductIdea`
10. `exportResult`

所有节点输出都必须进入统一的 Agent Trace。

Trace 至少包含：

- `traceId`
- `runId`
- `nodeName`
- `input`
- `output`
- `status`
- `startedAt`
- `endedAt`
- `durationMs`
- `error`

## 5. 代码风格

代码风格要求：

- 必须使用 TypeScript
- 优先使用显式类型
- 所有 Agent 输入输出必须先定义 Schema
- Schema 与 TypeScript 类型保持一致
- 避免隐式 any
- 避免过早抽象
- 避免一次性写大文件
- 每个模块只承担一个明确职责
- Mock 实现和真实实现必须通过统一接口隔离
- UI 必须是工作台，不是单纯聊天窗口
- 生成内容必须结构化，不能只返回大段不可解析文本

命名约定：

- Agent 节点使用动词开头，例如 `generateResearchPlan`
- Schema 使用 `XxxSchema`
- 类型使用 `Xxx`
- Provider 接口使用 `XxxProvider`
- Mock 实现使用 `MockXxxProvider`

## 6. 每次开发后的验收方式

每次 Step 开发完成后，必须至少完成以下验收：

1. 项目可以正常启动或通过类型检查
2. 不需要真实 API Key
3. Mock LLM 和 Mock Search 可以跑通当前链路
4. 当前新增节点有明确输入输出 Schema
5. 当前新增节点的输入和输出会进入 Trace
6. 前端能够展示当前 Step 的核心结果
7. Markdown / JSON 导出在相关 Step 后可验证
8. 没有引入与当前 Step 无关的大型功能
9. 没有把真实 API、搜索 API、Figma API 与业务逻辑硬耦合

推荐验收命令后续再补充，例如：

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm dev
```

## 7. 不允许做的事情

项目开发中不允许：

- 一次性写完整项目
- 在 MVP 初期接入真实 API 作为必需条件
- 硬编码 API Key、Token 或私密配置
- 跳过 Agent 节点输入输出 Schema
- 生成不可追踪的内容
- 让 Agent 输出绕过 Trace
- 把前端做成单纯聊天窗口
- 在没有需求确认时引入数据库、登录、支付、多租户等复杂能力
- 在 Mock 阶段引入复杂 LangChain / LangGraph 依赖，除非后续明确需要
- 创建与当前 Step 无关的业务代码
- 修改用户未要求修改的文件
- 使用 JavaScript 替代 TypeScript
- 用真实搜索结果作为测试稳定性的前提

## 8. 后续 Step 开发计划

### Step 1: 项目初始化

- 初始化 Next.js + TypeScript
- 配置基础 lint / typecheck
- 创建最小工作台页面
- 不实现复杂 Agent 逻辑

### Step 2: Schema 基础层

- 定义产品想法输入 Schema
- 定义澄清问题 Schema
- 定义研究计划 Schema
- 定义 Trace Schema
- 建立 Schema 优先的开发方式

### Step 3: Mock LLM 与 Mock Search

- 创建统一 LLM Provider 接口
- 创建 Mock LLM Provider
- 创建统一 Search Provider 接口
- 创建 Mock Search Provider
- 确保无 API Key 可运行

### Step 4: Agent Runner 与 Trace

- 创建 Agent Runner
- 串联前 3 个节点
- 记录每个节点输入、输出、耗时、状态
- 前端展示 Trace 时间线

### Step 5: 产品发现主链路

- 实现产品理解
- 实现澄清问题
- 实现研究计划
- 实现行业与竞品研究
- 实现竞品分析表

### Step 6: PRD 与页面结构生成

- 实现用户画像
- 实现 MVP PRD
- 实现页面结构
- 所有结果结构化输出

### Step 7: 评分与导出

- 实现产品想法评测分数
- 支持 Markdown 导出
- 支持 JSON 导出
- 前端提供导出入口

### Step 8: 工作台体验优化

- 左侧输入区
- 中间结果区
- 右侧 Trace 区
- 支持分阶段查看 Agent 输出
- 支持重新运行 Mock 流程

### Step 9: 真实能力替换

- 替换真实 OpenAI API
- 替换真实搜索 API
- 预留 Figma API 接口
- 预留 Codex 任务生成器接口
- 保持 Mock Provider 可用于本地开发和测试
