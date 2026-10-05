"use client";

import type { ReactNode } from "react";
import { PanelNav } from "./panel-nav";
import {
  ChatRestoreButton,
  ChatSurfaceHeader,
  useChatSurface,
} from "./chat-surface";
import { RefetchWhenRunEnds, useConversations } from "./conversation-menu";
import { Split } from "./split";
import { useFollowAddress } from "@/components/configurator/address";
import {
  useConfigurator,
  type Surface,
} from "@/components/configurator/provider";

interface ExampleLayoutProps {
  chatContent: ReactNode;
  requirementsContent: ReactNode;
  appContent: ReactNode;
  quoteContent: ReactNode;
  /** The division the server read from the cookie, so both sides agree. */
  canvasPercent: number;
}

/**
 * Two surfaces: the artifact panel and the chat.
 *
 * Which artifact is on the panel — the requirements, the configuration or
 * the offer — is a fact
 * of `Moding`, held behind the concept layer, and this component renders it
 * rather than owning it. Both the person's navigation and the model's tool call
 * reach it through `Moding/focus`, by a rule; the one that fires when the
 * assistant is about to change the canvas is `TheCanvasIsShownBeforeItChanges`,
 * which the starter wrote as a sentence in a system prompt.
 *
 * Where the chat sits against that panel — beside it, floating over it, over
 * the whole surface, or put away — is not a `Moding` surface. It is the
 * person's view state, reset on every load, and no rule reaches it
 * (`chat-surface.tsx`). The chat used to be a third `Moding` surface, which
 * conflated the two: a rule that meant *show the person the canvas* also
 * decided how wide their transcript was.
 */
export function ExampleLayout({
  chatContent,
  requirementsContent,
  appContent,
  quoteContent,
  canvasPercent,
}: ExampleLayoutProps) {
  const { view } = useConfigurator();
  const mode: Surface =
    view?.mode === "quote" || view?.mode === "requirements" ? view.mode : "canvas";
  // An address names an item on one of the surfaces; following one brings
  // that surface forward and scrolls to the item (`configurator/address.tsx`).
  useFollowAddress();
  // The chat's geometry is the person's and only the person's.
  const chatSurface = useChatSurface();
  const conversations = useConversations();

  return (
    /* Two surfaces, no navigation column: the conversation list rides in the
       chat's header (`conversation-menu.tsx`). */
    <div className="relative h-dvh w-full overflow-hidden bg-background">
      <Split
        canvasPercent={canvasPercent}
        artifact={
          <>
            {/* The panel's own header: the wordmark and the way around the
                panel, surfaces and sections in one row. */}
            <div className="flex h-9 shrink-0 items-center gap-4 border-b pr-3 pl-3">
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="text-base font-extrabold">CopilotKit</span>
                <img
                  src="/copilotkit-logo-mark.svg"
                  alt="CopilotKit"
                  className="h-5"
                />
              </div>
              <PanelNav />
            </div>
            <div className="min-h-0 flex-1">
              {mode === "quote"
                ? quoteContent
                : mode === "requirements"
                  ? requirementsContent
                  : appContent}
            </div>
          </>
        }
        chat={chatContent}
        chatHeader={
          <ChatSurfaceHeader
            mode={chatSurface.mode}
            onSelect={chatSurface.select}
            onHide={chatSurface.hide}
            onUnseenReply={chatSurface.noteReply}
            conversations={conversations.conversations}
            activeThreadId={conversations.activeThreadId}
            onSelectConversation={conversations.select}
            onNewConversation={conversations.startNew}
            onConversationsOpen={(open) => open && conversations.refetch()}
          />
        }
        mode={chatSurface.mode}
      />
      {chatSurface.mode === "hidden" && (
        <ChatRestoreButton
          unseenReplies={chatSurface.unseenReplies}
          onClick={chatSurface.restore}
        />
      )}
      <RefetchWhenRunEnds refetch={conversations.refetch} />
    </div>
  );
}
