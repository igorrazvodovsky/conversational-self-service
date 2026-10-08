"use client";

/**
 * Two offers compared: what does the difference buy, and was it anybody's
 * choice?
 *
 * The question is put to two sides, each an assignment with its requirements
 * and the grounds of every value (`Side`): two quotes as frozen at issue, or
 * a quote and the specification as it stands, read the way a quote requested
 * now would freeze it. Only the values that differ are listed, grouped by the
 * requirements they answer on either side, so a line reads as *PS-6 doors:
 * No. 1 answers with this, No. 2 with that*. A requirement the ledger gained
 * or lost between the two says so. Each side says whether its value was
 * asserted, gave way or follows, and a value that follows on both sides reads
 * as a consequence rather than a choice, linked to the assertions it rests on.
 *
 * Each line carries its change in the sum and in the monthly charge. A
 * side's line prices sum to its amount and its recurring charge, so the
 * changes account for the whole difference, and the comparison says whether
 * they do rather than assuming it: a value held on both sides but priced
 * differently, because the catalogue moved between issues, has a line of its
 * own.
 *
 * Every line is addressed as a line of this comparison
 * (`address.compare`). The pair is the viewer's, held in the URL and named
 * by the address; nothing here is recorded.
 */

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { address, addressable, NOW, targeted, To, useTargeted } from "./address";
import { ClauseText, plain } from "./clauses";
import { change, money } from "./format";
import type { Ground, Quote, Side, View } from "./provider";

type Held = Side["holds"][number];
type Clause = Side["requires"][number];

interface Named {
  /** The address token: a quote's id, or `now`. */
  id: string;
  name: string;
  side: Side;
  quote?: Quote;
}

export { NOW };

const years = (months: number) =>
  months % 12 ? `${months} months` : `${months / 12} years`;

function Line({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  const isTarget = useTargeted(id);
  return (
    <TableRow id={id} className={cn(addressable, isTarget && targeted, className)}>
      {children}
    </TableRow>
  );
}

function Requirement({ id, children }: { id: string; children: ReactNode }) {
  const isTarget = useTargeted(id);
  return (
    <p id={id} className={cn(addressable, isTarget && targeted, "whitespace-normal")}>
      {children}
    </p>
  );
}

/** Which variable each answering option is, on one side: the option's
 * variable is the one that holds it there. */
function answering(side: Side): Map<string, Set<string>> {
  const by = new Map(side.holds.map((h) => [h.value, h.name]));
  return new Map(
    side.requires.map((c) => [
      c.clause,
      new Set(c.answeredBy.map((o) => by.get(o.value)).filter((v): v is string => !!v)),
    ]),
  );
}

export function Comparison({
  a,
  b,
  view,
  onClose,
}: {
  a: Quote;
  b: Quote | typeof NOW;
  view: View;
  onClose: () => void;
}) {
  const { currency } = view;
  const left: Named = { id: a.quote, name: `No. ${a.number}`, side: a, quote: a };
  const right: Named =
    b === NOW
      ? { id: NOW, name: "As it stands", side: view.draft }
      : { id: b.quote, name: `No. ${b.number}`, side: b, quote: b };
  const at = (kind: "variable" | "clause", id: string) =>
    address.compare(left.id, right.id, kind, id);

  const ha = new Map(a.holds.map((h) => [h.name, h]));
  const hb = new Map(right.side.holds.map((h) => [h.name, h]));
  const heading = new Map(view.variables.map((v) => [v.name, v.heading]));
  const names = [
    ...view.variables.map((v) => v.name),
    ...[...ha.keys(), ...hb.keys()].filter((n) => !heading.has(n)),
  ].filter((n, i, all) => all.indexOf(n) === i && (ha.has(n) || hb.has(n)));
  const differing = names.filter((n) => ha.get(n)?.value !== hb.get(n)?.value);
  const headingOf = (n: string) =>
    ha.get(n)?.heading ?? hb.get(n)?.heading ?? heading.get(n) ?? n;

  const ga = a.grounds;
  const gb = right.side.grounds;
  const dAmount = right.side.amount - a.amount;
  const dMonthly = right.side.terms.recurring - a.terms.recurring;
  const unfinished = b === NOW && !view.draft.complete;

  const header = (
    <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2 text-xs">
      <h3 className="font-medium">
        <To id={address.compare(left.id, right.id)}>
          {left.name} against {b === NOW ? "the draft, as it stands" : right.name}
        </To>
      </h3>
      <span className="text-muted-foreground">
        · {differing.length ? `${differing.length} differ` : "nothing differs"}
        {b === NOW ? " · as issued, and as it stands" : " · both as issued"}
      </span>
      <Button variant="ghost" size="xs" className="ml-auto" onClick={onClose}>
        Stop comparing
      </Button>
    </div>
  );

  const sums = (
    <>
      <TableRow>
        <TableCell className="text-muted-foreground">Sum, excluding VAT</TableCell>
        <TableCell className="tabular-nums font-medium">{money(a.amount, currency)}</TableCell>
        <TableCell className="tabular-nums font-medium">
          {money(right.side.amount, currency)}
          {unfinished ? <span className="font-normal text-muted-foreground"> so far</span> : null}
        </TableCell>
        <TableCell className="text-right tabular-nums font-medium">{change(dAmount, currency)}</TableCell>
        <TableCell />
      </TableRow>
      <TableRow>
        <TableCell className="text-muted-foreground">Maintenance</TableCell>
        <TableCell className="tabular-nums">{`${money(a.terms.recurring, currency)}/mo`}</TableCell>
        <TableCell className="tabular-nums">
          {`${money(right.side.terms.recurring, currency)}/mo`}
        </TableCell>
        <TableCell />
        <TableCell className="text-right tabular-nums">
          {dMonthly ? `${change(dMonthly, currency)}/mo` : "—"}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell className="text-muted-foreground">Contract term</TableCell>
        <TableCell>{years(a.terms.months)}</TableCell>
        <TableCell>{years(right.side.terms.months)}</TableCell>
        <TableCell colSpan={2} className="text-right tabular-nums">
          {right.side.terms.months === a.terms.months
            ? "—"
            : `${right.side.terms.months > a.terms.months ? "+" : "−"}${years(
                Math.abs(right.side.terms.months - a.terms.months),
              )}`}
        </TableCell>
      </TableRow>
    </>
  );

  // A quote issued before its item carried grounds says what differs and
  // nothing about why.
  if (!ga || !gb) {
    return (
      <section id={address.compare(left.id, right.id)} className={cn("mb-6 border", addressable)}>
        {header}
        <Table className="text-xs">
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>{left.name}</TableHead>
              <TableHead>{right.name}</TableHead>
              <TableHead className="text-right">Sum</TableHead>
              <TableHead className="text-right">Monthly</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {differing.map((n) => (
              <Line key={n} id={at("variable", n)}>
                <TableCell className="text-muted-foreground">{headingOf(n)}</TableCell>
                <TableCell>{ha.get(n)?.label ?? "—"}</TableCell>
                <TableCell>{hb.get(n)?.label ?? "open"}</TableCell>
                <TableCell />
                <TableCell />
              </Line>
            ))}
            {sums}
          </TableBody>
        </Table>
      </section>
    );
  }

  // The requirements on either side, in the order the earlier side held
  // them, then those only the later side has.
  const ca = new Map(a.requires.map((c) => [c.clause, c]));
  const cb = new Map(right.side.requires.map((c) => [c.clause, c]));
  const clauses = [...a.requires, ...right.side.requires.filter((c) => !ca.has(c.clause))];
  const order = new Map(clauses.map((c, i) => [c.clause, i]));
  const aa = answering(a);
  const ab = answering(right.side);
  const answers = (n: string) =>
    clauses
      .filter((c) => aa.get(c.clause)?.has(n) || ab.get(c.clause)?.has(n))
      .map((c) => c.clause);
  const reworded = (id: string) =>
    ca.has(id) && cb.has(id) && ca.get(id)!.text !== cb.get(id)!.text;
  // Answered on one side and not on the other: the ledger kept the clause
  // and its answer went.
  const answered = (id: string) => [!!aa.get(id)?.size, !!ab.get(id)?.size] as const;
  const unanswered = (id: string) =>
    ca.has(id) && cb.has(id) && answered(id)[0] !== answered(id)[1];
  const moved = (id: string) =>
    !ca.has(id) || !cb.has(id) || reworded(id) || unanswered(id);

  // A value is listed once, under every requirement it answers on either
  // side, so a line answering two clauses is counted once.
  const groups = new Map<string, { clauses: string[]; lines: string[] }>();
  for (const n of differing) {
    const of = answers(n);
    const key = of.join(" ");
    if (!groups.has(key)) groups.set(key, { clauses: of, lines: [] });
    groups.get(key)!.lines.push(n);
  }
  // A requirement gained, lost or reworded is a difference whether or not
  // its answer moved.
  for (const c of clauses) {
    if (moved(c.clause) && ![...groups.values()].some((g) => g.clauses.includes(c.clause)))
      groups.set(c.clause, { clauses: [c.clause], lines: [] });
  }
  const sorted = [...groups.values()].sort((x, y) => {
    if (!x.clauses.length) return 1;
    if (!y.clauses.length) return -1;
    return order.get(x.clauses[0])! - order.get(y.clauses[0])!;
  });

  // Held on both sides and priced differently: the catalogue moved between
  // the two, and the change belongs to no choice.
  const repriced = names.filter(
    (n) =>
      ha.get(n)?.value === hb.get(n)?.value &&
      ga[n] &&
      gb[n] &&
      (ga[n].capital !== gb[n].capital || ga[n].monthly !== gb[n].monthly),
  );
  const delta = (n: string, key: "capital" | "monthly") =>
    (gb[n]?.[key] ?? 0) - (ga[n]?.[key] ?? 0);
  const listed = [...differing, ...repriced];
  const lineCapital = listed.reduce((t, n) => t + delta(n, "capital"), 0);
  const lineMonthly = listed.reduce((t, n) => t + delta(n, "monthly"), 0);
  const addsUp =
    Math.round(lineCapital - dAmount) === 0 && Math.round(lineMonthly - dMonthly) === 0;

  const follows = (n: string) =>
    (!ga[n] || ga[n].standing === "follows") && (!gb[n] || gb[n].standing === "follows");

  // Where an assertion a value rests on is read: its line here when it
  // differs too. Otherwise both sides hold the same value, and on a quote
  // it is the shown quote's frozen line, which keeps the pair; the
  // specification's is the live line.
  const rest = (who: Named, v: string) =>
    differing.includes(v)
      ? at("variable", v)
      : who.id === NOW
        ? address.variable(v)
        : address.quote(left.id, "variable", v);

  const why = (who: Named, n: string, g: Ground | undefined, h: Held | undefined) => {
    if (!h) return <p>open</p>;
    if (!g) return null;
    if (g.standing === "follows")
      return (
        <p>
          follows
          {g.following.length ? " from " : null}
          {g.following.map((f, i) => (
            <span key={f.variable}>
              {i ? ", " : ""}
              <To id={rest(who, f.variable)}>{f.heading}</To>
            </span>
          ))}
          {!g.following.length && g.owing.length
            ? `: ${g.owing.map((r) => r.because).join("; ")}`
            : null}
        </p>
      );
    return (
      <>
        <p>
          {g.standing === "unmet"
            ? "asserted, not met"
            : g.standing === "yielded"
              ? "gave way"
              : "asserted"}
          {g.how ? `: ${g.how}` : null}
        </p>
        {g.standing === "yielded" ? (
          <p>
            preferred <span className="text-foreground line-through">{g.askedLabel}</span>
          </p>
        ) : null}
      </>
    );
  };

  const line = (n: string) => {
    const consequence = follows(n);
    return (
      <Line
        key={n}
        id={at("variable", n)}
        className={cn(consequence && "text-muted-foreground")}
      >
        <TableCell className="align-top whitespace-normal">
          <span className={cn(!consequence && "text-muted-foreground")}>{headingOf(n)}</span>
          {consequence ? <p className="text-xs italic">a consequence, not a choice</p> : null}
        </TableCell>
        {[
          [left, ha.get(n), ga[n]] as const,
          [right, hb.get(n), gb[n]] as const,
        ].map(([who, h, g]) => (
          <TableCell key={who.id} className="align-top whitespace-normal">
            <span className={cn(!consequence && "text-foreground")}>{h?.label ?? "—"}</span>
            <div className="text-xs text-muted-foreground">{why(who, n, g, h)}</div>
          </TableCell>
        ))}
        <TableCell className="text-right align-top tabular-nums">
          {change(delta(n, "capital"), currency)}
        </TableCell>
        <TableCell className="text-right align-top tabular-nums">
          {delta(n, "monthly") ? `${change(delta(n, "monthly"), currency)}/mo` : "—"}
        </TableCell>
      </Line>
    );
  };

  const clauseText = (id: string) => {
    const x: Clause | undefined = ca.get(id);
    const y: Clause | undefined = cb.get(id);
    const [onLeft, onRight] = answered(id);
    const notes = [
      !x ? `only in ${right.name}` : !y ? `only in ${left.name}` : null,
      reworded(id) ? `reworded; ${left.name} had “${plain(x!.text)}”` : null,
      unanswered(id) ? `${onLeft ? right.name : left.name} answers nothing for it` : null,
    ].filter(Boolean);
    return (
      <Requirement key={id} id={at("clause", id)}>
        <ClauseText text={(y ?? x)!.text} />
        {notes.length ? (
          <span className="font-normal text-muted-foreground"> · {notes.join(" · ")}</span>
        ) : null}
      </Requirement>
    );
  };

  // The milestones placed differently, when both sides froze a programme;
  // the timeline reads each in full.
  const pa = a.terms.programme?.milestones ?? [];
  const pb = right.quote?.terms.programme?.milestones ?? [];
  const weekB = new Map(pb.map((m) => [m.event, m.week]));
  const shifted = pb.length ? pa.filter((m) => weekB.get(m.event) !== m.week) : [];

  return (
    <section id={address.compare(left.id, right.id)} className={cn("mb-6 border", addressable)}>
      {header}
      <Table className="text-xs">
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/5">Item</TableHead>
            <TableHead>{left.name}</TableHead>
            <TableHead>{right.name}</TableHead>
            <TableHead className="w-24 text-right">Sum</TableHead>
            <TableHead className="w-24 text-right">Monthly</TableHead>
          </TableRow>
        </TableHeader>
        {sorted.map((g) => (
          <TableBody key={g.clauses.join(" ") || "none"}>
            <TableRow className="hover:bg-transparent">
              <TableHead colSpan={5} scope="rowgroup" className="h-auto bg-muted py-1.5 text-foreground">
                {g.clauses.length ? (
                  <>
                    {g.lines.length ? null : (
                      <span className="font-normal text-muted-foreground">
                        The requirement changed; the values answering it did not
                      </span>
                    )}
                    {g.clauses.map(clauseText)}
                  </>
                ) : (
                  <span className="font-normal text-muted-foreground">
                    Answering no requirement on either side
                  </span>
                )}
              </TableHead>
            </TableRow>
            {g.lines.map(line)}
          </TableBody>
        ))}
        {repriced.length ? (
          <TableBody>
            <TableRow className="hover:bg-transparent">
              <TableHead colSpan={5} scope="rowgroup" className="h-auto bg-muted py-1.5 font-normal text-muted-foreground">
                The same value on both sides, priced differently at issue
              </TableHead>
            </TableRow>
            {repriced.map((n) => (
              <Line key={n} id={at("variable", n)} className="text-muted-foreground">
                <TableCell>{headingOf(n)}</TableCell>
                <TableCell colSpan={2}>{ha.get(n)?.label}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {change(delta(n, "capital"), currency)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {delta(n, "monthly") ? `${change(delta(n, "monthly"), currency)}/mo` : "—"}
                </TableCell>
              </Line>
            ))}
          </TableBody>
        ) : null}
        <TableBody>
          {sums}
          {shifted.length ? (
            <TableRow>
              <TableCell className="text-muted-foreground">Programme</TableCell>
              {[left, right].map((who) => (
                <TableCell key={who.id} className="whitespace-normal">
                  {shifted.map((m, i) => (
                    <span key={m.event}>
                      {i ? ", " : ""}
                      <To id={address.quote(who.id, "event", m.event)}>
                        {m.event} week {who === left ? m.week : weekB.get(m.event)}
                      </To>
                    </span>
                  ))}
                </TableCell>
              ))}
              <TableCell />
              <TableCell />
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
      <p className="border-t px-3 py-2 text-xs text-muted-foreground">
        {addsUp
          ? `The lines account for the whole difference: ${change(dAmount, currency)} in the sum and ${
              dMonthly ? `${change(dMonthly, currency)}` : "nothing"
            } a month.`
          : `The lines account for ${change(lineCapital, currency)} of the ${change(
              dAmount,
              currency,
            )} difference in the sum, and ${change(lineMonthly, currency)} of ${change(
              dMonthly,
              currency,
            )} a month.`}
        {unfinished
          ? " The specification is not finished, so its sum is not an offer."
          : null}
      </p>
    </section>
  );
}
