"use client";

/**
 * What answers each requirement, on the requirement's own line.
 *
 * The specification is one list. Each clause is a line that reads as a
 * question and its answer: the words, editable, and beneath them the choices
 * answering it — a value bound to the clause, each at `#choice:<id>`, drawn
 * as its heading and value — with the values it forced beneath it, muted.
 * Everything else about a line — where its words were read from, who
 * asserted the value and from which words, what else it answers, the
 * options, the rules — is drawn while the line is open. Then a line for each value answering no clause, with an empty
 * requirement, and the open variables at the tail. A clause nothing answers
 * is a line with a gap where its answer goes, so both gaps are in one list,
 * and with no clause stated every value is on a line of its own.
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
import { useEffect, useState } from "react";
import { useConfigurator, type Answer, type Clause, type Variable, type View } from "./provider";
import { AssertedDetails, AssertedPair, FollowsPair, FollowsRow, FollowsWhy, OpenRow } from "./variables";

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

/** The values that follow and rest on an asserted value. */
function forcedBy(rows: ReturnType<typeof ledger>, variable: Variable): Variable[] {
  return rows.follows.filter((v) => v.following.some((f) => f.variable === variable.name));
}

/**
 * What an asserted value forced, beneath it: each value that follows and
 * rests on it, as its heading and value. Each is addressed where it is first
 * drawn, and drawn again under another assertion it rests on carries no
 * address.
 */
function Forced({ variable }: { variable: Variable }) {
  const { view } = useConfigurator();
  const rows = view ? ledger(view, framedAsserted(view)) : null;
  if (!rows) return null;
  const forced = forcedBy(rows, variable);
  if (!forced.length) return null;
  return (
    <ul aria-label={`Forced by ${variable.heading}`} className="space-y-0.5 pl-1">
      {forced.map((v) => (
        <FollowsPair key={v.name} variable={v} addressed={rows.home.get(v.name) === variable.name} />
      ))}
    </ul>
  );
}

/**
 * Whether a line is open, and the way to open and close it. A line opens
 * when the page is at one of its addresses — the clause, a choice, a value
 * drawn on it — and stays open until it is closed.
 */
export function useOpened(
  ids: string[],
  held?: [boolean, (open: boolean) => void],
): [boolean, (open: boolean) => void] {
  const hash = useHash();
  const own = useState(false);
  const [open, setOpen] = held ?? own;
  const hit = !!hash && ids.includes(hash);
  useEffect(() => {
    if (hit) setOpen(true);
    // Only when the page arrives at the address.
  }, [hit]);
  return [open, setOpen];
}

/** The addresses that open a clause's line: its choices and the values drawn on it. */
export function lineAddresses(drawn: Drawn[]): string[] {
  return drawn.flatMap((d) => [
    address.choice(d.answer.choice),
    ...(d.whole && d.variable ? [address.variable(d.variable.name)] : []),
  ]);
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
function Choice({ drawn, open, onToggle }: { drawn: Drawn; open: boolean; onToggle: () => void }) {
  const { label } = useConfigurator();
  const { answer, variable, inFrame, whole } = drawn;
  const id = address.choice(answer.choice);
  const isTarget = useTargeted(id);
  return (
    <div id={id} className={cn("min-w-0 space-y-0.5", addressable, isTarget && targetedRing)}>
      {!variable ? (
        <Gone answer={answer} />
      ) : whole ? (
        <>
          <AssertedPair variable={variable} open={open} onToggle={onToggle} />
          <Forced variable={variable} />
        </>
      ) : (
        // A value answering more than one clause is drawn once, on the
        // first line it answers, and a value the frame leaves out is not
        // drawn; either way it is the same pair here, its value a link to
        // where it is drawn.
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="text-muted-foreground">{variable.heading}</span>
          <To id={address.variable(variable.name)} title="The value, where it is drawn">
            {label(variable.asked)}
          </To>
          <span className="sr-only">
            {inFrame ? ", answering this too" : ", answering this too, outside the frame"}
          </span>
        </p>
      )}
    </div>
  );
}

/**
 * What answers a clause, beneath its words: its choices, or the gap where
 * they go. The way to answer is the line's own control, beside its words.
 */
export function Answers({
  clause,
  drawn,
  open,
  onToggle,
}: {
  clause: Clause;
  drawn: Drawn[];
  open: boolean;
  onToggle: () => void;
}) {
  if (drawn.length)
    return (
      <div className="min-w-0 space-y-1">
        {drawn.map((d) => (
          <Choice key={d.answer.choice} drawn={d} open={open} onToggle={onToggle} />
        ))}
      </div>
    );
  return (
    <p className="text-xs text-muted-foreground">
      {clause.negotiability === "open"
        ? "Left open on purpose."
        : clause.displaced ? (
            <>
              <s>{clause.displaced.label}</s> displaced by{" "}
              <span className="text-foreground">{clause.displaced.byLabel}</span>
              {": "}
              {clause.displaced.how}
            </>
          ) : clause.source?.unanswerable ? (
            "Nothing in the catalogue for this."
          ) : (
            "Unanswered."
          )}
    </p>
  );
}

/**
 * The details of a line's answers, for the open line: for each value drawn
 * whole on it, how it came to be, its options and the rules behind what it
 * forced. Named by heading when the line has more than one.
 */
export function AnswersDetails({
  clause,
  drawn,
  sourced,
}: {
  clause: string | null;
  drawn: Drawn[];
  sourced: boolean;
}) {
  const whole = drawn.filter((d) => d.whole && d.variable).map((d) => d.variable!);
  if (!whole.length) return null;
  return whole.map((variable) => (
    <div key={variable.name} className="space-y-1.5">
      {whole.length > 1 ? (
        <p className="text-xs font-medium text-foreground">{variable.heading}</p>
      ) : null}
      <AssertedDetails variable={variable} under={clause} sourced={sourced} />
      <ForcedWhy variable={variable} />
    </div>
  ));
}

/** Where a line's details go: beneath the answers, set in by a rule. */
export function Details({ children }: { children: React.ReactNode }) {
  return <div className="mt-2 space-y-2 border-l pl-3">{children}</div>;
}

/**
 * A line of the list with no requirement: the question says there is none,
 * so the absence reads where a requirement would be, and beneath it what is
 * there.
 */
function Line({ question, children }: { question?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1 border-t py-3">
      <p className="text-sm text-muted-foreground">{question ?? "No stated requirement"}</p>
      <div className="min-w-0 space-y-1 pl-4">{children}</div>
    </div>
  );
}

/** A value asserted with nothing said about what for, on its own line. */
function UnboundLine({ variable }: { variable: Variable }) {
  const [open, setOpen] = useOpened([address.variable(variable.name)]);
  return (
    <Line>
      <AssertedPair variable={variable} open={open} onToggle={() => setOpen(!open)} />
      <Forced variable={variable} />
      {open ? (
        <Details>
          <AssertedDetails variable={variable} under={null} />
          <ForcedWhy variable={variable} />
        </Details>
      ) : null}
    </Line>
  );
}

/** The rules behind each value an assertion forced. */
function ForcedWhy({ variable }: { variable: Variable }) {
  const { view } = useConfigurator();
  const rows = view ? ledger(view, framedAsserted(view)) : null;
  if (!rows) return null;
  return forcedBy(rows, variable).map((v) => <FollowsWhy key={v.name} variable={v} />);
}

/** The values asserted with nothing said about what for, a line each. */
export function Unbound({ unbound }: { unbound: Variable[] }) {
  return unbound.map((variable) => <UnboundLine key={variable.name} variable={variable} />);
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
    <Line key={family} question={`${family}: open`}>
      <div className="border">
        {rows.map((variable) => (
          <OpenRow key={variable.name} variable={variable} />
        ))}
      </div>
    </Line>
  ));
}
