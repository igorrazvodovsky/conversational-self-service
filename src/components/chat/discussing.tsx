"use client";

/**
 * A conflict a gesture caused, taken into the chat.
 *
 * The model is not run on a gesture, so a conflict the person's click or
 * their agent's call ran into has no turn to be asked in. The canvas holds
 * the fact and offers a conversation for it; following that opens a new
 * conversation which starts with the question and its answers, put by the
 * configurator rather than by the assistant. The conversation in progress is
 * left as it was. Words written there open a turn like any other, and the
 * model reads the open question in `review`. See `docs/moves.md`, "The
 * conflict, as the worked case".
 *
 * Which conversation was opened for which conflict is the person's view
 * state, kept in this browser and nowhere else: the conflict is the
 * `Deciding` request, and the conversation only a place to talk about it.
 * A conflict is known by the assertions it is between, since every conflict
 * over one specification shares a request.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { SplitIcon } from "lucide-react";
import { useCopilotChatConfiguration } from "@copilotkit/react-core/v2";

import { Answer, useAnswerName } from "@/components/configurator/question";
import { useAskedHere } from "./question";
import {
  useConfigurator,
  type Question,
  type View,
} from "@/components/configurator/provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type Option = { variable: string; option: string };

/** What a conversation remembers of the conflict it was opened for. */
type Discussed = { key: string; options: Option[] };

const STORE = "configurator.discussing";

function load(): Record<string, Discussed> {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? "{}");
  } catch {
    return {};
  }
}

function save(threads: Record<string, Discussed>) {
  try {
    localStorage.setItem(STORE, JSON.stringify(threads));
  } catch {
    // Without storage the conversation still opens; a reload forgets which.
  }
}

function optionsOf(question: Question): Option[] {
  return question.options as Option[];
}

function keyOf(options: Option[]): string {
  return options
    .map((o) => `${o.variable}=${o.option}`)
    .sort()
    .join("&");
}

/** The open conflict, if there is one. */
export function openConflict(view: View | null): Question | undefined {
  return view?.questions.find((q) => q.about === "conflict");
}

const Discussing = createContext<{
  threads: Record<string, Discussed>;
  discuss: (question: Question) => void;
} | null>(null);

/**
 * Sits above the canvas and the chat: the canvas offers the conversation,
 * the chat shows it. `startNew`, `select` and `showChat` are the layout's.
 */
export function DiscussingProvider({
  children,
  startNew,
  select,
  showChat,
}: {
  children: ReactNode;
  startNew: () => void;
  select: (thread: string) => void;
  showChat: () => void;
}) {
  const thread = useCopilotChatConfiguration()?.threadId;
  const [threads, setThreads] = useState<Record<string, Discussed>>({});
  const [pending, setPending] = useState<{ from?: string; discussed: Discussed } | null>(null);

  useEffect(() => setThreads(load()), []);

  // The new conversation has its id once the provider has moved to it.
  useEffect(() => {
    if (!pending || !thread || thread === pending.from) return;
    setThreads((current) => {
      const next = { ...current, [thread]: pending.discussed };
      save(next);
      return next;
    });
    setPending(null);
  }, [pending, thread]);

  const discuss = useCallback(
    (question: Question) => {
      const options = optionsOf(question);
      const key = keyOf(options);
      showChat();
      const opened = Object.entries(threads).find(([, d]) => d.key === key)?.[0];
      if (opened) {
        if (opened !== thread) select(opened);
      } else {
        setPending({ from: thread, discussed: { key, options } });
        startNew();
      }
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>("#chat textarea")?.focus(),
      );
    },
    [threads, thread, select, startNew, showChat],
  );

  const value = useMemo(() => ({ threads, discuss }), [threads, discuss]);
  return <Discussing.Provider value={value}>{children}</Discussing.Provider>;
}

/** Opens the conversation for the open conflict, or returns to it. */
export function useDiscuss() {
  return useContext(Discussing)?.discuss;
}

/** The conflict this conversation was opened for, if it was. */
function useDiscussed(): Discussed | undefined {
  const threads = useContext(Discussing)?.threads;
  const thread = useCopilotChatConfiguration()?.threadId;
  return thread ? threads?.[thread] : undefined;
}

/** Whether this conversation opens on a conflict, so the welcome gives way. */
export function useOpensOnConflict(): boolean {
  return !!useDiscussed();
}

/**
 * The question at the head of a conversation opened for a conflict. Once
 * the assistant has put the same question in this conversation and waits,
 * its card in the turn is the one to answer, and this one steps back; until
 * that card is on screen, this one stays. Once the conflict is gone
 * it says how it ended: given way, or left for now with the values still
 * refused.
 */
export function DiscussedConflict() {
  const discussed = useDiscussed();
  const { view, gesture, busy } = useConfigurator();
  const answerName = useAnswerName();
  const askedHere = useAskedHere();
  if (!discussed || !view) return null;

  const question = openConflict(view);
  const current = question && keyOf(optionsOf(question)) === discussed.key;
  const names = discussed.options.map((o) => answerName(o.option)).join(" and ");

  if (!current) {
    const unmet = new Set(
      view.variables.filter((v) => v.standing === "unmet").map((v) => v.name),
    );
    const left = discussed.options.some((o) => unmet.has(o.variable));
    return (
      <div className="my-2 border-l-2 pl-3 text-xs text-muted-foreground">
        <p>Asked: which gives way, {names}?</p>
        <p className="mt-0.5 text-foreground">
          {left ? "Left for now; still not buildable." : "Settled."}
        </p>
      </div>
    );
  }
  if (question.asked?.status === "awaiting" && askedHere) return null;

  const answer = (stimulus: Parameters<typeof gesture>[0]) =>
    void gesture(stimulus).then(() =>
      document.querySelector<HTMLElement>("#chat textarea")?.focus(),
    );

  return (
    <Alert className="my-2" role="region" aria-labelledby="discussed-conflict">
      <SplitIcon />
      <AlertTitle id="discussed-conflict" className="text-sm">
        These cannot hold together
      </AlertTitle>
      <AlertDescription>
        <p>{question.reason}</p>
        <p className="mt-1">Which gives way?</p>
        <div className="mt-2 flex flex-col gap-2 text-foreground">
          {question.options.map((option, index) => (
            <Answer
              key={index}
              name={answerName((option as Option).option)}
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
              or ask the assistant about it below
            </span>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
