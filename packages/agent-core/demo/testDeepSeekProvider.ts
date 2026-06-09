import { createInitialAgentState } from "../state/createInitialState";
import { DeepSeekProvider } from "../llm/deepseekProvider";
import { loadLocalEnv } from "./loadLocalEnv";

async function main(): Promise<void> {
  loadLocalEnv();

  const state = createInitialAgentState({
    idea: "Cross-border seller inventory alert SaaS"
  });
  const provider = new DeepSeekProvider();
  const model = process.env.DEEPSEEK_MODEL_DEFAULT || "deepseek-v4-flash";

  console.log(
    `DEEPSEEK_API_KEY: ${process.env.DEEPSEEK_API_KEY ? "present" : "missing"}`
  );
  console.log(`USE_MOCK_LLM: ${process.env.USE_MOCK_LLM ?? "unset"}`);

  const response = await provider.complete({
    prompt: "Reply in one concise sentence: what can you help with?",
    nodeName: "testDeepSeekProvider",
    model,
    state,
    traceLogger: {
      record(event) {
        const message = event.error?.message ? ` ${event.error.message}` : "";
        console.log(`[trace] ${event.nodeName} ${event.status}${message}`);
      }
    }
  });

  console.log(`model: ${model}`);
  console.log(response);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
