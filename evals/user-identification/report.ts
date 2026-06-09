import type { EvalReport, JudgeResult } from "./types";

const formatScore = (score: number): string => score.toFixed(2);

const truncate = (text: string, maxLength = 6000): string => {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}\n\n...[truncated ${text.length - maxLength} chars]`;
};

const formatReasons = (items: string[]): string =>
  items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- 无";

const formatJudgeScores = (judgeResult: JudgeResult): string =>
  judgeResult.metric_scores
    .map(
      (item) =>
        `| ${item.metric_id} | ${item.score} | ${item.reason.replace(/\n/g, " ")} |`
    )
    .join("\n");

export function generateMarkdownReport(report: EvalReport): string {
  const metricRows = report.metric_averages
    .map(
      (metric) =>
        `| ${metric.metric_id} | ${metric.metric_name} | ${formatScore(
          metric.average_score
        )} | ${metric.weight} |`
    )
    .join("\n");

  const caseRows = report.cases
    .map(
      (item) =>
        `| ${item.case_id} | ${item.case_name} | ${item.difficulty} | ${formatScore(
          item.case_score_1_to_5
        )} | ${formatScore(item.case_weighted_score)} | ${
          item.veto_triggered ? "是" : "否"
        } |`
    )
    .join("\n");

  const caseDetails = report.cases
    .map(
      (item) => `### Case ${item.case_id}: ${item.case_name}

- 难度：${item.difficulty}
- 1-5 分：${formatScore(item.case_score_1_to_5)}
- 加权百分制：${formatScore(item.case_weighted_score)}
- 一票否决：${item.veto_triggered ? "是" : "否"}
- 否决原因：
${formatReasons(item.veto_reasons)}

#### Judge 评分摘要

| 指标 ID | 分数 | 理由 |
|---|---:|---|
${formatJudgeScores(item.judge_result)}

#### Agent 输出

\`\`\`md
${truncate(item.agent_output)}
\`\`\`
`
    )
    .join("\n");

  return `# 用户识别阶段评测报告

## 1. 总览

- Run ID：${report.run_id}
- Run Time：${report.run_time}
- 测试用例数：${report.total_cases}
- 平均分：${formatScore(report.overall_average)}
- 难度加权平均分：${formatScore(report.difficulty_weighted_average)}
- 一票否决 Case 数：${report.veto_case_count}
- 最终结论：${report.final_verdict}

## 2. Case 得分

| Case ID | 名称 | 难度 | 1-5 分 | 加权百分制 | 一票否决 |
|---|---|---|---:|---:|---|
${caseRows}

## 3. 指标平均分

| 指标 ID | 指标名称 | 平均分 | 权重 |
|---|---|---:|---:|
${metricRows}

## 4. 关键发现

${formatReasons(report.key_findings)}

## 5. Prompt 优化建议

${formatReasons(report.prompt_optimization_suggestions)}

## 6. Case 详情

${caseDetails}
`;
}
