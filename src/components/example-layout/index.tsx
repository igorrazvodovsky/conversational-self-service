"use client";

import { useEffect, type MouseEvent, type ReactNode } from "react";
import { PanelNav } from "./panel-nav";
import {
  ChatRestoreButton,
  ChatSurfaceHeader,
  useChatSurface,
} from "./chat-surface";
import { RefetchWhenRunEnds, useConversations } from "./conversation-menu";
import { CanvasAnnouncer, RunAnnouncer } from "./announcer";
import { Split } from "./split";
import { useFollowAddress } from "@/components/configurator/address";
import {
  useConfigurator,
  type Surface,
} from "@/components/configurator/provider";

const TITLE: Record<Surface, string> = {
  requirements: "Requirements",
  canvas: "Configuration",
  quote: "Quotes",
};

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
  // The tab names the surface in front, most specific first: a screen
  // reader announces the title, and a surface is this page's route.
  useEffect(() => {
    document.title = `${TITLE[mode]} · Northline Lifts`;
  }, [mode]);
  // The chat's geometry is the person's and only the person's.
  const chatSurface = useChatSurface();
  const conversations = useConversations();

  return (
    /* Two surfaces, no navigation column: the conversation list rides in the
       chat's header (`conversation-menu.tsx`). */
    <div className="relative h-dvh w-full overflow-hidden bg-background">
      <SkipLinks />
      <Split
        canvasPercent={canvasPercent}
        artifact={
          <>
            {/* The panel's own header: the wordmark and the way around the
                panel, surfaces and sections in one row. */}
            <header className="flex min-h-9 shrink-0 flex-wrap items-center gap-x-4 border-b bg-frame pr-3 pl-3">
              <div className="flex shrink-0 items-center gap-1.5">
                {/* The seller's mark: a lift's doors under its up arrow.
                    Northline is the catalogue's vendor, and the assistant
                    is theirs. */}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="size-5"
                  aria-hidden
                >
                  <rect x="3" y="2" width="18" height="20" />
                  <path d="M3 8H21M12 8V22M9 6L12 3.5L15 6" />
                </svg>
                <span className="text-base font-extrabold tracking-tight">
                  Northline
                </span>
              </div>
              <PanelNav />
            </header>
            <CanvasAnnouncer />
            {/* Named by the surface's `h1`; focus lands here when the person
                changes surface (`panel-nav.tsx`) or skips to it. */}
            <main
              id="main"
              aria-labelledby="surface-title"
              className="min-h-0 flex-1"
            >
              {/* The surface's name, in every state it can be in — loading,
                  empty, refused — for a screen reader; the eye has the nav. */}
              <h1 id="surface-title" data-surface={mode} className="sr-only">
                {TITLE[mode]}
                {view ? ` of ${view.product}` : ""}
              </h1>
              {mode === "quote"
                ? quoteContent
                : mode === "requirements"
                  ? requirementsContent
                  : appContent}
            </main>
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
      {/* Outside the chat, which is `inert` while hidden: a reply that
          arrives then is the one most worth announcing. */}
      <RunAnnouncer />
      <RefetchWhenRunEnds refetch={conversations.refetch} />
    </div>
  );
}

/**
 * The first stops in the tab order, shown only while focused: past the
 * panel's header to the surface, or straight to the chat's composer. They
 * move focus by script rather than by fragment, because a fragment on this
 * page is an item's address and following one may change the surface.
 */
function SkipLinks() {
  const skip = (event: MouseEvent, find: () => HTMLElement | null) => {
    event.preventDefault();
    const target = find();
    if (!target) return;
    if (!target.matches("textarea, input, button, a[href], [tabindex]"))
      target.tabIndex = -1;
    target.focus();
  };
  const link =
    "sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:z-50 focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow-md";
  return (
    <>
      <a
        href="#main"
        className={link}
        onClick={(event) =>
          skip(event, () => document.getElementById("main"))
        }
      >
        Skip to the panel
      </a>
      <a
        href="#chat"
        className={link}
        onClick={(event) =>
          skip(event, () =>
            document.querySelector<HTMLElement>("#chat textarea"),
          )
        }
      >
        Skip to the chat
      </a>
    </>
  );
}
