"use client";

/**
 * The conversation list, in the chat's header. It replaces
 * `CopilotThreadsDrawer`: the list is a view onto the pane it changes, so it
 * belongs with that pane rather than in a column of its own.
 *
 * The menu takes props only. The page owns the list and the active thread
 * (`useConversations`, below), so a streaming reply, which re-renders the
 * header's mode controls, never re-renders the menu.
 */

import { useEffect, useMemo, useRef } from "react";
import { ChevronDownIcon, MessageSquarePlus } from "lucide-react";
import {
  UseAgentUpdate,
  useAgent,
  useCopilotChatConfiguration,
  useThreads,
} from "@copilotkit/react-core/v2";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Conversation {
  id: string;
  createdAt: string;
}

const LOCALE = "en-IE";

function conversationLabel(createdAt: string): string {
  return new Date(createdAt).toLocaleString(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Inside a day's group the date is the heading. */
function timeLabel(createdAt: string): string {
  return new Date(createdAt).toLocaleTimeString(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function midnight(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function dayHeading(createdAt: string, now: Date): string {
  const started = new Date(createdAt);
  const days = Math.round(
    (midnight(now) - midnight(started)) / (24 * 60 * 60 * 1000),
  );
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return started.toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ConversationMenu({
  conversations,
  activeThreadId,
  onSelect,
  onNew,
  onOpenChange,
  /** False until hydration: a Radix menu in the hydrated tree shifts `useId`
   * values page-wide. */
  interactive,
}: {
  conversations: Conversation[];
  activeThreadId: string | undefined;
  onSelect: (threadId: string) => void;
  onNew: () => void;
  onOpenChange: (open: boolean) => void;
  interactive: boolean;
}) {
  // Rows are labelled by when each conversation started, so they sort by it.
  const threads = [...conversations].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const active = threads.find((t) => t.id === activeThreadId);

  const now = new Date();
  const groups: { heading: string; threads: Conversation[] }[] = [];
  for (const thread of threads) {
    const heading = dayHeading(thread.createdAt, now);
    if (groups.at(-1)?.heading !== heading) groups.push({ heading, threads: [] });
    groups.at(-1)!.threads.push(thread);
  }

  const trigger = (
    <Button
      variant="ghost"
      size="xs"
      title="Conversations"
      className="min-w-0 shrink font-normal text-muted-foreground"
    >
      <span className="truncate">
        <span className="sr-only">Conversation: </span>
        {active ? conversationLabel(active.createdAt) : "New conversation"}
      </span>
      <ChevronDownIcon className="shrink-0" />
    </Button>
  );

  return (
    <div className="flex min-w-0 items-center gap-1">
      {interactive ? (
        <DropdownMenu onOpenChange={onOpenChange}>
          <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {threads.length === 0 ? (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                No conversations yet — this one joins the list on its first
                message.
              </p>
            ) : (
              <DropdownMenuRadioGroup
                value={activeThreadId ?? ""}
                onValueChange={onSelect}
              >
                {groups.map((group) => (
                  <div key={group.heading}>
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                      {group.heading}
                    </DropdownMenuLabel>
                    {group.threads.map((thread) => (
                      <DropdownMenuRadioItem key={thread.id} value={thread.id}>
                        {/* The day heading above is for the eye; a screen
                            reader on the item hears the day too. */}
                        <span className="sr-only">{group.heading}, </span>
                        {timeLabel(thread.createdAt)}
                      </DropdownMenuRadioItem>
                    ))}
                  </div>
                ))}
              </DropdownMenuRadioGroup>
            )}
            {!active && threads.length > 0 && (
              <p className="px-2 py-1.5 text-xs italic text-muted-foreground">
                new conversation — joins the list on its first message
              </p>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        trigger
      )}

      <Button
        variant="ghost"
        size="icon-xs"
        // In a new conversation already, it stays in reach and says so
        // rather than greying out; pressed, it does nothing.
        aria-disabled={!active || undefined}
        onClick={() => active && onNew()}
        title={active ? "New conversation" : "You're in a new conversation now"}
      >
        <MessageSquarePlus />
        <span className="sr-only">
          New conversation{active ? "" : ", you're in one now"}
        </span>
      </Button>
    </div>
  );
}

/**
 * The list comes from the runtime's `GET /threads`, through `useThreads`. The
 * drawer this replaces used the same endpoint, but would not fetch until the
 * runtime reported a license status, which only CopilotKit Intelligence does,
 * so without Intelligence it showed *Loading threads…* forever. Without it the
 * list is the in-memory runner's and ends with the server process; with it the
 * list is durable. A thread joins the list when its first run is recorded.
 */
export function useConversations() {
  const configuration = useCopilotChatConfiguration();
  const agentId = configuration?.agentId ?? "default";
  const { threads, refetchThreads, startNewThread } = useThreads({ agentId });

  const conversations = useMemo(
    () => threads.map(({ id, createdAt }) => ({ id, createdAt })),
    [threads],
  );

  return {
    conversations,
    activeThreadId: configuration?.threadId,
    select: (threadId: string) =>
      configuration?.setActiveThreadId(threadId, { explicit: true }),
    startNew: () => {
      startNewThread();
      configuration?.startNewThread();
    },
    refetch: refetchThreads,
  };
}

/**
 * Draws nothing. Only Intelligence pushes thread changes to the client, so
 * without it the list is refetched when a run ends, which is when a new
 * conversation first appears in it. A leaf of its own because `useAgent`
 * re-renders its caller; filtered to run status, that is twice a turn rather
 * than every token.
 */
export function RefetchWhenRunEnds({ refetch }: { refetch: () => void }) {
  const { agent } = useAgent({ updates: [UseAgentUpdate.OnRunStatusChanged] });
  const wasRunning = useRef(agent.isRunning);

  useEffect(() => {
    if (wasRunning.current && !agent.isRunning) refetch();
    wasRunning.current = agent.isRunning;
  }, [agent.isRunning, refetch]);

  return null;
}
