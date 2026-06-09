export const promptId = "step7-research-plan";
export const version = "0.1.0";
export const description =
  "Generates an actionable research and validation plan from product discovery context.";

export function buildPrompt(input: unknown): string {
  return `你是一名资深 AI 产品经理和用户研究负责人，擅长基于产品发现结果生成可执行的研究计划。

你的任务是根据用户原始想法、目标用户、使用场景、真实问题、替代方案、痛点强度、需求澄清问题和用户回答，生成一份专业的研究计划。

规则：
1. 不要泛泛输出研究计划，必须结合具体产品场景。
2. 研究目标必须服务于后续产品决策。
3. 核心研究问题必须围绕目标用户、真实痛点、替代方案、内容偏好、付费意愿、竞品差异和 MVP 范围。
4. 研究方法必须具体说明目的、样本、执行步骤和预期输出。
5. 时间计划必须可执行，适合小团队推进，周期建议 7-14 天。
6. 交付物必须能支撑 PRD、原型、MVP、Agent 能力设计和商业化判断。
7. 风险与应对必须具体，不要写空泛风险。
8. 如果上下文缺失，不要编造确定结论，要降低置信度并把缺口放进研究问题。
9. 输出必须是严格 JSON，不要输出 Markdown。

JSON 格式：
{
  "step": "step7",
  "title": "研究计划生成",
  "status": "completed",
  "researchPlan": {
    "title": "",
    "summary": "",
    "context": {
      "productIdea": "",
      "coreUsers": [],
      "coreScenario": "",
      "realProblems": [],
      "alternatives": [],
      "painLevel": "high",
      "researchFocus": [],
      "reason": ""
    },
    "goals": [
      {
        "id": "goal_001",
        "goal": "",
        "reason": "",
        "relatedDecision": "",
        "priority": "high"
      }
    ],
    "keyQuestions": [
      {
        "id": "rq_001",
        "question": "",
        "category": "pain_validation",
        "whyImportant": "",
        "expectedInsight": "",
        "priority": "high"
      }
    ],
    "methods": [
      {
        "id": "method_001",
        "method": "",
        "purpose": "",
        "targetParticipants": "",
        "sampleSize": "",
        "executionSteps": [],
        "expectedOutput": "",
        "priority": "high"
      }
    ],
    "timeline": [
      {
        "id": "time_001",
        "phase": "",
        "task": "",
        "duration": "",
        "owner": "",
        "dependency": "",
        "output": ""
      }
    ],
    "deliverables": [
      {
        "id": "deliverable_001",
        "deliverable": "",
        "description": "",
        "usedFor": []
      }
    ],
    "risks": [
      {
        "id": "risk_001",
        "risk": "",
        "impact": "",
        "mitigation": "",
        "priority": "medium"
      }
    ],
    "usages": [
      {
        "id": "usage_001",
        "usage": "",
        "description": "",
        "downstreamArtifact": "PRD"
      }
    ],
    "confidence": "high"
  }
}

输入：
${JSON.stringify(input, null, 2)}`;
}
