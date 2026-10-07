"use client";

/**
 * The model's tool calls, grouped: calls made one after another with nothing
 * said between them are one step of the turn, and show as one collapsible
 * row that names them, rather than a column of rows a reply has to be
 * scrolled past to. A thought between two calls of a group goes into it
 * with them, in its place.
 *
 * LangGraph sends each call as its own assistant message, and CopilotKit
 * memoises a message on its own content, so the message a group starts in
 * would not see the calls that join it later. The transcript therefore reads
 * the groups from its current messages (`ToolCallGroups`) and hands them
 * down through context: the message a group starts in draws it, and the
 * messages and thoughts that joined it draw nothing where they stand.
 *
 * Words break a group, as does anything else in the transcript, and so does
 * a call with a renderer of its own (the question's record, for one): what
 * it draws is for reading, not for folding away.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Check, ChevronDown, Wrench } from "lucide-react";
import {
  CopilotChatReasoningMessage,
  useCopilotKit,
  useRenderToolCall,
  type CopilotChatMessageView,
} from "@copilotkit/react-core/v2";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Spinner } from "@/components/ui/spinner";

type Messages = NonNullable<ComponentProps<typeof CopilotChatMessageView>["messages"]>;
type Message = Messages[number];
type ToolCall = NonNullable<Extract<Message, { role: "assistant" }>["toolCalls"]>[number];
type ToolMessage = Extract<Message, { role: "tool" }>;
type Thought = Extract<Message, { role: "reasoning" }>;

type Call = { toolCall: ToolCall; toolMessage?: ToolMessage };
type Item = { call: Call } | { thought: Thought };

type Groups = {
  /** The runs each assistant message draws: a run of several calls is a
   * group, a run of one call is drawn as it is. */
  runs: Map<string, Item[][]>;
  /** The thoughts drawn inside a group rather than where they stand. */
  folded: Set<string>;
  /** The group the next call would join, if nothing has broken it. */
  trailing: Item[] | null;
  messages: Messages;
  isRunning: boolean;
};

const GroupsContext = createContext<Groups | null>(null);

function groupCalls(all: Messages, ownRenderer: (name: string) => boolean) {
  // A message sent twice under one id is drawn once, as its latest, the way
  // CopilotKit's view merges it.
  const messages = [...new Map(all.map((m) => [m.id, m])).values()];
  const results = new Map<string, ToolMessage>();
  for (const m of messages) if (m.role === "tool") results.set(m.toolCallId, m);

  const runs = new Map<string, Item[][]>();
  const folded = new Set<string>();
  let open: Item[] | null = null;
  // Thoughts after the open group's latest call, which join it only if
  // another call follows them.
  let pending: Thought[] = [];
  const close = () => {
    open = null;
    pending = [];
  };
  for (const m of messages) {
    if (m.role === "tool") continue;
    if (m.role === "reasoning") {
      if (open) pending.push(m);
      continue;
    }
    if (m.role !== "assistant") {
      close();
      continue;
    }
    const own: Item[][] = [];
    runs.set(m.id, own);
    if (m.content?.trim()) close();
    for (const toolCall of m.toolCalls ?? []) {
      const call = { toolCall, toolMessage: results.get(toolCall.id) };
      if (ownRenderer(toolCall.function.name)) {
        own.push([{ call }]);
        close();
      } else if (open) {
        for (const thought of pending) {
          open.push({ thought });
          folded.add(thought.id);
        }
        pending = [];
        open.push({ call });
      } else {
        open = [{ call }];
        own.push(open);
      }
    }
  }
  return { runs, folded, trailing: open as Item[] | null };
}

export function ToolCallGroups({
  messages,
  isRunning = false,
  children,
}: {
  messages: Messages;
  isRunning?: boolean;
  children: ReactNode;
}) {
  const { copilotkit } = useCopilotKit();
  const renderers = copilotkit.renderToolCalls;
  const value = useMemo(() => {
    const own = new Set(renderers.map((r) => r.name).filter((name) => name !== "*"));
    return {
      ...groupCalls(messages, (name) => own.has(name)),
      messages,
      isRunning,
    };
  }, [messages, isRunning, renderers]);
  return <GroupsContext.Provider value={value}>{children}</GroupsContext.Provider>;
}

const calls = (items: Item[]) =>
  items.flatMap((item) => ("call" in item ? [item.call] : []));

function summary(items: Item[]) {
  const counts = new Map<string, number>();
  for (const { toolCall } of calls(items))
    counts.set(toolCall.function.name, (counts.get(toolCall.function.name) ?? 0) + 1);
  return [...counts].map(([name, n]) => (n > 1 ? `${name} ×${n}` : name)).join(", ");
}

function ToolGroup({
  items,
  live,
  children,
}: {
  items: Item[];
  /** The turn is running and this group is the last thing in it, so the
   * next call may join it. */
  live: boolean;
  children: ReactNode;
}) {
  const made = calls(items);
  const running = live || made.some((call) => !call.toolMessage);
  const [open, setOpen] = useState(running);
  // Open while the model is working through it, folded once it is done, as
  // a single call's row does. Between two calls the model may be thinking
  // with every result in; the group stays open over that, rather than
  // folding and opening again under the reader.
  useEffect(() => setOpen(running), [running]);
  const latest = made[made.length - 1].toolCall.function.name;
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="my-1.5">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          className="-ml-2 w-[calc(100%+--spacing(2))] justify-start text-muted-foreground"
        >
          {running ? <Spinner className="size-3" /> : <Check />}
          <Wrench />
          <span className="shrink-0">{made.length} calls</span>
          <span className="min-w-0 truncate font-mono">
            {running ? latest : summary(items)}
          </span>
          <ChevronDown className="ml-auto transition-transform group-data-[state=open]/button:rotate-180" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="ml-1.5 border-l pl-3">{children}</CollapsibleContent>
    </Collapsible>
  );
}

/** The assistant message's `toolCallsView` slot. */
export function GroupedToolCalls({ message }: { message: Message }) {
  const groups = useContext(GroupsContext);
  const renderToolCall = useRenderToolCall();
  const runs = groups?.runs.get(message.id) ?? [];
  return (
    <>
      {runs.map((items) => {
        if (items.length === 1 && "call" in items[0]) return renderToolCall(items[0].call);
        const first = calls(items)[0];
        return (
          <ToolGroup
            key={first.toolCall.id}
            items={items}
            live={!!groups?.isRunning && groups.trailing === items}
          >
            {items.map((item) =>
              "call" in item ? (
                renderToolCall(item.call)
              ) : (
                <CopilotChatReasoningMessage
                  key={item.thought.id}
                  message={item.thought}
                  messages={groups?.messages}
                  isRunning={groups?.isRunning}
                />
              ),
            )}
          </ToolGroup>
        );
      })}
    </>
  );
}

/** The transcript's `reasoningMessage` slot: a thought folded into a group
 * is drawn there, and not again where it stands. */
export function UngroupedThought(props: ComponentProps<typeof CopilotChatReasoningMessage>) {
  const groups = useContext(GroupsContext);
  if (groups?.folded.has(props.message.id)) return null;
  return <CopilotChatReasoningMessage {...props} />;
}
