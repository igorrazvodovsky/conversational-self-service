"use client";

/**
 * What answers each requirement, on the requirement's own line.
 *
 * The ledger is the requirement document (`specification.tsx`): each clause
 * is a line, its words on the left, editable, and on the right the choices
 * answering it — a value bound to the clause, with what the value forced —
 * each at `#choice:<id>`. This module draws the right-hand side, and the last
 * line, the values answering no clause. A clause nothing answers is a line
 * with a gap where its answer goes, so both of slice 1's gaps are on one
 * view, and with no clause stated the section is slice 0's: every value on
 * the last line.
 *
 * The question is a read over `Specifying`, `Binding`, `Asserting` and
 * `Constraining` together (`ledger` in `agent/views.py`); whether an answer
 * still stands is the read's `standing`, and the frame decides only how much
 * of it is drawn.
 */

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { address, addressable, targeted as targetedRing, To, useTargeted } from "./address";
import { useConfigurator, type Answer, type Clause, type Variable, type View } from "./provider";
import { AskedCard } from "./variables";

/** One choice on a line: its answer, the variable asserting it, and how it is drawn. */
export interface Drawn {
  answer: Answer;
  /** None when the answer is displaced or unrealisable. */
  variable: Variable | null;
  /** Whether the frame leaves the variable in. */
  inFrame: boolean;
  /** Drawn whole here: the first line it answers, inside the frame. */
  whole: boolean;
}

/**
 * The values a party asserted, as the frame narrows them. A yielded or unmet
 * value is asserted: it sits with what was asked for, not with what followed,
 * because nothing about the person's requirement changed.
 */
export function framedAsserted(view: View): Variable[] {
  return view.variables.filter(
    (v) =>
      v.framed && (v.standing === "asked" || v.standing === "yielded" || v.standing === "unmet"),
  );
}

/**
 * The ledger as the current state and frame fill it: which lines are in the
 * frame, each line's choices, and the values answering none. A frame on a
 * clause leaves its line; a frame on an assertion leaves the lines its value
 * answers. `asserted` is already narrowed by the frame.
 */
export function ledger(view: View, asserted: Variable[]) {
  const byName = new Map(asserted.map((v) => [v.name, v]));
  const every = new Map(view.variables.map((v) => [v.name, v]));
  const frame = view.frame;
  const shown = new Set(
    view.clauses
      .filter((c) =>
        !frame
          ? true
          : frame.by === "clause"
            ? c.clause === frame.clause
            : c.answers.some((a) => a.variable && byName.has(a.variable)),
      )
      .map((c) => c.clause),
  );
  const whole = new Set<string>();
  const lines = new Map<string, Drawn[]>();
  for (const clause of view.clauses) {
    lines.set(
      clause.clause,
      clause.answers.map((answer) => {
        const stands = answer.standing !== "displaced" && answer.standing !== "unrealisable";
        const variable = stands && answer.variable ? every.get(answer.variable) ?? null : null;
        const inFrame = !!variable && byName.has(variable.name);
        // Drawn whole once, on the first line in the frame that it answers.
        const first = inFrame && shown.has(clause.clause) && !whole.has(variable!.name);
        if (first) whole.add(variable!.name);
        return { answer, variable, inFrame, whole: first };
      }),
    );
  }
  const unbound = asserted.filter((v) => !v.answers.length);
  const unanswered = view.clauses.filter(
    (c) => shown.has(c.clause) && !c.answers.length && c.negotiability !== "open",
  ).length;
  return { shown, lines, unbound, unanswered };
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

/** An answer with no asserted value: displaced or unrealisable. */
function Gone({ answer }: { answer: Answer }) {
  return (
    <p className="text-xs text-muted-foreground">
      {answer.heading ? `${answer.heading}: ` : ""}
      <span className="line-through">{answer.label}</span>{" "}
      {answer.standing === "unrealisable" ? "— no variable offers this" : "— no longer asserted"}
    </p>
  );
}

/** One choice: the value answering the clause, and what it forced. */
function Choice({ drawn, clause }: { drawn: Drawn; clause: string }) {
  const { label } = useConfigurator();
  const { answer, variable, inFrame, whole } = drawn;
  const id = address.choice(answer.choice);
  const isTarget = useTargeted(id);
  return (
    <div id={id} className={cn("min-w-0 space-y-1", addressable, isTarget && targetedRing)}>
      {!variable ? (
        <Gone answer={answer} />
      ) : whole ? (
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
          <To id={address.variable(variable.name)} title="The value, where it is drawn">
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

/**
 * The right-hand side of a clause's line: its choices, or the gap where they
 * go. The way to answer is the line's own control, beside its words.
 */
export function Answers({ clause, drawn }: { clause: Clause; drawn: Drawn[] }) {
  if (drawn.length)
    return (
      <div className="min-w-0 space-y-2">
        {drawn.map((d) => (
          <Choice key={d.answer.choice} drawn={d} clause={clause.clause} />
        ))}
      </div>
    );
  return (
    <p className="text-xs text-muted-foreground">
      {clause.negotiability === "open"
        ? "Left open on purpose: nothing needs to answer this."
        : clause.displaced ? (
            <>
              <s>{clause.displaced.label}</s> displaced by{" "}
              <span className="text-foreground">{clause.displaced.byLabel}</span>
              {": "}
              {clause.displaced.how}
            </>
          ) : clause.source?.unanswerable ? (
            "The assistant found nothing in the catalogue for this."
          ) : (
            "Not yet answered."
          )}
    </p>
  );
}

/** The last line: the values asserted with nothing said about what for. */
export function Unbound({ unbound }: { unbound: Variable[] }) {
  if (!unbound.length) return null;
  return (
    <div
      id="unbound"
      className="mt-2 grid scroll-mt-28 gap-2 border border-dashed p-3 @2xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] @2xl:gap-4"
    >
      <div className="min-w-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <p
              tabIndex={0}
              className="w-fit text-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Answering no stated requirement
            </p>
          </TooltipTrigger>
          <TooltipContent>Asserted with nothing said about what for</TooltipContent>
        </Tooltip>
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
  );
}
