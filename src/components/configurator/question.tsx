"use client";

import { SparklesIcon, TriangleAlertIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { money, tonnes } from "./format";
import { useConfigurator, type Foreseen, type Question } from "./provider";

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
  // A completion whose every value has been taken or declined has nothing
  // left to adopt as a whole; it goes when the specification next moves.
  if (isCompletion && proposed === 0) return null;

  return (
    <Alert variant={isCompletion ? "default" : "destructive"}>
      {isCompletion ? <SparklesIcon /> : <TriangleAlertIcon />}
      <AlertTitle className="text-sm">
        {isCompletion
          ? `The assistant proposed ${proposed} ${proposed === 1 ? "value" : "values"}`
          : "These cannot hold together"}
      </AlertTitle>
      <AlertDescription>
        <p>
          {isCompletion
            ? "Each waits beside its variable under still open. Take them one at a time, or all at once; the assistant cannot."
            : question.reason}
        </p>
        {/* The destructive alert colours everything inside it; the choices
            are ordinary controls, not part of the warning. */}
        <div className="mt-2 flex flex-wrap gap-2 text-foreground">
          {question.options.map((option, index) =>
            isCompletion ? (
              <Button
                key={index}
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() =>
                  void gesture({
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
                  void gesture({
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
              void gesture({ act: "decline", request: question.request })
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
function Answer({
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
  const { view } = useConfigurator();
  const currency = view?.currency ?? "";
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className="block h-auto w-full whitespace-normal px-3 py-2 text-left font-normal"
    >
      <span className="font-medium">Give up {name}</span>
      {foreseen && !foreseen.buildable && (
        <span className="mt-0.5 block text-xs text-muted-foreground">
          still cannot be built
        </span>
      )}
      {foreseen && foreseen.buildable && foreseen.follows.length > 0 && (
        <span className="mt-0.5 block text-xs text-muted-foreground">
          then follows:{" "}
          {foreseen.follows
            .map((f) => `${f.heading} ${f.label}`)
            .join(", ")}
        </span>
      )}
      {foreseen && foreseen.buildable && (
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
    </Button>
  );
}

/** A delta, with its sign; zero reads as no change rather than as a figure. */
function signed(amount: number, format: (n: number) => string) {
  if (amount === 0) return "no change";
  return `${amount > 0 ? "+" : "−"}${format(Math.abs(amount))}`;
}

export function PendingQuestions() {
  const { view } = useConfigurator();
  const questions = view?.questions ?? [];
  if (questions.length === 0) return null;

  return (
    <div className="space-y-2">
      {questions.map((question) => (
        <OneQuestion key={question.about} question={question} />
      ))}
    </div>
  );
}
