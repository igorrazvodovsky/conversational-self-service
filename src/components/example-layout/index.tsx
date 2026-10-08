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
import { DiscussingProvider } from "@/components/chat/discussing";
import { Split } from "./split";
import { Lost } from "@/components/configurator/address";
import {
  TITLE,
  useFollowAddress,
  useMoment,
  usePlace,
} from "@/components/configurator/link";
import { useConfigurator } from "@/components/configurator/provider";

interface ExampleLayoutProps {
  chatContent: ReactNode;
  appContent: ReactNode;
  /** The division the server read from the cookie, so both sides agree. */
  canvasPercent: number;
}

/**
 * Two surfaces: the artifact panel and the chat.
 *
 * The panel is one document, the deal as it stands or as it stood when an
 * offer was issued, read several ways (`docs/ui.md`, "One document, read
 * several ways"). Which view and which moment are open are the viewer's,
 * held in the URL (`configurator/link.tsx`); no rule reaches them.
 *
 * Where the chat sits against that panel — beside it, floating over it, over
 * the whole surface, or put away — is the person's view state too, reset on
 * every load (`chat-surface.tsx`).
 */
export function ExampleLayout({
  chatContent,
  appContent,
  canvasPercent,
}: ExampleLayoutProps) {
  const { view, busy } = useConfigurator();
  const moment = useMoment();
  // The URL is the page's state: its query names the view, followed when
  // the page opens and written back as the view changes
  // (`configurator/link.tsx`); its fragment names an item, and following
  // one opens the view and the moment that hold it and scrolls to it.
  const arrived = usePlace();
  const lost = useFollowAddress(arrived);
  // The tab names the view in front, most specific first: a screen reader
  // announces the title, and a view is this page's route.
  useEffect(() => {
    document.title = `${TITLE[moment.view]} · Northline Lifts`;
  }, [moment.view]);
  const chatSurface = useChatSurface();
  const conversations = useConversations();

  return (
    /* Two surfaces, no navigation column: the conversation list rides in the
       chat's header (`conversation-menu.tsx`). */
    /* A conflict a gesture caused is offered a conversation from the canvas
       and put in the chat (`chat/discussing.tsx`), so both sit inside. */
    <DiscussingProvider
      startNew={conversations.startNew}
      select={conversations.select}
      showChat={() => chatSurface.mode === "hidden" && chatSurface.restore()}
    >
      <div className="relative h-dvh w-full overflow-hidden bg-background">
        <SkipLinks />
        <Split
          canvasPercent={canvasPercent}
          artifact={
            <>
              {/* The panel's own header: the wordmark and the way around the
                  document, views and moments in one row. */}
              <header className="flex min-h-9 shrink-0 flex-wrap items-center gap-x-4 border-b bg-frame pr-3 pl-3">
                <div className="flex shrink-0 items-center gap-1.5">
                  {/* The seller's mark: an up arrow, north, cut out of a
                      solid tile so it holds at favicon size. Northline is the
                      catalogue's vendor, and the assistant is theirs. */}
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="size-5"
                    aria-hidden
                  >
                    <path
                      fillRule="evenodd"
                      d="M2 2H22V22H2ZM12 4.5L19 12H14.5V19.5H9.5V12H5Z"
                    />
                  </svg>
                  <span className="text-base font-extrabold tracking-tight">
                    Northline
                  </span>
                </div>
                <PanelNav />
              </header>
              <CanvasAnnouncer />
              <Lost id={lost} />
              {/* Named by the view's `h1`; focus lands here when the person
                  changes view (`panel-nav.tsx`) or skips to it. */}
              <main
                id="main"
                aria-labelledby="surface-title"
                aria-busy={busy || undefined}
                className="min-h-0 flex-1"
              >
                {/* The view's name, in every state it can be in — loading,
                    empty, refused — for a screen reader; the eye has the nav. */}
                <h1 id="surface-title" data-view={moment.view} className="sr-only">
                  {TITLE[moment.view]}
                  {view ? ` of ${view.product}` : ""}
                </h1>
                {appContent}
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
    </DiscussingProvider>
  );
}

/**
 * The first stops in the tab order, shown only while focused: past the
 * panel's header to the surface, or straight to the chat's composer. They
 * move focus by script rather than by fragment, because a fragment on this
 * page is an item's address and following one may change the view.
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
