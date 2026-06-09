import type { EvalMetric } from "./types";

export const evalMetrics: EvalMetric[] = [
  {
    metric_id: "M01",
    metric_name: "原始想法复述准确性",
    metric_description: "评估是否准确复述原始想法，不添加过多产品设定。",
    weight: 8,
    score_1_description: "曲解原意。",
    score_3_description: "基本复述但有扩展。",
    score_5_description: "清晰、克制、准确。",
    failure_examples: ["把周报工具复述成项目管理平台。"]
  },
  {
    metric_id: "M02",
    metric_name: "显性用户识别完整性",
    metric_description: "评估是否提取输入中明确出现的用户、使用方、受益方。",
    weight: 10,
    score_1_description: "漏掉关键用户。",
    score_3_description: "识别主要用户。",
    score_5_description: "完整识别并分类。",
    failure_examples: ["漏掉“老板可以买”。"]
  },
  {
    metric_id: "M03",
    metric_name: "隐性用户推断合理性",
    metric_description: "评估是否基于原始想法推断，并标注依据和置信度。",
    weight: 10,
    score_1_description: "胡乱推断。",
    score_3_description: "有推断但依据弱。",
    score_5_description: "推断克制且有依据。",
    failure_examples: ["无依据扩展投资人。"]
  },
  {
    metric_id: "M04",
    metric_name: "用户细分具体度",
    metric_description: "评估是否避免“所有人/企业用户”等泛化标签。",
    weight: 10,
    score_1_description: "过泛。",
    score_3_description: "有基本细分。",
    score_5_description: "细分具体可验证。",
    failure_examples: ["只写普通用户。"]
  },
  {
    metric_id: "M05",
    metric_name: "MVP 核心用户判断",
    metric_description:
      "评估是否能选出 1-2 类核心用户并说明原因。allow_uncertain=true 时，明确说明信息不足并给出候选用户和澄清方向也可高分。",
    weight: 12,
    score_1_description: "无核心判断。",
    score_3_description: "有判断但理由弱。",
    score_5_description: "聚焦清晰、理由充分。",
    failure_examples: ["所有用户都是核心。"]
  },
  {
    metric_id: "M06",
    metric_name: "角色区分准确性",
    metric_description: "评估是否区分使用者、购买者、决策者、受益者。",
    weight: 10,
    score_1_description: "完全混淆。",
    score_3_description: "基本区分。",
    score_5_description: "准确处理个人/B 端差异。",
    failure_examples: ["B 端只写企业用户。"]
  },
  {
    metric_id: "M07",
    metric_name: "用户定义风险识别",
    metric_description: "评估是否识别过泛、过窄、用户客户混淆等风险。",
    weight: 10,
    score_1_description: "无风险识别。",
    score_3_description: "识别部分风险。",
    score_5_description: "风险具体且命中关键。",
    failure_examples: ["不指出“所有职场人”过泛。"]
  },
  {
    metric_id: "M08",
    metric_name: "澄清问题质量",
    metric_description: "评估问题是否围绕“用户是谁”，能帮助 MVP 聚焦。",
    weight: 10,
    score_1_description: "问题无关。",
    score_3_description: "问题基本相关。",
    score_5_description: "具体、高价值、3-5 个。",
    failure_examples: ["问要做哪些功能。"]
  },
  {
    metric_id: "M09",
    metric_name: "范围控制",
    metric_description: "评估是否限制在用户识别，不进入功能、PRD、竞品、技术架构。",
    weight: 8,
    score_1_description: "严重跑题。",
    score_3_description: "偶有扩展。",
    score_5_description: "全程聚焦用户识别。",
    failure_examples: ["输出功能清单。"]
  },
  {
    metric_id: "M10",
    metric_name: "结构化可用性",
    metric_description: "评估输出是否稳定、字段完整，可给后续 Agent 使用。",
    weight: 12,
    score_1_description: "无结构化输出。",
    score_3_description: "结构基本可用。",
    score_5_description: "Markdown 清晰且 JSON 完整。",
    failure_examples: ["无 JSON 或 JSON 不可解析。"]
  }
];

export function assertRubricWeights(): void {
  const totalWeight = evalMetrics.reduce((sum, metric) => sum + metric.weight, 0);

  if (totalWeight !== 100) {
    throw new Error(`Rubric weights must sum to 100, got ${totalWeight}`);
  }
}
