import { LangGraphAgent } from "@copilotkit/runtime/langgraph";

/**
 * Builds this starter's agent.
 *
 * Extracted from the runtime route so both mounts share one definition: the
 * route serves the web app over HTTP, and `channel-host.mts` serves a Channel.
 * A fresh instance per call — the channel host sets `threadId` per
 * conversation, so a shared instance would leak state across threads.
 */
export function createDefaultAgent(): LangGraphAgent {
  return new LangGraphAgent({
    deploymentUrl:
      process.env.AGENT_URL ||
      process.env.LANGGRAPH_DEPLOYMENT_URL ||
      "http://localhost:8123",
    graphId: "sample_agent",
    langsmithApiKey: process.env.LANGSMITH_API_KEY || "",
    // Sent with every run, because the graph's own limit does not survive:
    // this adapter streams in `events` mode, the server then runs
    // `astream_events`, and LangChain fills an unset limit with 25 before
    // the graph's 9,999 from `create_agent` is consulted. Each tool call
    // costs four steps (hearing, model, CopilotKit's after-model, tools) and
    // a turn five more, so 25 allows five tool calls — fewer than one turn
    // of stating the context and then reviewing it needs. 100 allows 23.
    assistantConfig: { recursion_limit: 100 },
    // A question the model puts (`ask` in `agent/tools.py`) pauses the run
    // on a LangGraph interrupt. The structured AG-UI outcome is what lets
    // the chat resume it with `RunAgentInput.resume`; the legacy custom
    // event's cancel dismisses without resuming and strands the thread.
    // `docs/syncs/conduct.md`, "The floor is carried by an interrupt".
    emitInterruptOutcome: true,
    enableLegacyOnInterruptEvent: false,
  });
}
