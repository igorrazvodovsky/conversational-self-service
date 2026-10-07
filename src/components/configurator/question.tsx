"use client";

import { SparklesIcon, SplitIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useId } from "react";
import { cn } from "@/lib/utils";
import { address, addressable, targeted, To, useTargeted } from "./address";
import { money, tonnes } from "./format";
import { useConfigurator, type Foreseen, type Question, type View } from "./provider";

/**
 * The open questions, from `Deciding`.
 *
 * There can be more than one. A conflict between assertions and a proposed
 * completion are two questions about the same specification, and they used to
 * share a request — so asking either one erased the other. The request now
 * names the question (`about`) as well as its subject, which is also what tells
 * the two `Deciding/choose` rules apart.
 *
 * Neither shape of option is a catalogue option: one is an assertion that
 * might be given up, the other a whole proposed assignment. `Deciding`'s type
 * parameters cannot be constrained, which is what lets one concept carry both.
 *
 * The completion is the whole; each value it proposes for a still-open
 * variable is a question of its own, shown beside that row (`variables.tsx`).
 * Adopting the whole chooses every proposed value still open, and declining
 * it declines them — `docs/syncs/conduct.md`, "Proposing, and not adopting".
 *
 * A conflict's answers come with what each would do — the values that would
 * then follow, and the price and carbon deltas — read from the solver against
 * assumptions nobody has made (`docs/syncs/propagation.md`, "What each answer
 * would cost is a read"). The person chooses with the consequences in view.
 */
function OneQuestion({ question }: { question: Question }) {
  const { gesture, busy, label, view } = useConfigurator();
  const isCompletion = question.about === "completion";
  const proposed = (view?.variables ?? []).filter((v) => v.proposed).length;
  const title = useId();
  const at = address.question(question.about);
  const isTarget = useTargeted(at);
  // Answered, the card goes; the keyboard goes on to the values it moved.
  const answer = (stimulus: Parameters<typeof gesture>[0]) =>
    void gesture(stimulus).then(() => {
      const next = document.getElementById("asserted");
      if (!next) return;
      next.tabIndex = -1;
      next.focus();
    });

  // A region, not an alert: the chat shows the same question, and its
  // arrival is announced once, politely (`example-layout/announcer.tsx`).
  return (
    <Alert
      id={at}
      role="region"
      aria-labelledby={title}
      className={cn(addressable, isTarget && targeted)}
    >
      {isCompletion ? <SparklesIcon /> : <SplitIcon />}
      <AlertTitle id={title} className="text-sm">
        {isCompletion
          ? `The assistant proposed ${proposed} ${proposed === 1 ? "value" : "values"}`
          : "These cannot hold together"}
      </AlertTitle>
      <AlertDescription>
        <p>
          {isCompletion
            ? "Each waits beside its variable under Open. Take them one at a time, or all at once; the assistant cannot."
            : question.reason}
        </p>
        {isCompletion ? null : <Between question={question} />}
        <Asked question={question} />
        <div className="mt-2 flex flex-wrap gap-2">
          {question.options.map((option, index) =>
            isCompletion ? (
              <Button
                key={index}
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() =>
                  answer({
                    act: "choose",
                    request: question.request,
                    option,
                  })
                }
              >
                Adopt all {proposed}
              </Button>
            ) : (
              <Answer
                key={index}
                name={label((option as { option: string }).option)}
                foreseen={question.foreseen?.[index]}
                disabled={busy}
                onClick={() =>
                  answer({
                    act: "choose",
                    request: question.request,
                    option,
                  })
                }
              />
            ),
          )}
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
        </div>
      </AlertDescription>
    </Alert>
  );
}

/** The assertions a conflict is between, each linked to its card under
 * asserted — where the account of why it cannot be built stays after the
 * question is left. */
function Between({ question }: { question: Question }) {
  const { label } = useConfigurator();
  const options = question.options as { variable: string; option: string }[];
  return (
    <p className="mt-1">
      Between{" "}
      {options.map((option, index) => (
        <span key={option.option}>
          {index > 0 ? (index === options.length - 1 ? " and " : ", ") : null}
          <To id={address.variable(option.variable)}>{label(option.option)}</To>
        </span>
      ))}
      .
    </p>
  );
}

/**
 * Who put the question to the person and what was said back, from
 * `Conversing`. A reply in words leaves the question here: it is how the
 * person's own agent hands back a decision it does not hold, and the person
 * it was meant for reads it beside the answers. `docs/syncs/conduct.md`,
 * "Asking, and waiting for the answer".
 */
function Asked({ question }: { question: Question }) {
  const asked = question.asked;
  // A question answered or overtaken was about the conflict before this one.
  if (!asked || asked.status === "overtaken" || asked.status === "chosen") return null;
  return (
    <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
      <p>
        The assistant asked: “{asked.text}”
      </p>
      {asked.replies.map((reply) => (
        <p key={reply.utterance}>
          {reply.by === "you" ? "You replied" : "Your agent replied"}: “{reply.text}”
        </p>
      ))}
    </div>
  );
}

/** One answer to a conflict: the assertion to give up, and what giving it
 * up would do. Multi-line and left-aligned, so the shared Button has its
 * nowrap and centring relaxed. */
export function Answer({
  name,
  foreseen,
  disabled,
  onClick,
}: {
  name: string;
  foreseen?: Foreseen;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className="block h-auto w-full whitespace-normal px-3 py-2 text-left font-normal"
    >
      <span className="font-medium">Give up {name}</span>
      <Consequences foreseen={foreseen} />
    </Button>
  );
}

/** What one answer would do: whether it can be built, what would then
 * follow, and both deltas. Shared by a conflict's answers and a proposed
 * value's row. */
export function Consequences({ foreseen }: { foreseen?: Foreseen }) {
  const { view } = useConfigurator();
  const currency = view?.currency ?? "";
  if (!foreseen) return null;
  return (
    <>
      {!foreseen.buildable && (
        <span className="mt-0.5 block text-xs text-muted-foreground">
          still cannot be built
        </span>
      )}
      {foreseen.buildable && foreseen.follows.length > 0 && (
        <span className="mt-0.5 block text-xs text-muted-foreground">
          then follows:{" "}
          {foreseen.follows
            .map((f) => `${f.heading} ${f.label}`)
            .join(", ")}
        </span>
      )}
      {foreseen.buildable && foreseen.reopens.length > 0 && (
        <span className="mt-0.5 block text-xs text-muted-foreground">
          no longer forced:{" "}
          {foreseen.reopens
            .map((r) => `${r.heading} ${r.label}`)
            .join(", ")}
        </span>
      )}
      {foreseen.buildable && (
        <span className="mt-0.5 block text-xs tabular-nums text-muted-foreground">
          {signed(foreseen.instalment, (n) => money(n, currency))} a month
          {" · "}
          {signed(foreseen.lifetime, (n) => money(n, currency))} over the term
          {foreseen.carbon !== null && (
            <>
              {" · "}
              {signed(foreseen.carbon, tonnes)} carbon
            </>
          )}
        </span>
      )}
    </>
  );
}

/** A delta, with its sign; zero reads as no change rather than as a figure. */
function signed(amount: number, format: (n: number) => string) {
  if (amount === 0) return "no change";
  return `${amount > 0 ? "+" : "−"}${format(Math.abs(amount))}`;
}

/**
 * The questions still waiting on the person. A completion whose every value
 * has been taken or declined has nothing left to adopt as a whole; it goes
 * when the specification next moves, and until then it is not counted.
 */
export function waiting(view: View): Question[] {
  const proposed = view.variables.some((v) => v.proposed);
  return view.questions.filter((q) => q.about !== "completion" || proposed);
}

export function PendingQuestions() {
  const { view } = useConfigurator();
  const questions = view ? waiting(view) : [];
  if (questions.length === 0) return null;

  return (
    <div className="space-y-2">
      {questions.map((question) => (
        <OneQuestion key={question.about} question={question} />
      ))}
    </div>
  );
}
