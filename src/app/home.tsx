"use client";

import { ExampleLayout } from "@/components/example-layout";
import { ConfiguratorCanvas } from "@/components/configurator";
import { AnsweringProvider } from "@/components/configurator/clauses";
import { RequirementsSurface } from "@/components/configurator/requirements";
import { ConfiguratorProvider } from "@/components/configurator/provider";
import { QuoteSurface } from "@/components/configurator/quotes";
import { BrowserAgentTools } from "@/components/configurator/webmcp";
import { ConfiguratorChat } from "@/components/chat";
import { useGenerativeUIExamples, useExampleSuggestions } from "@/hooks";

import { CopilotChatConfigurationProvider } from "@copilotkit/react-core/v2";

/** The page's client half. `page.tsx` reads the split cookie and renders this. */
export function HomeRoot({ canvasPercent }: { canvasPercent: number }) {
  useGenerativeUIExamples();
  useExampleSuggestions();

  return (
    /*
      One UNCONTROLLED CopilotChatConfigurationProvider (no `threadId` prop) owns
      the active thread for the whole surface. The conversation menu in the
      chat's header drives it through `setActiveThreadId` and `startNewThread`,
      with no host thread-state. The chat and the canvas read the same active
      thread from the provider (the canvas's `useAgent()` falls back to it), so
      they stay on the same per-thread agent clone the chat's /connect replay
      populates. A *controlled* provider would make `startNewThread` a no-op, so
      uncontrolled-inside-provider is required, not optional.
    */
    <CopilotChatConfigurationProvider agentId="default">
      {/*
        The configurator's state lives behind its own actions, beside the agent,
        and this provider is the only thing in the UI that reaches them. It sits
        inside the chat provider because it polls while the agent is running —
        the model's actions land in the same log as the person's clicks, and
        nothing in the CopilotKit state channel would report them.
      */}
      <ConfiguratorProvider>
        {/*
          The model's tools, registered on the page for a browser agent
          (WebMCP). Inside the provider because each call is performed through
          it, so the canvas renders the outcome as it does for a click.
        */}
        <BrowserAgentTools />
        {/* The answering mode is the clause frame, read on both surfaces. */}
        <AnsweringProvider>
          <ExampleLayout
            canvasPercent={canvasPercent}
            chatContent={<ConfiguratorChat />}
            requirementsContent={<RequirementsSurface />}
            appContent={<ConfiguratorCanvas />}
            quoteContent={<QuoteSurface />}
          />
        </AnsweringProvider>
      </ConfiguratorProvider>
    </CopilotChatConfigurationProvider>
  );
}
