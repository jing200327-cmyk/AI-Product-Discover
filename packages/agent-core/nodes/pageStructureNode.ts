import type { AgentState, PageSpec } from "../../shared/types";
import { pageStructurePrompt } from "../prompts";
import { completeWithPrompt, runAgentNode } from "./nodeRuntime";
import type { AgentNodeDeps } from "./types";

export async function pageStructureNode(
  state: AgentState,
  deps: AgentNodeDeps
): Promise<AgentState> {
  return runAgentNode({
    state,
    deps,
    nodeName: "pageStructureNode",
    traceStage: "page_structure",
    input: state.mvpPrd,
    execute: async () => {
      await completeWithPrompt(
        deps,
        state,
        "generatePageStructure",
        pageStructurePrompt.buildPrompt(state.mvpPrd)
      );

      const pages: PageSpec[] = [
        {
          id: "page_workspace",
          name: "产品发现工作台",
          route: "/workspace",
          purpose: "输入产品想法并查看 Agent 分阶段产物。",
          modules: ["产品想法输入", "节点结果区", "Trace 时间线", "导出操作区"],
          fields: ["idea", "targetAudience", "problem", "constraints", "currentStage"],
          operations: ["开始 Mock 运行", "查看节点结果", "重新运行", "导出 Markdown", "导出 JSON"],
          states: ["初始状态", "运行中", "节点成功", "节点失败", "完成"],
          exceptions: ["输入为空", "节点执行失败", "导出内容为空"],
          transitions: ["运行完成后跳转或滚动到结果区", "点击 Trace 项切换对应节点输出"],
          primaryActions: ["开始分析", "导出"],
          sections: ["输入区", "研究结果", "PRD", "页面结构", "评分", "Trace"],
          dataNeeded: ["AgentState", "TraceEvent[]", "ExportResult"]
        },
        {
          id: "page_result_detail",
          name: "节点结果详情",
          route: "/workspace/result",
          purpose: "查看单个节点的输入、输出和证据边界。",
          modules: ["节点摘要", "结构化输出", "证据标记", "错误信息"],
          fields: ["nodeName", "stage", "input", "output", "status", "error"],
          operations: ["查看输入", "查看输出", "复制结果"],
          states: ["有结果", "无结果", "错误"],
          exceptions: ["TraceEvent 不存在", "输出无法序列化"],
          transitions: ["返回工作台", "切换上一个或下一个节点"],
          primaryActions: ["复制", "返回"],
          sections: ["节点信息", "输入", "输出", "错误"],
          dataNeeded: ["TraceEvent"]
        }
      ];

      return { pages };
    }
  });
}
