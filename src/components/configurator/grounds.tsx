"use client";

/**
 * A quote read against what was asked: the canvas's question, put to the
 * specification as it stood when the offer was made.
 *
 * Every line is the offer's own. The requirements, each value, whether it
 * was asserted, gave way or follows, the rules and assertions behind it and
 * what it added to the price were frozen into the quote's item at issue
 * (`docs/syncs/gestures.md`, "A quote is requested"); who asserted each one
 * is the log's, read as it stood at the record that issued it. Nothing here
 * reads the live specification except `differs`, which marks a line the
 * canvas has since moved away from.
 *
 * Above it, the offer as a decision: what it costs over its term, what the
 * person provides, and how long it stays open — figures from the frozen
 * terms, arranged for the question a person brings before accepting.
 *
 * Every line has an address (`address.quote`), so the chat, a link between
 * two lines and the person's agent can name a frozen value apart from the
 * live one. A quote issued before its item carried grounds has no value
 * lines, and nothing links to them.
 */

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { address, addressable, targeted, To, useTargeted } from "./address";
import { ClauseText, plain } from "./clauses";
import { STANDING } from "./document";
import { adds, day, money } from "./format";
import type { Ground, Quote, View } from "./provider";

type Held = Quote["holds"][number];

function daysLeft(until: string): number {
  const end = new Date(`${until}T23:59:59`);
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86_400_000));
}

function Figure({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="bg-muted p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

/**
 * The offer as a decision. The total is the sum plus the maintenance charge
 * over the term, both as issued; financing is the person's business and is
 * not reckoned here.
 */
export function Decision({
  quote,
  view,
  actions,
}: {
  quote: Quote;
  view: Pick<View, "currency">;
  actions?: ReactNode;
}) {
  const { terms } = quote;
  const years = terms.months / 12;
  const provided = quote.holds.filter((h) => terms.byOthers.includes(h.name));
  const left = quote.standing === "open" ? daysLeft(quote.until) : null;
  return (
    <section aria-labelledby={`${quote.quote}-offer`} className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id={`${quote.quote}-offer`} className="text-base font-semibold">
          Quotation No. {quote.number}
        </h2>
        <Badge variant={quote.standing === "committed" ? "default" : "outline"}>
          {STANDING[quote.standing]}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {quote.issued ? `issued ${day(quote.issued)} · ` : ""}
          {left !== null
            ? `${left} ${left === 1 ? "day" : "days"} left to accept, until ${day(quote.until)}`
            : quote.standing === "committed" && quote.committed
              ? `accepted ${day(quote.committed)}`
              : `was valid until ${day(quote.until)}`}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Figure
          label="Sum"
          value={money(quote.amount, view.currency)}
          note="supplied and installed, excluding VAT"
        />
        <Figure
          label="Maintenance"
          value={money(terms.recurring, view.currency)}
          note={`a month, over a term of ${years} years`}
        />
        <Figure
          label="Over the term"
          value={money(quote.amount + terms.recurring * terms.months, view.currency)}
          note={`the sum and ${years} years of maintenance, before financing`}
        />
      </div>
      {provided.length ? (
        <p className="text-xs text-muted-foreground">
          <span className="text-foreground">Before installation you provide: </span>
          {provided.map((h, index) => (
            <span key={h.name}>
              {index ? ", " : ""}
              {quote.grounds ? (
                <To id={address.quote(quote.quote, "variable", h.name)}>
                  {h.heading.toLowerCase()}, {h.label}
                </To>
              ) : (
                `${h.heading.toLowerCase()}, ${h.label}`
              )}
            </span>
          ))}
          {terms.clauses.provided?.length
            ? `, and ${terms.clauses.provided.length} more in the proposal's work by others`
            : ""}
          .
        </p>
      ) : null}
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </section>
  );
}

function Row({ id, children }: { id: string; children: ReactNode }) {
  const isTarget = useTargeted(id);
  return (
    <TableRow id={id} className={cn(addressable, isTarget && targeted)}>
      {children}
    </TableRow>
  );
}

function Price({ ground, currency }: { ground: Ground; currency: string }) {
  return (
    <TableCell className="text-right align-top tabular-nums text-muted-foreground">
      {ground.capital ? adds(ground.capital, currency) : null}
      {ground.monthly ? (
        <div>{`${adds(ground.monthly, currency)}/mo`}</div>
      ) : null}
      {!ground.capital && !ground.monthly ? "included" : null}
    </TableCell>
  );
}

function Moved({ moved }: { moved: boolean }) {
  return moved ? (
    <Badge variant="outline" className="ml-2 font-normal">
      changed since
    </Badge>
  ) : null;
}

function Group({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-6">
      <header className="mb-2 flex items-baseline gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </header>
      {children}
    </section>
  );
}

/**
 * The offer against what was asked: the requirements as they stood, then
 * the values asserted and those that followed, each with its reason and
 * what it added to the sum.
 */
export function AsIssued({
  quote,
  view,
}: {
  quote: Quote;
  view: Pick<View, "currency">;
}) {
  const { currency } = view;
  const at = (kind: "variable" | "clause", id: string) =>
    address.quote(quote.quote, kind, id);
  const moved = new Set(quote.differs);
  const variableOf = new Map(quote.holds.map((h) => [h.value, h.name]));
  // Which clauses each frozen value answered, from the value's side.
  const answers = new Map<string, Quote["requires"]>();
  for (const r of quote.requires) {
    for (const a of r.answeredBy) {
      const name = variableOf.get(a.value);
      if (name) answers.set(name, [...(answers.get(name) ?? []), r]);
    }
  }
  const grounds = quote.grounds;
  const rows = (filter: (g: Ground) => boolean) =>
    quote.holds
      .filter((h) => grounds?.[h.name] && filter(grounds[h.name]))
      .map((h) => ({ held: h, ground: grounds![h.name] }));
  const asserted = rows((g) => g.standing !== "follows");
  const follows = rows((g) => g.standing === "follows");

  const valueCell = (h: Held) => (
    <TableCell className="align-top whitespace-normal">
      {h.label}
      <Moved moved={moved.has(h.name)} />
    </TableCell>
  );

  return (
    <div className="text-sm">
      {quote.requires.length ? (
        <Group title="Required" hint="in your words, as they stood at issue">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-3/5">Requirement</TableHead>
                <TableHead>Answered by</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quote.requires.map((r) => (
                <Row key={r.clause} id={at("clause", r.clause)}>
                  <TableCell className="align-top whitespace-normal">
                    <ClauseText text={r.text} />
                    {r.negotiability !== "fixed" ? (
                      <span className="text-muted-foreground">
                        {" "}
                        ({r.negotiability === "open" ? "left open" : "negotiable"})
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="align-top whitespace-normal">
                    {r.answeredBy.length
                      ? r.answeredBy.map((a, index) => {
                          const name = variableOf.get(a.value);
                          return (
                            <span key={a.value}>
                              {index ? ", " : ""}
                              {name && grounds ? (
                                <To id={at("variable", name)}>{a.label}</To>
                              ) : (
                                a.label
                              )}
                            </span>
                          );
                        })
                      : r.negotiability === "open"
                        ? "at the seller's discretion"
                        : "nothing in the offer"}
                  </TableCell>
                </Row>
              ))}
            </TableBody>
          </Table>
        </Group>
      ) : null}

      {grounds === null ? (
        <p className="mt-6 text-xs text-muted-foreground">
          This quote was issued before an offer kept why each of its values
          held, so it cannot be read against what was asked. The proposal
          lists what it supplies.
        </p>
      ) : (
        <>
          <Group title="Asserted" hint="what you, the assistant or your agent asked for">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/4">Item</TableHead>
                  <TableHead className="w-1/4">Value</TableHead>
                  <TableHead>Why</TableHead>
                  <TableHead className="w-28 text-right">Adds</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {asserted.map(({ held: h, ground: g }) => (
                  <Row key={h.name} id={at("variable", h.name)}>
                    <TableCell className="align-top text-muted-foreground">{h.heading}</TableCell>
                    {valueCell(h)}
                    <TableCell className="align-top whitespace-normal text-xs text-muted-foreground">
                      {g.standing === "yielded" ? (
                        <p>
                          you preferred{" "}
                          <span className="text-foreground line-through">{g.askedLabel}</span>,
                          which gave way
                        </p>
                      ) : null}
                      {g.how ? <p>{g.how}</p> : null}
                      {(answers.get(h.name) ?? []).map((r) => (
                        <p
                          key={r.clause}
                          // Whole while a link in it has keyboard focus.
                          className="line-clamp-1 has-[a:focus-visible]:line-clamp-none"
                          title={plain(r.text)}
                        >
                          for{" "}
                          <To id={at("clause", r.clause)}>{plain(r.text)}</To>
                        </p>
                      ))}
                    </TableCell>
                    <Price ground={g} currency={currency} />
                  </Row>
                ))}
              </TableBody>
            </Table>
          </Group>

          {follows.length ? (
            <Group title="Follows from that" hint="nobody chose these; a rule forced each">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/4">Item</TableHead>
                    <TableHead className="w-1/4">Value</TableHead>
                    <TableHead>Because</TableHead>
                    <TableHead className="w-28 text-right">Adds</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {follows.map(({ held: h, ground: g }) => (
                    <Row key={h.name} id={at("variable", h.name)}>
                      <TableCell className="align-top text-muted-foreground">{h.heading}</TableCell>
                      {valueCell(h)}
                      <TableCell className="align-top whitespace-normal text-xs text-muted-foreground">
                        {g.owing.map((rule) => (
                          <p key={rule.rule}>
                            <span className="font-mono">{rule.rule}</span> {rule.because}
                          </p>
                        ))}
                        {g.following.length ? (
                          <p>
                            from{" "}
                            {g.following.map((f, index) => (
                              <span key={f.variable}>
                                {index ? ", " : ""}
                                <To id={at("variable", f.variable)}>{f.heading}</To>
                              </span>
                            ))}
                          </p>
                        ) : null}
                      </TableCell>
                      <Price ground={g} currency={currency} />
                    </Row>
                  ))}
                </TableBody>
              </Table>
            </Group>
          ) : null}
          <p className="mt-3 text-xs text-muted-foreground">
            What each value adds is its list price at issue; the lines sum to{" "}
            {money(quote.amount, currency)} and{" "}
            {money(quote.terms.recurring, currency)} a month.
          </p>
        </>
      )}
    </div>
  );
}
