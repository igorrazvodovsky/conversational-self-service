"use client";

/**
 * The values: one row per variable, in the catalogue's order, whatever the
 * row's standing.
 *
 * What was asked for, what follows and what is open are three kinds of fact,
 * and each row says which it is where it stands; they are not three places.
 * A pick changes what a row says, not where it is, so the row a person just
 * clicked stays under their hand. A requirement is the person's reason for a
 * value, given above the rows in their own words (`specification.tsx`), and
 * a row answering one says so and links to it; a row answering none is the
 * ordinary case and says nothing of it. Which rows are shown is a frame
 * (`Framing`): a gap, a step, an assertion or a clause, read on the server as
 * `framed`.
 *
 * The question is a read over `Specifying`, `Binding`, `Asserting` and
 * `Constraining` together (`ledger` and `_canvas` in `agent/views.py`);
 * whether an answer still stands is the read's `standing`, and the frame
 * decides only how much of it is drawn.
 */

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { address, addressable, targeted as targetedRing, To, useHash, useTargeted } from "./address";
import { useEffect, useState } from "react";
import { ClauseText } from "./clauses";
import { useConfigurator, type Answer, type Clause, type Variable, type View } from "./provider";
import { AssertedDetails, AssertedPair, ByMark, FollowsPair, FollowsRow, OpenRow } from "./variables";
import { useShown } from "./showing";

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

export const unanswered = (c: Clause) => !c.answers.length && c.negotiability !== "open";

/**
 * Which clauses the frame leaves: a frame on a clause leaves its line; a
 * frame on an assertion leaves the lines its value answers; a frame on the
 * unanswered gap leaves the lines nothing answers, and the open gap leaves
 * none. A frame on a step leaves the lines its variables answer, or, with
 * the unanswered gap within it, the lines nothing answers, which belong to
 * no step. The rows are the variables the frame leaves, in the catalogue's
 * order.
 */
export function ledger(view: View) {
  const asserted = new Set(framedAsserted(view).map((v) => v.name));
  const frame = view.frame;
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
                : c.answers.some((a) => a.variable && asserted.has(a.variable)),
      )
      .map((c) => c.clause),
  );
  const rows = view.variables.filter((v) => v.framed);
  return {
    shown,
    rows,
    open: rows.filter((v) => v.standing === "open"),
    unanswered: view.clauses.filter((c) => shown.has(c.clause) && unanswered(c)).length,
  };
}

/** The values that follow from this one, among those the frame leaves. */
function forcedBy(view: View, variable: Variable): Variable[] {
  return view.variables.filter(
    (v) =>
      v.framed &&
      v.standing === "follows" &&
      v.following.some((f) => f.variable === variable.name),
  );
}

/**
 * What an assertion forced, named on its row: each a link to the row where
 * the value stands with its rule. The row is where the value is addressed,
 * so nothing here carries an address.
 */
function Forced({ variable }: { variable: Variable }) {
  const { view } = useConfigurator();
  if (!view) return null;
  const forced = forcedBy(view, variable);
  if (!forced.length) return null;
  return (
    <ul aria-label={`Forced by ${variable.heading}`} className="space-y-0.5 pl-1">
      {forced.map((v) => (
        <FollowsPair key={v.name} variable={v} addressed={false} />
      ))}
    </ul>
  );
}

/**
 * A line opens when the page is at one of its addresses, and stays open
 * until it is closed.
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

/** The addresses a clause's line answers to: its own, and each choice on it. */
export function lineAddresses(clause: Clause): string[] {
  return [address.clause(clause.clause), ...clause.answers.map((a) => address.choice(a.choice))];
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
 * here, or by picking another on the row, which is a new choice.
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

/**
 * One answer on a clause's line: the row it names, as a link, with who
 * decided it. The value itself, its options and what it forced are on the
 * row; the choice is addressed here, where the clause and the value meet.
 */
function Choice({ answer }: { answer: Answer }) {
  const { view, label } = useConfigurator();
  const id = address.choice(answer.choice);
  const isTarget = useTargeted(id);
  const variable =
    answer.standing !== "displaced" && answer.standing !== "unrealisable" && answer.variable
      ? view?.variables.find((v) => v.name === answer.variable) ?? null
      : null;
  return (
    <div id={id} className={cn("min-w-0 space-y-0.5", addressable, isTarget && targetedRing)}>
      <Stale answer={answer} />
      {!variable ? (
        <Gone answer={answer} />
      ) : (
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="text-muted-foreground">{variable.heading}</span>
          <To
            id={address.variable(variable.name)}
            title="The value, on its row: how it came to be, its options, what it forced"
            className={cn(
              "font-medium",
              variable.standing === "yielded" && "text-muted-foreground line-through",
            )}
          >
            {label(variable.asked)}
          </To>
          <ByMark variable={variable} />
          {variable.standing === "unmet" ? (
            <span className="text-xs text-muted-foreground">not buildable with the rest</span>
          ) : null}
          {variable.standing === "yielded" && variable.value ? (
            <span className="text-xs text-muted-foreground">
              gave way to <span className="text-foreground">{label(variable.value)}</span>
            </span>
          ) : null}
        </p>
      )}
    </div>
  );
}

/**
 * What answers a clause, on its line: each a link to its row, or the gap
 * where an answer would go. The way to answer is the line's own control,
 * beside its words, not here.
 */
export function Answers({ clause }: { clause: Clause }) {
  if (clause.answers.length)
    return (
      <div className="min-w-0 space-y-1">
        {clause.answers.map((a) => (
          <Choice key={a.choice} answer={a} />
        ))}
      </div>
    );
  const nothing = clause.source?.unanswerable || clause.read.some((r) => r.unanswerable);
  return (
    <p className="text-xs text-muted-foreground">
      {clause.negotiability === "open" ? (
        "Left open on purpose."
      ) : clause.displaced ? (
        <>
          <s>{clause.displaced.label}</s> displaced by{" "}
          <span className="text-foreground">{clause.displaced.byLabel}</span>
          {": "}
          {clause.displaced.how}
        </>
      ) : nothing ? (
        "Nothing in the catalogue for this."
      ) : (
        "Unanswered."
      )}
    </p>
  );
}

/**
 * The requirements a value answers, on its row: the reason the person gave
 * for it, in their words, each a link to the clause. A value answering none
 * says nothing, since nothing is missing. A clause the person stated and
 * whose choice they decided holds the value against the assistant, and the
 * row says so.
 */
function For({ variable }: { variable: Variable }) {
  const shown = useShown();
  if (!variable.answers.length || !shown("answers")) return null;
  const held = new Set(variable.held);
  return (
    <ul className="space-y-0.5 text-xs text-muted-foreground">
      {variable.answers.map((answer) => (
        <li key={answer.clause}>
          {held.has(answer.clause) ? "Held for " : "For "}
          <To id={address.clause(answer.clause)} title="The requirement, in the ledger">
            “<ClauseText text={answer.text} />”
          </To>
        </li>
      ))}
    </ul>
  );
}

/** A row of the values: ruled like the others, with its kind said on it. */
function Row({ id, children }: { id: string; children: React.ReactNode }) {
  const isTarget = useTargeted(id);
  return (
    <div
      id={id}
      data-line
      className={cn("space-y-1 border-t py-3 first:border-t-0", addressable, isTarget && targetedRing)}
    >
      {children}
    </div>
  );
}

/**
 * A value a party asserted: the pair, the requirements it answers, what it
 * forced, and, while the row is open, how it came to be and the options.
 */
function AssertedRow({ variable }: { variable: Variable }) {
  const [open, setOpen] = useOpened([address.variable(variable.name)]);
  return (
    <Row id={address.variable(variable.name)}>
      <AssertedPair variable={variable} open={open} onToggle={() => setOpen(!open)} />
      <div className="min-w-0 space-y-1 pl-4">
        <For variable={variable} />
        <Forced variable={variable} />
        {open ? (
          <Details>
            <AssertedDetails variable={variable} under={null} />
          </Details>
        ) : null}
      </div>
    </Row>
  );
}

export function Details({ children }: { children: React.ReactNode }) {
  return <div className="mt-2 space-y-2 border-l pl-3">{children}</div>;
}

/**
 * The rows, one per variable in the catalogue's order, each saying which
 * kind of fact it is. No row is marked as wanted more than another: before
 * the person has said anything, every open variable is equally unsaid.
 */
export function Values({ rows }: { rows: Variable[] }) {
  return (
    <div role="list" aria-label="The values">
      {rows.map((variable) =>
        variable.standing === "open" ? (
          <div key={variable.name} role="listitem" data-line className="border-t first:border-t-0">
            <OpenRow variable={variable} />
          </div>
        ) : variable.standing === "follows" ? (
          <div key={variable.name} role="listitem" data-line className="border-t py-3 first:border-t-0">
            <FollowsRow variable={variable} />
          </div>
        ) : (
          <div key={variable.name} role="listitem">
            <AssertedRow variable={variable} />
          </div>
        ),
      )}
    </div>
  );
}
