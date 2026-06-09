import { runProductDiscoveryAgent } from "../orchestrator";
import {
  createDefaultLlmProvider,
  createDefaultModelRouter,
  getActiveLlmProviderKind
} from "../llm";
import type { LlmProvider } from "../nodes";
import { loadLocalEnv } from "./loadLocalEnv";

async function main(): Promise<void> {
  loadLocalEnv();

  const modelRouter = createDefaultModelRouter();
  const baseLlmProvider = createDefaultLlmProvider();
  const loggingLlmProvider: LlmProvider = {
    async complete(input) {
      console.log(
        `[llm] provider=${getActiveLlmProviderKind()} node=${input.nodeName} model=${input.model}`
      );

      return baseLlmProvider.complete(input);
    }
  };

  console.log(
    `DEEPSEEK_API_KEY: ${process.env.DEEPSEEK_API_KEY ? "present" : "missing"}`
  );
  console.log(`USE_MOCK_LLM: ${process.env.USE_MOCK_LLM ?? "unset"}`);
  console.log(`LLM provider: ${getActiveLlmProviderKind()}`);

  const finalState = await runProductDiscoveryAgent(
    {
      idea: "一个帮助 AI 产品经理从产品想法生成竞品分析、MVP PRD、页面结构和评分的 Agent",
      targetAudience: "AI 产品经理、创业者、独立开发者和咨询顾问",
      constraints: ["先使用 Mock LLM", "先使用 Mock Search", "所有节点必须记录 Trace"]
    },
    {
      autoAnswerClarification: true,
      deps: {
        llmProvider: loggingLlmProvider,
        modelRouter,
        traceLogger: {
          record(event) {
            if (event.nodeName === "llm:deepseek") {
              console.log(`[trace] ${event.nodeName} ${event.status}`);
            }
          }
        }
      },
      onEvent(event) {
        console.log(`[${event.stage}] ${event.message}`);
      }
    }
  );

  console.log("\n=== Final Stage ===");
  console.log(finalState.stage);

  console.log("\n=== MVP PRD ===");
  console.log(JSON.stringify(finalState.mvpPrd, null, 2));

  console.log("\n=== Page Structure ===");
  console.log(JSON.stringify(finalState.pages, null, 2));

  console.log("\n=== Evaluation ===");
  console.log(JSON.stringify(finalState.evaluation, null, 2));

  console.log("\n=== Mermaid ===");
  console.log(finalState.exports?.mermaid);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
