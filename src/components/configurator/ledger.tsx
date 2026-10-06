"use client";

/**
 * What answers each requirement, on the requirement's own line.
 *
 * The specification is one list. Each clause is a line, its words on the
 * left, editable, and on the right the choices answering it — a value bound
 * to the clause, each at `#choice:<id>`, with the values it forced beneath
 * it. Then a line for each value answering no clause, with an empty
 * requirement, and the open variables at the tail. A clause nothing answers
 * is a line with a gap where its answer goes, so both of slice 1's gaps are
 * in one list, and with no clause stated the list is slice 0's: every value
 * on a line of its own.
 *
 * What was asked for, what follows and what is open are three kinds of fact,
 * and each item says which it is where it stands; they are not three places.
 * A value that follows sits under each assertion it rests on, addressed under
 * the first. Which kind of fact is shown is a frame (`Framing`, by gap).
 *
 * The question is a read over `Specifying`, `Binding`, `Asserting` and
 * `Constraining` together (`ledger` in `agent/views.py`); whether an answer
 * still stands is the read's `standing`, and the frame decides only how much
 * of it is drawn.
 */

import { cn } from "@/lib/utils";
import { address, addressable, targeted as targetedRing, To, useHash, useTargeted } from "./address";
import { ChevronRightIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useConfigurator, type Answer, type Clause, type Variable, type View } from "./provider";
import { AskedCard, FollowsRow, OpenRow } from "./variables";

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
 * The list as the current state and frame fill it: which lines are in the
 * frame, each line's choices, the values answering none, where each value
 * that follows is addressed, and the open variables at the tail. A frame on
 * a clause leaves its line; a frame on an assertion leaves the lines its
 * value answers; a frame on the unanswered gap leaves the lines nothing
 * answers, and the other gaps leave none. `asserted` is already narrowed by
 * the frame.
 */
export function ledger(view: View, asserted: Variable[]) {
  const byName = new Map(asserted.map((v) => [v.name, v]));
  const every = new Map(view.variables.map((v) => [v.name, v]));
  const frame = view.frame;
  const unanswered = (c: Clause) => !c.answers.length && c.negotiability !== "open";
  const shown = new Set(
    view.clauses
      .filter((c) =>
        !frame
          ? true
          : frame.by === "clause"
            ? c.clause === frame.clause
            : frame.by === "gap"
              ? frame.gap === "unanswered" && unanswered(c)
              : c.answers.some((a) => a.variable && byName.has(a.variable)),
      )
      .map((c) => c.clause),
  );
  const whole = new Set<string>();
  // The assertions drawn whole, in the order they are drawn.
  const parents: string[] = [];
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
        if (first) {
          whole.add(variable!.name);
          parents.push(variable!.name);
        }
        return { answer, variable, inFrame, whole: first };
      }),
    );
  }
  const unbound = asserted.filter((v) => !v.answers.length);
  parents.push(...unbound.map((v) => v.name));
  // A value that follows is drawn under every assertion it rests on, and
  // addressed under the first drawn; one resting on nothing drawn has a
  // line of its own.
  const follows = view.variables.filter((v) => v.framed && v.standing === "follows");
  const home = new Map<string, string>();
  for (const v of follows) {
    const parent = parents.find((p) => v.following.some((f) => f.variable === p));
    if (parent) home.set(v.name, parent);
  }
  const loose = follows.filter((v) => !home.has(v.name));
  const open = view.variables.filter((v) => v.framed && v.standing === "open");
  return {
    shown,
    lines,
    unbound,
    follows,
    home,
    loose,
    open,
    unanswered: view.clauses.filter((c) => shown.has(c.clause) && unanswered(c)).length,
  };
}

/**
 * What an asserted value forced: the values that follow and rest on it,
 * beneath it, behind a disclosure. Closed, its trigger names each value with
 * what it is, so the line still says what followed; open, each is drawn in
 * full. Each is addressed where it is first drawn, and drawn again under
 * another assertion it rests on carries no address. Addressed from
 * elsewhere, the disclosure opens, since what was wanted is the value.
 */
function Forced({ variable }: { variable: Variable }) {
  const { view, label } = useConfigurator();
  const hash = useHash();
  const [open, setOpen] = useState(false);
  const rows = view ? ledger(view, framedAsserted(view)) : null;
  const forced =
    rows?.follows.filter((v) => v.following.some((f) => f.variable === variable.name)) ?? [];
  const targeted = forced.some(
    (v) => rows?.home.get(v.name) === variable.name && hash === address.variable(v.name),
  );
  useEffect(() => {
    if (targeted) setOpen(true);
  }, [targeted]);
  if (!rows || !forced.length) return null;
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          className="h-auto w-full justify-start gap-1 py-1 text-left font-normal whitespace-normal text-muted-foreground"
        >
          <ChevronRightIcon className="mt-0.5 self-start transition-transform group-data-[state=open]/button:rotate-90" />
          <span>
            forced{" "}
            {forced.map((v, i) => (
              <span key={v.name}>
                {i ? ", " : ""}
                {v.heading.toLowerCase()}{" "}
                <span className="text-foreground">{label(v.value)}</span>
              </span>
            ))}
          </span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div role="list" aria-label={`Forced by ${variable.heading}`} className="space-y-1 pt-1 pl-4">
          {forced.map((v) => (
            <FollowsRow key={v.name} variable={v} addressed={rows.home.get(v.name) === variable.name} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
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

/**
 * A line of the list with no requirement: the left-hand side empty, so the
 * absence reads where a requirement would be, and the right-hand side what
 * is there.
 */
function Line({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-3 border-t py-3 @2xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] @2xl:gap-4">
      <div aria-hidden className="hidden @2xl:block" />
      <div className="min-w-0 space-y-1">
        <span className="sr-only">No stated requirement. </span>
        {children}
      </div>
    </div>
  );
}

/** The values asserted with nothing said about what for, a line each. */
export function Unbound({ unbound }: { unbound: Variable[] }) {
  return unbound.map((variable) => (
    <Line key={variable.name}>
      <AskedCard variable={variable} under={null} />
      <Forced variable={variable} />
    </Line>
  ));
}

/** Values that follow from no assertion drawn: from the rules alone, or
 * from assertions the frame leaves out. */
export function Loose({ loose }: { loose: Variable[] }) {
  return loose.map((variable) => (
    <Line key={variable.name}>
      <div role="list">
        <FollowsRow variable={variable} />
      </div>
    </Line>
  ));
}

/** The open variables, by the catalogue's family, in the catalogue's order. */
function byFamily(open: Variable[]): [string, Variable[]][] {
  const groups = new Map<string, Variable[]>();
  for (const v of open) {
    const rows = groups.get(v.family);
    if (rows) rows.push(v);
    else groups.set(v.family, [v]);
  }
  return [...groups.entries()];
}

/**
 * The tail: what is still open, a line per catalogue family. Grouped by the
 * catalogue's family, so the scan a person brings here — what kind of thing
 * is left — has an answer; the grouping is the catalogue's, so it is only
 * here.
 */
export function Open({ open }: { open: Variable[] }) {
  return byFamily(open).map(([family, rows]) => (
    <Line key={family}>
      <p className="px-1 text-xs uppercase tracking-wide text-muted-foreground">
        {family} · still open
      </p>
      <div className="border">
        {rows.map((variable) => (
          <OpenRow key={variable.name} variable={variable} />
        ))}
      </div>
    </Line>
  ));
}
