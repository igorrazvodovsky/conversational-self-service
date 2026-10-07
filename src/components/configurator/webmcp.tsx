"use client";

/**
 * The person's gestures, registered on the page for their own agent.
 *
 * WebMCP lets an agent in the person's browser — Chrome's own, or any other
 * that reads `document.modelContext` — call tools a page registers, and the
 * MCP-B relay forwards them to a desktop client that speaks only stdio. An
 * agent in the browser finds the seller's page's tools with no setup, which
 * is why they are here as well as on the MCP server.
 *
 * Whose agent it is decides what it may do. The in-app assistant is the
 * seller's, and its tools are in `agent/tools.py`. An agent the person
 * brings is theirs, and its tools are one table, held by the MCP server
 * (`agent/delegate.py`): the person's gestures, the model's verbs a person
 * has no gesture for, and the reads. This page reads that table and
 * registers each tool on the model context as it stands, forwarding every
 * call to the server, so the tools here and there cannot drift apart. A tool
 * only an MCP Apps view may call is the person's own hand and is left out.
 * See `docs/syncs/conduct.md`, "The person's own agent, acting as the person".
 *
 * They are registered on the model context directly, not as CopilotKit
 * frontend tools, so the assistant is never offered the person's gestures.
 * `converse` and `listen` (`chat/converse.tsx`) are the exception: they run
 * in this page's conversation, so they are CopilotKit tools, registered
 * under an agent id no in-app agent has.
 *
 * The server links every unit a tool returns against the page's public
 * origin. `here`, the URL of the view the call left, is written again from
 * this tab, so it carries the conversation the person has open.
 */

import { useFrontendTool } from "@copilotkit/react-core/v2";
import { useEffect } from "react";
import { z } from "zod";

import { linked, viewLink } from "./link";
import { useConfigurator } from "./provider";

/** The agent id `converse` and `listen` are constrained to: none that exists in-app. */
export const BROWSER = "browser";

/** WebMCP's model context, as far as this page uses it. */
type ModelContext = {
  registerTool: (
    tool: {
      name: string;
      description: string;
      inputSchema: Record<string, unknown>;
      execute: (args: Record<string, unknown>) => Promise<unknown>;
      annotations?: { readOnlyHint?: boolean };
    },
    options: { signal: AbortSignal },
  ) => Promise<void> | void;
};

const modelContext = () =>
  typeof document === "undefined"
    ? null
    : ((document as unknown as { modelContext?: ModelContext }).modelContext ?? null);

/** A tool that runs in this page, for what only the page can do. Registered
 * once: the handlers reach the page only through the provider's stable
 * callbacks, so re-registering on every render would only tell the agent its
 * tools changed when they had not. */
export function useTool<Shape extends z.ZodRawShape>(
  name: string,
  description: string,
  shape: Shape,
  handler: (args: z.infer<z.ZodObject<Shape>>) => Promise<unknown>,
) {
  const { latest } = useConfigurator();
  useFrontendTool(
    {
      name,
      description,
      parameters: z.object(shape),
      handler: async (args: z.infer<z.ZodObject<Shape>>) => {
        const result = linked(await handler(args));
        const view = latest();
        return result && typeof result === "object" && !Array.isArray(result) && view
          ? { ...result, here: viewLink(view) }
          : result;
      },
      agentId: BROWSER,
      webmcp: true,
    },
    [name],
  );
}

export function BrowserAgentTools() {
  const { tools, call, latest } = useConfigurator();

  useEffect(() => {
    const context = modelContext();
    if (!context) return;
    const controller = new AbortController();
    void (async () => {
      let listed;
      try {
        listed = await tools();
      } catch (cause) {
        console.warn("[webmcp] the person's agent's tools could not be read", cause);
        return;
      }
      for (const tool of listed) {
        if (controller.signal.aborted) return;
        const visibility = tool._meta?.ui?.visibility;
        if (visibility && !visibility.includes("model")) continue;
        try {
          await context.registerTool(
            {
              name: tool.name,
              description: tool.description ?? tool.name,
              inputSchema: tool.inputSchema,
              annotations: tool.annotations?.readOnlyHint ? { readOnlyHint: true } : undefined,
              execute: async (args) => {
                const result = await call(tool.name, args ?? {});
                const view = latest();
                return result && typeof result === "object" && !Array.isArray(result) && view && "here" in result
                  ? { ...result, here: viewLink(view) }
                  : result;
              },
            },
            { signal: controller.signal },
          );
        } catch (cause) {
          console.warn(`[webmcp] ${tool.name} was not registered`, cause);
        }
      }
    })();
    return () => controller.abort();
  }, [tools, call, latest]);

  return null;
}
