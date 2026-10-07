"use client";

/**
 * The chat pane, composed from shadcn primitives through CopilotChat's slots
 * (docs/ui.md).
 *
 * CopilotKit keeps the layout it owns — the stick-to-bottom scroller, the
 * overlay the composer sits in, the attachment queue above it, the markdown
 * body of an assistant turn — and every control a person touches is a
 * primitive from `src/components/ui/`: the composer is an `InputGroup`, a
 * suggestion is a `Button`, the welcome screen is `Empty`, a person's turn is
 * a `Bubble`, and the copy and scroll-to-latest controls are `Button`s. The
 * one piece of CopilotKit chrome left in the transcript is its "View in
 * Inspector" button, which the dev inspector draws on a local run only.
 */

import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type MouseEvent,
} from "react";
import {
  ArrowUpIcon,
  Building2Icon,
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  MicIcon,
  PaperclipIcon,
  SquareIcon,
} from "lucide-react";
import {
  CopilotChat,
  CopilotChatAssistantMessage,
  CopilotChatInput,
  CopilotChatMessageView,
  CopilotChatReasoningMessage,
  CopilotChatSuggestionPill,
  CopilotChatUserMessage,
  useCopilotChatConfiguration,
} from "@copilotkit/react-core/v2";

import {
  address,
  addressable,
  arrive,
  goTo,
  targeted,
  useTargeted,
} from "@/components/configurator/address";
import { useFollowLink } from "@/components/configurator/link";
import { useConfigurator } from "@/components/configurator/provider";
import { useStateSuggestions } from "./suggestions";
import { GroupedToolCalls, ToolCallGroups, UngroupedThought } from "./tool-calls";
import {
  ConfiguratorChatView,
  useWaitingQuestion,
  WaitingProvider,
} from "./question";
import { DiscussedConflict, useOpensOnConflict } from "./discussing";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/** The column CopilotKit's own transcript is laid out in, so the composer,
 * the suggestions and the welcome line up with it. Its gutter goes once the
 * chat is as wide as the column; `copilotKitChat` is the container. */
const CHAT_COLUMN = "mx-auto w-full max-w-3xl px-4 @3xl:px-0";

// ─── Composer ───────────────────────────────────────────────────────

/** Forwards the library's ref, value and key handling, so Enter still sends. */
const ComposerTextArea = forwardRef<
  HTMLTextAreaElement,
  ComponentProps<typeof CopilotChatInput.TextArea>
>(function ComposerTextArea({ className: _libraryPadding, ...props }, ref) {
  return (
    <InputGroupTextarea
      ref={ref}
      rows={1}
      // The placeholder goes when the person types; the name stays.
      aria-label="Message the assistant"
      placeholder="Describe the building, or ask a question"
      className="max-h-40 min-h-0 text-sm leading-relaxed"
      {...props}
    />
  );
});

/**
 * The library fills `children` with its stop icon while the agent is
 * answering and leaves it empty otherwise, so `children` is read as that state
 * and redrawn — icon and label together, because a control that stops a run
 * may not announce itself as send.
 */
function ComposerSendButton({
  children,
  ...props
}: ComponentProps<typeof CopilotChatInput.SendButton>) {
  const stops = children != null;
  return (
    <Button size="icon-sm" aria-label={stops ? "Stop" : "Send"} {...props}>
      {stops ? <SquareIcon className="fill-current" /> : <ArrowUpIcon />}
    </Button>
  );
}

function ComposerAddButton({
  onAddFile,
  toolsMenu: _toolsMenu,
  ...props
}: ComponentProps<typeof CopilotChatInput.AddMenuButton>) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Attach a file"
      onClick={() => onAddFile?.()}
      {...props}
    >
      <PaperclipIcon />
    </Button>
  );
}

function ComposerTranscribeButton(
  props: ComponentProps<typeof CopilotChatInput.StartTranscribeButton>,
) {
  return (
    <Button variant="ghost" size="icon-sm" aria-label="Dictate" {...props}>
      <MicIcon />
    </Button>
  );
}

const composer = {
  textArea: ComposerTextArea,
  sendButton: ComposerSendButton,
  addMenuButton: ComposerAddButton,
  startTranscribeButton: ComposerTranscribeButton,
  disclaimer: () => null,
  children: ({
    textArea,
    sendButton,
    addMenuButton,
    audioRecorder,
    startTranscribeButton,
    cancelTranscribeButton,
    finishTranscribeButton,
    mode,
    onStartTranscribe,
    onCancelTranscribe,
    onFinishTranscribe,
  }: Parameters<
    NonNullable<ComponentProps<typeof CopilotChatInput>["children"]>
  >[0]) => (
    /*
      The overlay CopilotKit puts the composer in is `pointer-events-none`, so
      the composer turns them back on. The bottom padding is the pane's own
      1.5rem plus CopilotKit's reservation for its licence banner.
    */
    <div
      className={cn(CHAT_COLUMN, "pointer-events-auto bg-background pt-2")}
      style={{
        paddingBottom:
          "calc(var(--copilotkit-license-banner-offset, 0px) + 1.5rem)",
      }}
    >
      {/*
        Clicking the chrome around the field focuses it, as CopilotKit's own
        composer does. `InputGroupAddon` has the same idea but looks for an
        `input`, and this composer's control is a textarea.

        `InputGroup` also fades itself whole when anything inside is disabled,
        which is meant for a disabled field. Here it is the send button on an
        empty field, or the attach button while dictating, and the field stays
        live, so the fade is taken back on the group rather than the attribute
        taken off the buttons.
      */}
      <TurnFailed />
      <InputGroup
        className="h-auto flex-col items-stretch bg-background has-disabled:bg-background has-disabled:opacity-100 dark:has-disabled:bg-input/30"
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest("button, textarea")) return;
          event.currentTarget.querySelector("textarea")?.focus();
        }}
      >
        {mode === "transcribe" ? (
          audioRecorder
        ) : mode === "processing" ? (
          <div className="flex items-center justify-center py-3">
            <Spinner />
          </div>
        ) : (
          textArea
        )}
        <InputGroupAddon align="block-end" className="gap-1">
          {addMenuButton}
          <div className="ml-auto flex items-center gap-1">
            {mode === "transcribe" ? (
              <>
                {onCancelTranscribe && cancelTranscribeButton}
                {onFinishTranscribe && finishTranscribeButton}
              </>
            ) : (
              <>
                {onStartTranscribe && startTranscribeButton}
                {sendButton}
              </>
            )}
          </div>
        </InputGroupAddon>
      </InputGroup>
    </div>
  ),
};

// ─── Suggestions ────────────────────────────────────────────────────

/** The pills themselves are read from the state in `suggestions.tsx`. */
/** The library indents the strip on a wide screen; here it lines up with the
 * turns above it and the composer below. */
const SuggestionStrip = forwardRef<HTMLDivElement, ComponentProps<"div">>(
  function SuggestionStrip({ className: _libraryMargins, ...props }, ref) {
    return (
      <div
        ref={ref}
        data-slot="suggestion-strip"
        className="mb-3 flex flex-wrap items-center gap-2"
        {...props}
      />
    );
  },
);

const SuggestionPill = forwardRef<
  HTMLButtonElement,
  ComponentProps<typeof CopilotChatSuggestionPill>
>(function SuggestionPill({ icon, isLoading, children, className, ...props }, ref) {
  return (
    <Button
      ref={ref}
      variant="outline"
      size="xs"
      {...props}
      // A long suggestion wraps rather than running out of a narrow chat.
      className={cn(
        className,
        "h-auto min-h-6 max-w-full shrink py-1 text-left whitespace-normal",
      )}
    >
      {isLoading ? <Spinner /> : icon}
      {children}
    </Button>
  );
});

// ─── Messages and the empty conversation ────────────────────────────

/** The library's `onClick` copies and resolves `true` on success, though its
 * type says `void`. */
function CopyButton({
  onClick,
  title,
  name,
  className: _libraryClass,
  ...props
}: ComponentProps<typeof CopilotChatUserMessage.CopyButton> & {
  /** Says whose words are copied, so a list of the transcript's buttons
   * is not a column of identical "Copy". */
  name: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={copied ? `${name}: copied` : name}
      title={title || "Copy"}
      className="text-muted-foreground"
      onClick={async (event) => {
        const copiedIt: unknown = await Promise.resolve(
          onClick?.(event) as unknown,
        );
        if (copiedIt === true) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }}
      {...props}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </Button>
  );
}

function ScrollToBottomButton({
  className: _libraryClass,
  ...props
}: ComponentProps<"button">) {
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Scroll to the latest message"
      className="pointer-events-auto shadow-md"
      {...props}
    >
      <ChevronDownIcon />
    </Button>
  );
}

/**
 * A turn's actions, shown while the pointer is over the turn or focus is in
 * it, and always on a touch screen, which has no hover. The row keeps its
 * height while hidden, so a turn does not move when it appears; that height
 * is the space below a turn, and the turns are spaced around it.
 */
function TurnActions({
  className: _libraryClass,
  align = "start",
  ...props
}: ComponentProps<"div"> & { align?: "start" | "end" }) {
  return (
    <div
      className={cn(
        // The button's own inset is taken back, so the icon lines up with
        // the text above it.
        "invisible mt-1 flex min-h-6 items-center group-focus-within/turn:visible group-hover/turn:visible pointer-coarse:visible",
        align === "end" ? "-mr-1.5 justify-end" : "-ml-1.5",
      )}
      data-slot="turn-actions"
      {...props}
    />
  );
}

const YourActions = (props: ComponentProps<"div">) => (
  <TurnActions {...props} align="end" />
);

const CopyYours = (props: ComponentProps<typeof CopilotChatUserMessage.CopyButton>) => (
  <CopyButton {...props} name="Copy your message" />
);
const CopyReply = (
  props: ComponentProps<typeof CopilotChatAssistantMessage.CopyButton>,
) => <CopyButton {...props} name="Copy the assistant's reply" />;

/** Only the bubble is replaced: CopilotKit's container still draws a turn's
 * attachments above it and its toolbar below. Who is speaking is said in
 * words, since the side a bubble sits on is for the eye. */
function UserBubble({ content }: { content?: string }) {
  return (
    <Bubble align="end" variant="secondary">
      <BubbleContent className="text-sm whitespace-pre-wrap">
        <span className="sr-only">You said: </span>
        {content}
      </BubbleContent>
    </Bubble>
  );
}

/** Words the person's own agent said in the chat, as the person: theirs,
 * and marked as the agent's. Its message carries the flow its words opened
 * as its id, and the view lists those flows (`converse.tsx`). */
function AgentBubble({ content }: { content?: string }) {
  return (
    <Bubble align="end" variant="outline">
      <span className="self-end text-xs text-muted-foreground">Your agent</span>
      <BubbleContent className="text-sm whitespace-pre-wrap">
        {content}
      </BubbleContent>
    </Bubble>
  );
}

/** A message the person sent, at the address of the utterance it became
 * (`#said:<utterance>`), which the trace and the sources link to. */
function OneUserMessage(props: ComponentProps<typeof CopilotChatUserMessage>) {
  const { view } = useConfigurator();
  const agents = view?.agentSaid.includes(props.message.id) ?? false;
  const utterance = view?.said[props.message.id];
  const id = utterance ? address.said(utterance) : undefined;
  const isTarget = useTargeted(id ?? "");
  // Reached from the canvas while another conversation was open, the words
  // render after the address was followed; they go to themselves then.
  const self = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isTarget && self.current) arrive(self.current);
  }, [isTarget]);
  return (
    <div ref={self} id={id} className={cn(addressable, isTarget && targeted)}>
      <CopilotChatUserMessage
        {...props}
        // The library's 2.5rem above a turn is replaced by the space its
        // predecessor's actions leave, and this.
        className="group/turn pt-4!"
        messageRenderer={agents ? AgentBubble : UserBubble}
        copyButton={CopyYours}
        toolbar={YourActions}
      />
    </div>
  );
}

const UserMessage = Object.assign(OneUserMessage, CopilotChatUserMessage);

/** The markdown body stays CopilotKit's, at this app's reading size rather
 * than prose's own 16px (important, because both are utilities and
 * stylesheet order would otherwise decide), and says who is speaking.
 * Prose puts a margin above the first paragraph and below the last, which
 * would add to the turn's own spacing, so the edges are taken back.
 * A turn that is only tool calls has no words to announce or copy. */
function AssistantMarkdown(
  props: ComponentProps<typeof CopilotChatAssistantMessage.MarkdownRenderer>,
) {
  if (!props.content?.trim()) return null;
  return (
    <>
      <span className="sr-only">The assistant said: </span>
      <CopilotChatAssistantMessage.MarkdownRenderer
        {...props}
        className={cn(
          props.className,
          "text-sm! leading-relaxed! *:first:mt-0 *:last:mb-0",
        )}
      />
    </>
  );
}

/**
 * The transcript, as a log: a screen reader hears each new turn once, and
 * nothing while a reply is still being written (`aria-busy`). That a reply
 * has started and finished is said by `RunAnnouncer`.
 */
// Module constants, so the memoised slots see the same props on every
// streamed token and the cursor is not remounted.
const ASSISTANT_MESSAGE = {
  // A turn with no words (`AssistantMarkdown` drew nothing) has nothing to
  // copy; on a local run CopilotKit would still give it a row for the
  // inspector's button, a gap under its tool calls.
  className:
    "group/turn has-[>:first-child:empty]:*:data-[slot=turn-actions]:hidden",
  markdownRenderer: AssistantMarkdown,
  toolbar: TurnActions,
  copyButton: CopyReply,
  toolCallsView: GroupedToolCalls,
};
const Thought = Object.assign(UngroupedThought, CopilotChatReasoningMessage);
const Cursor = () => <Spinner className="size-3 text-muted-foreground" />;

function OneTranscript(props: ComponentProps<typeof CopilotChatMessageView>) {
  // Read from the current messages, past CopilotKit's memo of each one, so a
  // group of tool calls sees the calls that join it (`tool-calls.tsx`).
  return (
    <ToolCallGroups messages={props.messages ?? []} isRunning={props.isRunning}>
      {/* A conversation opened for a conflict starts with its question. */}
      <DiscussedConflict />
      <CopilotChatMessageView
        {...props}
        role="log"
        aria-label="Conversation"
        aria-busy={props.isRunning || undefined}
        userMessage={UserMessage}
        assistantMessage={ASSISTANT_MESSAGE}
        reasoningMessage={Thought}
        cursor={Cursor}
      />
    </ToolCallGroups>
  );
}

const Transcript = Object.assign(OneTranscript, CopilotChatMessageView);

/**
 * An empty thread is not an empty specification: the canvas survives a new
 * conversation and a reload, so the welcome reads the state before it says
 * what to do.
 */
function WelcomeScreen({
  input,
  suggestionView,
}: {
  input: React.ReactElement;
  suggestionView?: React.ReactNode;
}) {
  const { view } = useConfigurator();
  const onConflict = useOpensOnConflict();
  const underway =
    !!view &&
    (view.counts.asked + view.counts.unmet + view.counts.yielded > 0 ||
      view.clauses.length > 0);
  return (
    <div className="flex h-full flex-col">
      {/* No top padding: the question stays where it is when the first
          message turns the welcome into the transcript. */}
      {onConflict ? (
        <div className={cn(CHAT_COLUMN, "flex-1 overflow-y-auto")}>
          <DiscussedConflict />
        </div>
      ) : (
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Building2Icon />
          </EmptyMedia>
          <EmptyTitle>
            {underway ? "Pick up the specification" : "Say what the building needs"}
          </EmptyTitle>
          <EmptyDescription className="text-sm">
            {underway
              ? "Ask about it, or add to it."
              : "Describe the lift and what it has to carry, or start from a suggestion."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
      )}
      <div className={cn(CHAT_COLUMN, "pb-2")}>{suggestionView}</div>
      {input}
    </div>
  );
}

/**
 * A reply may point at the canvas: a markdown link to an item's address
 * (`configurator/address.tsx`), or the page's full URL, which names a view
 * as well (`configurator/link.tsx`) — one the person pasted, or one their
 * own agent wrote. The markdown renderer opens every link in a new tab,
 * which for this page would open the page again, so a link to this page is
 * taken back here and followed in this window.
 */
export function ConfiguratorChat() {
  const follow = useFollowLink();
  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    const anchor = (event.target as HTMLElement).closest("a");
    const href = anchor?.getAttribute("href");
    if (!anchor || !href) return;
    // A modified click asks for a new tab, which is the browser's to open.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    if (href.startsWith("#")) {
      event.preventDefault();
      goTo(decodeURIComponent(href.slice(1)));
    } else if (follow(href)) event.preventDefault();
  };
  return (
    <div className="contents" onClickCapture={onClickCapture}>
      <WaitingProvider>
        <Chat />
      </WaitingProvider>
    </div>
  );
}

/**
 * A turn that failed, said above the composer of the conversation it failed
 * in. CopilotKit's own banner for it stays up across conversations until
 * dismissed (`showDevConsole` turns it off in `app/layout.tsx`), so a new
 * conversation opened under an old failure. The failure is kept with the
 * thread it happened in, and shows only there.
 */
type Failure = { thread?: string; message: string };
const Failed = createContext<{ failure: Failure | null; dismiss: () => void }>({
  failure: null,
  dismiss: () => {},
});

function TurnFailed() {
  const { failure, dismiss } = useContext(Failed);
  const thread = useCopilotChatConfiguration()?.threadId;
  if (!failure || failure.thread !== thread) return null;
  return (
    <Alert variant="destructive" className="mb-2">
      <AlertTitle>The assistant&rsquo;s turn failed</AlertTitle>
      <AlertDescription>
        {failure.message}. What it did before the failure stays done; send your
        message again to carry on.
      </AlertDescription>
      <AlertAction>
        <Button variant="ghost" size="xs" onClick={dismiss}>
          Dismiss
        </Button>
      </AlertAction>
    </Alert>
  );
}

function Chat() {
  useStateSuggestions();
  useWaitingQuestion();
  const thread = useCopilotChatConfiguration()?.threadId;
  const [failure, setFailure] = useState<Failure | null>(null);
  // CopilotChat's `onError` is typed as the div's as well as its own, so the
  // event is read for the one it is.
  const failed = (event: unknown) => {
    const error = (event as { error?: unknown }).error;
    if (error instanceof Error)
      setFailure({ thread, message: error.message.replace(/\.$/, "") });
  };
  return (
    <Failed.Provider value={{ failure, dismiss: () => setFailure(null) }}>
      <CopilotChat
        onError={failed}
        chatView={ConfiguratorChatView}
        attachments={{ enabled: true }}
        input={composer}
        suggestionView={{ container: SuggestionStrip, suggestion: SuggestionPill }}
        welcomeScreen={WelcomeScreen}
        scrollView={{ scrollToBottomButton: ScrollToBottomButton }}
        messageView={Transcript}
      />
    </Failed.Provider>
  );
}
