"use client";

import { SparklesIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useId } from "react";
import { cn } from "@/lib/utils";
import { address, addressable, targeted, useTargeted } from "./address";
import { money, tonnes } from "./format";
import { useConfigurator, type Foreseen, type Question, type View } from "./provider";

/**
 * The questions waiting on the canvas, from `Deciding`: the proposed
 * completion, which only the person can take. A conflict is a question too,
 * but it is put in the chat, where the person can ask why before choosing;
 * the canvas holds only the fact of it (`standing.tsx`, and
 * `docs/moves.md`, "The conflict, as the worked case").
 *
 * The completion is the whole; each value it proposes for a still-open
 * variable is a question of its own, shown beside that row (`variables.tsx`).
 * Adopting the whole chooses every proposed value still open, and declining
 * it declines them — `docs/syncs/conduct.md`, "Proposing, and not adopting".
 */
function OneQuestion({ question }: { question: Question }) {
  const { gesture, busy, view } = useConfigurator();
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

  // A region, not an alert: its arrival is announced once, politely
  // (`example-layout/announcer.tsx`).
  return (
    <Alert
      id={at}
      role="region"
      aria-labelledby={title}
      className={cn(addressable, isTarget && targeted)}
    >
      <SparklesIcon />
      <AlertTitle id={title} className="text-sm">
        {`The assistant proposed ${proposed} ${proposed === 1 ? "value" : "values"}`}
      </AlertTitle>
      <AlertDescription>
        <p>
          Each waits beside its variable under Open. Take them one at a time,
          or all at once; the assistant cannot.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {question.options.map((option, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() =>
                answer({ act: "choose", request: question.request, option })
              }
            >
              Adopt all {proposed}
            </Button>
          ))}
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

/** An option as an answer names it: under its variable's heading, since
 * an option's label alone can be a bare "None" that says nothing of what
 * is given up. */
export function useAnswerName() {
  const { view, label } = useConfigurator();
  return (id: string) => {
    const variable = view?.variables.find((v) => v.options.some((o) => o.id === id));
    return variable ? `${variable.heading}: ${label(id)}` : label(id);
  };
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
 * The questions waiting on the canvas. A completion whose every value has
 * been taken or declined has nothing left to adopt as a whole; it goes when
 * the specification next moves, and until then it is not counted.
 */
export function waiting(view: View): Question[] {
  const proposed = view.variables.some((v) => v.proposed);
  return view.questions.filter((q) => q.about === "completion" && proposed);
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
