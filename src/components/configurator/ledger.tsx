"use client";

/**
 * The requirement ledger, rendered whole: the asserted section of the
 * configuration, arranged by the requirement each value answers.
 *
 * Its unit is the choice — a value bound to the clause it answers, with what
 * that value forced — and each has an address, `#choice:<id>`. A line is one
 * requirement in the person's words, the choices answering it, and what the
 * rules made of them; a requirement nothing answers is a line with its
 * answer missing, and the values answering nothing are the last line, with
 * its requirement missing. So both of slice 1's gaps are on one view, and
 * with no requirement stated the section is slice 0's: every value on the
 * last line, the `answers` column empty.
 *
 * The question is a read over `Specifying`, `Binding`, `Asserting` and
 * `Constraining` together (`ledger` in `agent/views.py`). The wording of
 * each clause is the requirements surface's; a line links there and does
 * not edit it.
 */

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { address, addressable, targeted as targetedRing, To, useTargeted } from "./address";
import { ClauseText, plain, useAnswering } from "./clauses";
import { useConfigurator, type Answer, type Clause, type Variable, type View } from "./provider";
import { AskedCard } from "./variables";

/** One line of the ledger: a clause and the asserted values answering it. */
export interface Line {
  clause: Clause;
  /** Each answer, with the variable asserting it — none when the answer is
   * displaced or unrealisable — and whether the frame leaves it in. */
  answers: { answer: Answer; variable: Variable | null; inFrame: boolean }[];
}

/**
 * The ledger's lines as the current state and frame fill them. A frame on a
 * clause leaves its line; a frame on an assertion leaves the lines its value
 * answers. `asserted` is already narrowed by the frame.
 */
export function ledger(view: View, asserted: Variable[]) {
  const byName = new Map(asserted.map((v) => [v.name, v]));
  const every = new Map(view.variables.map((v) => [v.name, v]));
  const frame = view.frame;
  const clauses = view.clauses.filter((c) =>
    !frame
      ? true
      : frame.by === "clause"
        ? c.clause === frame.clause
        : c.answers.some((a) => a.variable && byName.has(a.variable)),
  );
  const lines: Line[] = clauses.map((clause) => ({
    clause,
    // Whether an answer still stands is the server's read (`standing`);
    // the frame decides only how much of it is drawn here.
    answers: clause.answers.map((answer) => {
      const stands = answer.standing !== "displaced" && answer.standing !== "unrealisable";
      const variable = stands && answer.variable ? every.get(answer.variable) ?? null : null;
      return { answer, variable, inFrame: !!variable && byName.has(variable.name) };
    }),
  }));
  const unbound = asserted.filter((v) => !v.answers.length);
  const unanswered = lines.filter(
    (l) => !l.answers.length && l.clause.negotiability !== "open",
  ).length;
  return { lines, unbound, unanswered };
}

/**
 * What an asserted value forced: the values that follow and rest on it.
 * The other half of the choice, read off `following`, so the line holds the
 * consequence beside the value rather than a section away.
 */
function Forced({ variable }: { variable: Variable }) {
  const { view, label } = useConfigurator();
  if (!view) return null;
  const forced = view.variables.filter(
    (v) => v.standing === "follows" && v.following.some((f) => f.variable === variable.name),
  );
  if (!forced.length) return null;
  return (
    <p className="px-1 text-xs text-muted-foreground">
      forced{" "}
      {forced.map((v, i) => (
        <span key={v.name}>
          {i ? ", " : ""}
          <To id={address.variable(v.name)} title="Where it follows, on this surface">
            {v.heading.toLowerCase()} {label(v.value)}
          </To>
        </span>
      ))}
    </p>
  );
}

/** An answer with no asserted value on the canvas: displaced or unrealisable. */
function Stale({ answer }: { answer: Answer }) {
  return (
    <p className="text-xs text-muted-foreground">
      {answer.heading ? `${answer.heading}: ` : ""}
      <span className="line-through">{answer.label}</span>{" "}
      {answer.standing === "unrealisable"
        ? "— no variable offers this"
        : "— no longer asserted"}
    </p>
  );
}

/** One choice: the value answering a clause, and what it forced. */
function ChoiceCell({
  answer,
  variable,
  clause,
  first,
  inFrame,
}: {
  answer: Answer;
  variable: Variable | null;
  clause: string;
  first: boolean;
  inFrame: boolean;
}) {
  const { label } = useConfigurator();
  const id = address.choice(answer.choice);
  const isTarget = useTargeted(id);
  return (
    <div id={id} className={cn("min-w-0 space-y-1", addressable, isTarget && targetedRing)}>
      {!variable ? (
        <Stale answer={answer} />
      ) : first ? (
        <>
          <AskedCard variable={variable} under={clause} />
          <Forced variable={variable} />
        </>
      ) : (
        // A value answering more than one clause is drawn once, on the
        // first line it answers, and a value the frame leaves out is not
        // drawn; either way it is named and linked here.
        <p className="px-1 text-xs">
          <span className="uppercase tracking-wide text-muted-foreground">
            {variable.heading}
          </span>{" "}
          <To id={address.variable(variable.name)} title="The value, on the line it was drawn on">
            {label(variable.asked)}
          </To>{" "}
          <span className="text-muted-foreground">
            {inFrame ? "answers this too" : "answers this too, outside the frame"}
          </span>
        </p>
      )}
    </div>
  );
}

function Requirement({ clause }: { clause: Clause }) {
  const firmness =
    clause.negotiability === "fixed"
      ? "fixed"
      : clause.negotiability === "negotiable"
        ? "negotiable"
        : "left open";
  return (
    <div className="min-w-0 border-l-2 border-border pl-3">
      <p className="text-sm">
        <To id={address.clause(clause.clause)} title="The clause, in the requirement ledger's own words">
          <ClauseText text={clause.text} />
        </To>
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {firmness}
        {clause.statedBy === "person" ? "" : clause.source ? " · read by the assistant" : ""}
      </p>
    </div>
  );
}

function Unanswered({ clause }: { clause: Clause }) {
  const { busy } = useConfigurator();
  const { answering, setAnswering } = useAnswering();
  const active = answering?.clause === clause.clause;
  if (clause.negotiability === "open")
    return <p className="text-xs text-muted-foreground">Left open on purpose: nothing needs to answer this.</p>;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span>
        {clause.source?.unanswerable
          ? "The assistant found nothing in the catalogue for this."
          : "Not yet answered."}
        {clause.displaced ? (
          <>
            {" "}
            It was {clause.displaced.label}, displaced by {clause.displaced.byLabel}.
          </>
        ) : null}
      </span>
      <Button
        size="xs"
        variant={active ? "default" : "outline"}
        disabled={busy}
        title={
          active
            ? "Show everything again"
            : "Narrow the canvas to this requirement; a value picked while it is narrowed answers it"
        }
        onClick={() => setAnswering(active ? null : clause)}
      >
        {active ? "Answering…" : "Answer"}
        <span className="sr-only"> “{plain(clause.text)}”</span>
      </Button>
    </div>
  );
}

/** The ledger: one line per requirement, then the values answering none. */
export function Ledger({ asserted }: { asserted: Variable[] }) {
  const { view } = useConfigurator();
  if (!view) return null;
  const { lines, unbound } = ledger(view, asserted);
  const drawn = new Set<string>();
  const line = "grid gap-2 border-b py-3 last:border-b-0 @2xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] @2xl:gap-4";
  return (
    <div role="list" aria-label="Asserted values, by the requirement each answers">
      {lines.map(({ clause, answers }) => (
        <div key={clause.clause} role="listitem" className={line}>
          <Requirement clause={clause} />
          <div className="min-w-0 space-y-2">
            {answers.length ? (
              answers.map(({ answer, variable, inFrame }) => {
                const first = inFrame && !drawn.has(variable!.name);
                if (first) drawn.add(variable!.name);
                return (
                  <ChoiceCell
                    key={answer.choice}
                    answer={answer}
                    variable={variable}
                    clause={clause.clause}
                    first={first}
                    inFrame={inFrame}
                  />
                );
              })
            ) : (
              <Unanswered clause={clause} />
            )}
          </div>
        </div>
      ))}
      {unbound.length ? (
        <div role="listitem" className={line}>
          <div className="min-w-0 border-l-2 border-dashed border-border pl-3">
            <p className="text-sm text-muted-foreground">Answering no stated requirement</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              asserted with nothing said about what for
            </p>
          </div>
          <div className="grid min-w-0 gap-2 @5xl:grid-cols-2">
            {unbound.map((variable) => (
              <div key={variable.name} className="min-w-0 space-y-1">
                <AskedCard variable={variable} under={null} />
                <Forced variable={variable} />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
