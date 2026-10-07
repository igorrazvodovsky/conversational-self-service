"use client";

/**
 * A question the assistant put to the person, waiting in the chat.
 *
 * When the model's own turn runs into a conflict it calls `ask`, which
 * records the question and pauses the run on an interrupt
 * (`agent/tools.py`). The interrupt carries the floor and nothing else:
 * every answer is a gesture — a choice, leaving it for now, or a reply in
 * words — and is on record before the run resumes. So this card answers
 * with the canvas's own gestures, watches the view, and resumes the run as
 * soon as the question no longer awaits an answer, however that came about:
 * a click here or on the canvas, the person's own agent over WebMCP, or the
 * conflict going another way. See `docs/syncs/conduct.md`, "Asking, and
 * waiting for the answer".
 *
 * Words typed in the composer while the question waits are a reply to it,
 * not a new turn: the transport refuses a new run while an interrupt is
 * open. `useAnswerInWords` routes them.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ComponentProps,
  type ReactNode,
} from "react";
import { MessageCircleQuestionIcon } from "lucide-react";
import {
  CopilotChatView,
  useInterrupt,
  useRenderTool,
} from "@copilotkit/react-core/v2";
import { z } from "zod";

import { address, To } from "@/components/configurator/address";
import { Answer } from "@/components/configurator/question";
import { useConfigurator, type Question } from "@/components/configurator/provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/** The conflict question as the view reads it, with where it stands. */
function useConflict(): Question | undefined {
  const { view } = useConfigurator();
  return view?.questions.find((q) => q.about === "conflict");
}

/** Whether an interrupt card is mounted, so a reply typed in the composer
 * knows whether a waiting run will pick it up. */
const Waiting = createContext<{ mounted: React.MutableRefObject<boolean> } | null>(null);

export function WaitingProvider({ children }: { children: ReactNode }) {
  const mounted = useRef(false);
  const value = useMemo(() => ({ mounted }), []);
  return <Waiting.Provider value={value}>{children}</Waiting.Provider>;
}

function WaitingQuestion({
  message,
  resolve,
  cancel,
}: {
  message?: string;
  resolve: () => Promise<unknown>;
  cancel: () => Promise<unknown>;
}) {
  const waiting = useContext(Waiting);
  const { gesture, busy, label } = useConfigurator();
  const question = useConflict();
  const status = question?.asked?.status ?? "withdrawn";
  const resumed = useRef(false);

  useEffect(() => {
    if (!waiting) return;
    waiting.mounted.current = true;
    return () => {
      waiting.mounted.current = false;
    };
  }, [waiting]);

  // The question no longer awaits an answer: let the turn go on. A later
  // conflict that displaced the options is not an answer to this one, so
  // that wait is cancelled rather than resolved.
  useEffect(() => {
    if (status === "awaiting" || resumed.current) return;
    resumed.current = true;
    void (status === "overtaken" ? cancel() : resolve());
  }, [status, resolve, cancel]);

  if (!question || status !== "awaiting") return <></>;

  // Answered, the card goes; the keyboard goes back to the composer.
  const answer = (stimulus: Parameters<typeof gesture>[0]) =>
    void gesture(stimulus).then(() =>
      document.querySelector<HTMLElement>("#chat textarea")?.focus(),
    );

  // A region, not an alert: the canvas shows the same question, and its
  // arrival is announced once, politely (`example-layout/announcer.tsx`).
  return (
    <Alert className="my-2" role="region" aria-labelledby="waiting-question">
      <MessageCircleQuestionIcon />
      <AlertTitle id="waiting-question" className="text-sm">The assistant is waiting on you</AlertTitle>
      <AlertDescription>
        <p>
          {message ?? question.asked?.text}{" "}
          <To id={address.question(question.about)} className="text-xs">
            The same question on the canvas
          </To>
        </p>
        <div className="mt-2 flex flex-col gap-2 text-foreground">
          {question.options.map((option, index) => (
            <Answer
              key={index}
              name={label((option as { option: string }).option)}
              foreseen={question.foreseen?.[index]}
              disabled={busy}
              onClick={() =>
                answer({ act: "choose", request: question.request, option })
              }
            />
          ))}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              className="text-muted-foreground"
              onClick={() =>
                answer({ act: "decline", request: question.request })
              }
            >
              Leave it for now
            </Button>
            <span className="text-xs text-muted-foreground">
              or answer in your own words below
            </span>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}

/** What the person sees of an answered question in the transcript, from
 * what `ask` returned: the record survives the card and a reload. */
function AskedRecord({ question, result }: { question?: string; result?: string }) {
  const { label } = useConfigurator();
  let outcome: { status?: string; given?: string; replied?: string; by?: string } = {};
  try {
    outcome = result ? JSON.parse(result) : {};
  } catch {
    outcome = {};
  }
  const answer =
    outcome.status === "chosen"
      ? `Answered: give up ${label(outcome.given ?? "")}`
      : outcome.status === "declined"
        ? "Left for now"
        : outcome.status === "withdrawn"
          ? "Settled another way"
          : outcome.status === "overtaken"
            ? "Replaced by a later conflict"
            : outcome.status === "passed"
              ? "Passed over; open on the canvas"
              : outcome.status === "replied"
                ? `${outcome.by === "the person's own agent" ? "Your agent" : "You"} replied: “${outcome.replied}”`
                : null;
  if (!question) return null;
  return (
    <div className="my-1 border-l-2 pl-3 text-xs text-muted-foreground">
      <p>Asked: {question}</p>
      {answer && <p className="mt-0.5 text-foreground">{answer}</p>}
    </div>
  );
}

/** Renders the waiting question in the chat, for a conflict the model asked,
 * and the question with its answer once it has one. */
export function useWaitingQuestion() {
  useRenderTool(
    {
      name: "ask",
      parameters: z.object({ question: z.string() }),
      render: ({ status, parameters, result }) =>
        status === "complete" ? (
          <AskedRecord question={parameters?.question} result={result} />
        ) : (
          <></>
        ),
    },
    [],
  );
  useInterrupt({
    enabled: (event) =>
      (event.value as { reason?: string } | undefined)?.reason === "conflict",
    render: ({ interrupt, resolve, cancel }) => (
      <WaitingQuestion
        message={interrupt?.message}
        resolve={() => resolve({})}
        cancel={() => cancel()}
      />
    ),
  });
}

/**
 * The chat view, with one change: words submitted while the assistant's
 * question awaits an answer are the person's reply to it, whether typed or
 * a suggestion picked. The reply is a gesture; the card then sees the
 * question replied to and resumes the turn. A suggestion sent as a message
 * would start a run the transport refuses while the interrupt is open.
 */
export function ConfiguratorChatView(props: ComponentProps<typeof CopilotChatView>) {
  const { gesture } = useConfigurator();
  const question = useConflict();
  const waiting = useContext(Waiting);
  const awaiting = question?.asked?.status === "awaiting" ? question.asked : null;

  const submit = props.onSubmitMessage;
  const onSubmitMessage = useCallback(
    (value: string) => {
      // Only the conversation the question waits in holds the floor; words
      // typed in another one are a new turn, and move the person on.
      if (!awaiting || !waiting?.mounted.current) return submit?.(value);
      props.onInputChange?.("");
      void gesture({ act: "reply", about: awaiting.about, text: value });
    },
    [awaiting, submit, gesture, waiting, props],
  );

  const select = props.onSelectSuggestion;
  const onSelectSuggestion = useCallback(
    (...[suggestion, index]: Parameters<NonNullable<typeof select>>) => {
      if (!awaiting || !waiting?.mounted.current) return select?.(suggestion, index);
      void gesture({ act: "reply", about: awaiting.about, text: suggestion.message });
    },
    [awaiting, select, gesture, waiting],
  );

  return (
    <CopilotChatView
      {...props}
      onSubmitMessage={props.onSubmitMessage && onSubmitMessage}
      onSelectSuggestion={props.onSelectSuggestion && onSelectSuggestion}
    />
  );
}
