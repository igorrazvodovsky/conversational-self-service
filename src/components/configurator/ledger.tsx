"use client";

/**
 * What answers each requirement, on the requirement's own line.
 *
 * A clause nothing answers is a line with a gap where its answer goes, so
 * both gaps are in one list.
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

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { address, addressable, targeted as targetedRing, To, useHash, useTargeted } from "./address";
import { useEffect, useState } from "react";
import { useConfigurator, type Answer, type Clause, type Variable, type View } from "./provider";
import { AssertedDetails, AssertedPair, FollowsPair, FollowsRow, FollowsWhy, OpenRow } from "./variables";

export interface Drawn {
  answer: Answer;
  /** None when the answer is displaced or unrealisable. */
  variable: Variable | null;
  inFrame: boolean;
  /** Drawn whole here: the first line it answers, inside the frame. */
  whole: boolean;
}

/**
 * A yielded or unmet value is asserted: it sits with what was asked for, not with what followed,
 * because nothing about the person's requirement changed.
 */
export function framedAsserted(view: View): Variable[] {
  return view.variables.filter(
    (v) =>
      v.framed && (v.standing === "asked" || v.standing === "yielded" || v.standing === "unmet"),
  );
}

/**
 * A frame on a clause leaves its line; a frame on an assertion leaves the lines its
 * value answers; a frame on the unanswered gap leaves the lines nothing
 * answers, and the other gaps leave none. A frame on a step leaves the
 * lines its variables answer, or, with the unanswered gap within it, the
 * lines nothing answers, which belong to no step. `asserted` is already
 * narrowed by the frame.
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
              : frame.by === "step" && frame.gap === "unanswered"
                ? unanswered(c)
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

function forcedBy(rows: ReturnType<typeof ledger>, variable: Variable): Variable[] {
  return rows.follows.filter((v) => v.following.some((f) => f.variable === variable.name));
}

/**
 * Each forced value is addressed where it is first drawn; drawn again under
 * another assertion it rests on, it carries no address.
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
 * A line opens when the page is at one of its addresses — the clause, a choice, a value
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

export function lineAddresses(drawn: Drawn[]): string[] {
  return drawn.flatMap((d) => [
    address.choice(d.answer.choice),
    ...(d.whole && d.variable ? [address.variable(d.variable.name)] : []),
  ]);
}

function Gone({ answer }: { answer: Answer }) {
  return (
    <p className="text-xs text-muted-foreground">
      {answer.heading ? `${answer.heading}: ` : ""}
      <span className="line-through">{answer.label}</span>{" "}
      {answer.standing === "unrealisable" ? "— no variable offers this" : "— no longer asserted"}
    </p>
  );
}

/**
 * The requirement was reworded or relaxed since this answer was chosen, and
 * the answer stayed (`docs/syncs/staling.md`). The mark is a fact beside the
 * answer, not a change to it; the person takes it off by keeping the answer,
 * here, or by picking another on the line, which is a new choice.
 */
function Stale({ answer }: { answer: Answer }) {
  const { gesture, busy } = useConfigurator();
  if (!answer.stale.length) return null;
  // Two kinds of basis here: the clause it answers, reworded or relaxed,
  // and a fact of the situation it was worked out from, measured or dropped
  // since (`docs/syncs/situating.md`). The clause line shows what it now
  // comes to.
  const measured = answer.stale.some((b) => "given" in b);
  const reworded = answer.stale.some((b) => "clause" in b);
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 text-xs text-caution">
      {measured && reworded
        ? "The requirement changed, and a fact this was worked out from was measured, since this was chosen."
        : measured
          ? "A fact this was worked out from changed since this was chosen; the line says what it now comes to."
          : "The requirement changed since this was chosen."}
      <Button
        variant="link"
        size="xs"
        className="h-auto px-0 text-xs"
        disabled={busy}
        onClick={() => void gesture({ act: "clear", item: answer.choice })}
      >
        Keep it
      </Button>
    </p>
  );
}

function Choice({ drawn, open, onToggle }: { drawn: Drawn; open: boolean; onToggle: () => void }) {
  const { label } = useConfigurator();
  const { answer, variable, inFrame, whole } = drawn;
  const id = address.choice(answer.choice);
  const isTarget = useTargeted(id);
  return (
    <div id={id} className={cn("min-w-0 space-y-0.5", addressable, isTarget && targetedRing)}>
      <Stale answer={answer} />
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

/** The way to answer is the line's own control, beside its words, not here. */
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

/** Drawn only while the line is open. */
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

export function Details({ children }: { children: React.ReactNode }) {
  return <div className="mt-2 space-y-2 border-l pl-3">{children}</div>;
}

/** The absence of a requirement reads where a requirement would be. */
function Line({ question, children }: { question?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1 border-t py-3">
      <p className="text-sm text-muted-foreground">{question ?? "No stated requirement"}</p>
      <div className="min-w-0 space-y-1 pl-4">{children}</div>
    </div>
  );
}

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
 * Grouped by the catalogue's family, so the scan a person brings here — what kind of thing
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
