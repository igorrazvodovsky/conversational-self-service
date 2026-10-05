"use client";

/**
 * A quote read along time: what happens when, and what the person owes or
 * must have done by then.
 *
 * Every position is the offer's own. The milestones and their weeks are
 * Stipulating's `programme` as it answered at issue, frozen into the terms
 * (`docs/syncs/gestures.md`, "A quote is requested"); a payment stage sits on
 * the milestone its `event` names, and its amount is its share of the sum.
 * Nothing here reckons a week: a quote that holds no programme says so, and
 * nothing rebuilds one from the catalogue as it stands today.
 *
 * A chart for the works and one for the aftercare, because the works run in
 * weeks and the aftercare in years, and one axis cannot carry both. Below them the milestones in order, which is
 * the same reading as a table, and where each milestone has its address
 * (`address.quote(…, "event", …)`) for the chat and the person's agent.
 *
 * The timeline is relative to the order, because no order exists until the
 * quote is accepted; once it is, each week is also a date.
 */

import type { ReactNode } from "react";
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
import { day, money } from "./format";
import type { Quote, View } from "./provider";

type Event = "order" | "approval" | "dispatch" | "completion" | "acceptance";

/** Stipulating's milestones, as a person reads them. */
const MILESTONE: Record<Event, string> = {
  order: "Order",
  approval: "Layout drawings issued for approval",
  dispatch: "Equipment ready for dispatch",
  completion: "Installation complete",
  acceptance: "Final examination and acceptance",
};

const weeks = (n: number) => `${n} ${n === 1 ? "week" : "weeks"}`;

/** The date a number of weeks, and then months, after the order. */
const dateOf = (committed: string, week: number, months = 0) => {
  // In UTC throughout, as `day` reads an ISO date.
  const d = new Date(`${committed}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + week * 7);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
};

/** A lane of a chart: a label, and marks placed along it in percent. */
function Lane({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] items-center gap-3 pr-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="relative h-6">{children}</div>
    </div>
  );
}

function Span({
  from,
  to,
  of,
  label,
  muted,
}: {
  from: number;
  to: number;
  of: number;
  label: string;
  muted?: boolean;
}) {
  if (to <= from) return null;
  return (
    <div
      title={label}
      className={cn(
        "absolute inset-y-1 overflow-hidden border-x-2 border-background px-1.5 text-[11px] leading-4 whitespace-nowrap text-ellipsis",
        muted ? "bg-muted text-muted-foreground" : "bg-foreground/80 text-background",
      )}
      style={{ left: `${(from / of) * 100}%`, width: `${((to - from) / of) * 100}%` }}
    >
      {label}
    </div>
  );
}

function Mark({ at, of, label }: { at: number; of: number; label: string }) {
  return (
    <div
      title={label}
      className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-foreground"
      style={{ left: `${(at / of) * 100}%` }}
    >
      <span className="absolute top-full mt-0.5 -translate-x-1/2 text-[11px] whitespace-nowrap text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

/** The axis under a chart: ticks at a step, labelled. */
function Axis({ of, step, label }: { of: number; step: number; label: (n: number) => string }) {
  const ticks = Array.from({ length: Math.floor(of / step) + 1 }, (_, i) => i * step);
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3 pr-4">
      <span />
      <div className="relative h-4 border-t">
        {ticks.map((t) => (
          <span
            key={t}
            className="absolute top-0.5 -translate-x-1/2 text-[11px] tabular-nums text-muted-foreground"
            style={{ left: `${(t / of) * 100}%` }}
          >
            {label(t)}
          </span>
        ))}
      </div>
    </div>
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

export function Timeline({ quote, view }: { quote: Quote; view: Pick<View, "currency"> }) {
  const { terms } = quote;
  const programme = terms.programme;
  if (!programme || programme.milestones.length < 2) {
    return (
      <p className="py-6 text-sm text-muted-foreground">
        This quotation holds no programme, so it says nothing about when the
        work happens. A quotation requested now carries one.
      </p>
    );
  }

  const at = new Map(programme.milestones.map((m) => [m.event as Event, m.week]));
  const week = (event: Event) => at.get(event) ?? 0;
  const handover = week("acceptance");
  const onSite = week("dispatch");
  // Room after handover, so the last marks are not on the edge.
  const span = handover + 2;
  const stages = terms.stages.map((s) => ({
    ...s,
    amount: s.share * quote.amount,
  }));
  const provided = quote.holds.filter((h) => terms.byOthers.includes(h.name));
  const committed = quote.standing === "committed" ? quote.committed : null;
  const when = (w: number) => (committed ? day(dateOf(committed, w)) : null);

  const after = programme.warranty + programme.maintenance;

  return (
    <div className="space-y-8 pt-4">
      <section aria-label="The works, in weeks from order" className="space-y-2">
        <h3 className="text-sm font-semibold">The works</h3>
        <p className="text-xs text-muted-foreground">
          Weeks from order{committed ? `, placed on ${day(committed)}` : ""}.
          Handover in week {handover}.
        </p>
        <div className="space-y-2 pt-2">
          <Lane label="Seller">
            <Span from={0} to={week("approval")} of={span} label="Layout drawings" muted />
            <Span from={week("approval")} to={onSite} of={span} label="Manufacture" muted />
            <Span from={onSite} to={week("completion")} of={span} label="Installation on site" />
          </Lane>
          <Lane label="You">
            <Span
              from={0}
              to={onSite}
              of={span}
              label="Approve drawings, prepare the site"
              muted
            />
            <Mark at={onSite} of={span} label="site ready" />
          </Lane>
          <div className="h-3" />
          <Lane label="Payments">
            {/* Stages falling in the same week share a mark. */}
            {[...Map.groupBy(stages, (s) => week(s.event as Event))].map(([w, due]) => (
              <Mark
                key={w}
                at={w}
                of={span}
                label={due.map((s) => `${Math.round(s.share * 100)} %`).join(" + ")}
              />
            ))}
          </Lane>
          <div className="h-3" />
          <Axis of={span} step={2} label={(n) => String(n)} />
        </div>
      </section>

      <section aria-label="After handover, in years" className="space-y-2">
        <h3 className="text-sm font-semibold">After handover</h3>
        <p className="text-xs text-muted-foreground">
          Years from acceptance. Warranty for {programme.warranty} months, then
          maintenance at {money(terms.recurring, view.currency)} a month for{" "}
          {programme.maintenance / 12} years
          {committed ? `, to ${day(dateOf(committed, handover, after))}` : ""}.
        </p>
        <div className="space-y-2 pt-2">
          <Lane label="Cover">
            <Span
              from={0}
              to={programme.warranty}
              of={after}
              label="Warranty"
            />
            <Span
              from={programme.warranty}
              to={after}
              of={after}
              label="Maintenance"
              muted
            />
          </Lane>
          <Axis of={after} step={after > 60 ? 24 : 12} label={(n) => String(n / 12)} />
        </div>
      </section>

      <section aria-label="What happens when">
        <Table className="text-xs">
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Week</TableHead>
              <TableHead>What happens</TableHead>
              <TableHead>You pay</TableHead>
              <TableHead>By then you have</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {programme.milestones.map((m) => {
              const event = m.event as Event;
              const due = stages.filter((s) => s.event === event);
              const id = address.quote(quote.quote, "event", event);
              return (
                <Row key={event} id={id}>
                  <TableCell className="align-top tabular-nums">
                    {m.week}
                    {when(m.week) ? (
                      <span className="block text-muted-foreground">{when(m.week)}</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="align-top whitespace-normal">
                    {MILESTONE[event] ?? event}
                  </TableCell>
                  <TableCell className="align-top whitespace-normal tabular-nums">
                    {due.length
                      ? due.map((s, i) => (
                          <span key={i} className="block">
                            {money(s.amount, view.currency)}{" "}
                            <span className="text-muted-foreground">
                              ({Math.round(s.share * 100)} %, upon {s.upon})
                            </span>
                          </span>
                        ))
                      : "—"}
                  </TableCell>
                  <TableCell className="align-top whitespace-normal text-muted-foreground">
                    {event === "approval" ? (
                      "the drawings to approve; the programme runs from your approval"
                    ) : event === "dispatch" ? (
                      <>
                        a site ready for installation, {weeks(handover - onSite)} before
                        handover:{" "}
                        {provided.map((h, i) => (
                          <span key={h.name}>
                            {i ? ", " : ""}
                            {quote.grounds ? (
                              <To id={address.quote(quote.quote, "variable", h.name)}>
                                {h.heading.toLowerCase()}, {h.label}
                              </To>
                            ) : (
                              `${h.heading.toLowerCase()}, ${h.label}`
                            )}
                          </span>
                        ))}
                        {terms.clauses.provided?.length ? (
                          <ul className="mt-1 list-disc space-y-0.5 pl-4">
                            {terms.clauses.provided.map((text) => (
                              <li key={text}>{text}</li>
                            ))}
                          </ul>
                        ) : null}
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </Row>
              );
            })}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
