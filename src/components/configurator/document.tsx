"use client";

/**
 * One quote, laid out as a commercial proposal.
 *
 * A rendering of `Quoting`'s state and nothing else. Every figure and every
 * clause comes from the offer as it was issued — the seller's stipulations,
 * both parties' profiles and the job's name were copied into the quote's
 * terms at that moment — except the carbon annex, which is an estimate
 * recomputed from the frozen values and labelled as one. Labels come from the
 * catalogue, because an option's identity does not change.
 *
 * The shape follows what a lift manufacturer actually sends.
 *
 * The rendering knows a few of the catalogue's variable names — the handover
 * option, the contract term, the service level — because a proposal puts
 * those in sentences rather than in the table. That is a coupling of this
 * component to this catalogue, and it is confined to `SENTENCED` below.
 *
 * Shared by the quote surface and by the printable page at `/quotes/[quote]`.
 * What can be done to the quote is the caller's, passed in as `actions`.
 */

import { cn } from "@/lib/utils";
import { Fragment, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Party, Quote, View } from "./provider";

import { day, money, tonnes as tonnesOf } from "./format";
import { LIFE } from "./life";
import { TONE } from "./tone";
import { LiftDrawing } from "./drawing";

const tonnes = (kg: number) => `${tonnesOf(kg)} CO₂e`;

const percent = (share: number) => `${Math.round(share * 100)} %`;

export const STANDING: Record<Quote["standing"], string> = {
  open: "Open for acceptance",
  committed: "Accepted",
  revoked: "Revoked",
  lapsed: "Lapsed",
};

/** An open offer waits on the person, an accepted one is done; the rest are past. */
export const STANDING_TONE: Record<Quote["standing"], string | undefined> = {
  open: TONE.info,
  committed: TONE.positive,
  revoked: undefined,
  lapsed: undefined,
};

// The catalogue's families, given the headings a proposal uses. `context`
// is the basis of design, and the families for installing, maintaining and
// ending the lift have sections of their own; none is in the scope table.
const SCOPE: [string, string][] = [
  ["performance", "Performance"],
  ["platform", "Platform and drive"],
  ["dimensions", "Car and shaft"],
  ["doors", "Doors and entrances"],
  ["safety", "Safety and rescue"],
  ["cabin", "Car interior"],
];

const SENTENCED = {
  handover: "lead_time",
  term: "contract_term",
  service: "service_level",
  usage: "usage_profile",
  connectivity: "connectivity_package",
  coverage: "maintenance_scope",
  maintainability: "maintainability",
  existing: "existing_equipment",
  hours: "site_hours",
  end: "end_of_life",
  platform: "platform",
  load: "rated_load",
  speed: "rated_speed",
  stops: "stops",
  travel: "travel",
};

type Held = Quote["holds"][number];

function Line({ term, amount }: { term: string; amount: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="text-right tabular-nums">{amount}</dd>
    </div>
  );
}

function Address({ party, role }: { party: Party; role: string }) {
  const lines = [
    party.organisation !== party.name ? party.organisation : undefined,
    party.name,
    party.address,
    party.email,
    party.phone,
  ].filter(Boolean);
  return (
    <div className="text-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {role}
      </p>
      {lines.length ? (
        lines.map((line, index) => (
          <p key={index} className={index === 0 ? "font-medium" : undefined}>
            {line}
          </p>
        ))
      ) : (
        <p className="text-muted-foreground">—</p>
      )}
    </div>
  );
}

function Clauses({ items }: { items: string[] | undefined }) {
  if (!items?.length) return null;
  return (
    <ol className="list-decimal space-y-1 pl-5 text-sm">
      {items.map((text, index) => (
        <li key={index}>{text}</li>
      ))}
    </ol>
  );
}

type Level = 1 | 2 | 3 | 4 | 5 | 6;
const tag = (level: number) => `h${Math.min(level, 6) as Level}` as const;

function Heading({ level, children }: { level: number; children: ReactNode }) {
  const H = tag(level);
  return <H className="mb-2 text-sm font-semibold">{children}</H>;
}

function Subheading({
  level,
  className,
  children,
}: {
  level: number;
  className: string;
  children: ReactNode;
}) {
  const H = tag(level);
  return (
    <H className={cn(className, "text-xs font-normal uppercase tracking-wide text-muted-foreground")}>
      {children}
    </H>
  );
}

export function QuoteDocument({
  quote,
  view,
  actions,
  level = 1,
}: {
  quote: Quote;
  view: Pick<View, "product" | "currency" | "footprint">;
  actions?: ReactNode;
  /** The level of the proposal's title: 1 when the page is the proposal,
   * lower when it sits inside a surface that has its own headings. */
  level?: Level;
}) {
  const Title = tag(level);
  const { currency } = view;
  const { terms } = quote;
  const years = terms.months / 12;
  const byOthers = new Set(terms.byOthers);
  const held = new Map<string, Held>(quote.holds.map((h) => [h.name, h]));
  const say = (variable: string) => held.get(variable)?.label ?? "";
  const scope = new Map<string, Held[]>();
  for (const h of quote.holds) {
    if (byOthers.has(h.name)) continue;
    const list = scope.get(h.family) ?? [];
    list.push(h);
    scope.set(h.family, list);
  }
  const basis = quote.holds.filter((h) => h.family === "context");
  const requirements = quote.holds.filter((h) => byOthers.has(h.name));
  const sellerName = terms.seller.name ?? "The seller";
  const customerName =
    terms.customer.organisation && terms.customer.organisation !== terms.customer.name
      ? `${terms.customer.name}, ${terms.customer.organisation}`
      : terms.customer.name;

  return (
    <article className="text-sm">
      {/* Letterhead */}
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-lg font-semibold">{sellerName}</p>
          {[terms.seller.address, terms.seller.email, terms.seller.phone]
            .filter(Boolean)
            .map((line, index) => (
              <p key={index} className="text-xs text-muted-foreground">
                {line}
              </p>
            ))}
        </div>
        <dl className="min-w-48 space-y-0.5 text-xs">
          <Line term="Quotation" amount={`No. ${quote.number}`} />
          {quote.issued ? <Line term="Date" amount={day(quote.issued)} /> : null}
          <Line term="Valid until" amount={day(quote.until)} />
          <Line
            term="Standing"
            amount={
              <Badge
                variant="secondary"
          className={STANDING_TONE[quote.standing]}
              >
                {STANDING[quote.standing]}
              </Badge>
            }
          />
        </dl>
      </header>

      <Separator className="my-6" />

      <section className="grid gap-6 sm:grid-cols-2">
        <Address party={terms.customer} role="To" />
        <div className="text-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Project
          </p>
          {terms.title ? <p className="font-medium">{terms.title}</p> : null}
          <p>{terms.site}</p>
        </div>
      </section>

      {/* The proposal, in one sentence, the way a bid letter opens. */}
      <section className="mt-6 space-y-3">
        <Title className="text-xl font-semibold">
          Proposal for one passenger lift, {view.product}
        </Title>
        <p>
          {sellerName} proposes to supply and install one (1){" "}
          {say(SENTENCED.platform)} passenger lift, {say(SENTENCED.load)},{" "}
          {say(SENTENCED.speed)}, serving {say(SENTENCED.stops)} over a travel
          of {say(SENTENCED.travel)}, at {terms.site}, for the sum of{" "}
          <span className="font-semibold tabular-nums">
            {money(quote.amount, currency)}
          </span>{" "}
          excluding VAT, on the terms below.
        </p>
        {actions ? (
          <div className="flex flex-wrap gap-2 print:hidden">{actions}</div>
        ) : null}
      </section>

      <Separator className="my-6" />

      {/* 1. Basis. The customer's requirements first, in their words as
          they stood at issue, each with what answers it — then the site and
          use the values describe. A proposal that listed only the second
          would be filling the slot for the input with the output. */}
      <section>
        <Heading level={level + 1}>1. Basis of this proposal</Heading>
        {quote.requires?.length ? (
          <>
            <Subheading level={level + 2} className="mb-2">The customer requires</Subheading>
            <Table className="mb-4">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-3/5">Requirement</TableHead>
                  <TableHead>Answered by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quote.requires.map((r) => (
                  <TableRow key={r.clause}>
                    <TableCell className="align-top whitespace-normal">
                      {r.text}
                      {r.negotiability !== "fixed" ? (
                        <span className="text-muted-foreground">
                          {" "}
                          ({r.negotiability === "open" ? "left open" : "negotiable"})
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="align-top whitespace-normal">
                      {r.answeredBy.length
                        ? r.answeredBy.map((a) => a.label).join(", ")
                        : r.negotiability === "open"
                          ? "at the seller's discretion"
                          : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Subheading level={level + 2} className="mb-2">Site and use</Subheading>
          </>
        ) : null}
        <dl className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
          {basis.map((h) => (
            <Line key={h.name} term={h.heading} amount={h.label} />
          ))}
          <Line term="Usage profile" amount={say(SENTENCED.usage)} />
        </dl>
      </section>

      <Separator className="my-6" />

      {/* 2. Scope of supply */}
      <section>
        <Heading level={level + 1}>2. Scope of supply</Heading>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-2/5">Item</TableHead>
              <TableHead>Specification</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {SCOPE.map(([family, heading]) => {
              const lines = scope.get(family);
              if (!lines?.length) return null;
              return (
                <Fragment key={family}>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead
                      colSpan={2}
                      scope="colgroup"
                      className="h-auto py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      {heading}
                    </TableHead>
                  </TableRow>
                  {lines.map((line) => (
                    <TableRow key={line.name}>
                      <TableHead
                        scope="row"
                        className="h-auto py-2 align-top font-normal whitespace-normal text-muted-foreground"
                      >
                        {line.heading}
                      </TableHead>
                      {/* The label only. The catalogue's notes are advice
                          for choosing, and a proposal carries none. */}
                      <TableCell>{line.label}</TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
        <div className="mt-6">
          <LiftDrawing holds={quote.holds} id={`quote-${quote.quote}`} />
        </div>
      </section>

      <Separator className="my-6" />

      {/* 3. Price */}
      <section className="grid gap-6 sm:grid-cols-2">
        <div>
          <Heading level={level + 1}>3. Price</Heading>
          <p className="text-3xl font-semibold tabular-nums">
            {money(quote.amount, currency)}
          </p>
          <p className="text-xs text-muted-foreground">
            for the equipment supplied and installed, with the works and the
            arrangement for the end of its life stated, excluding VAT, firm
            for the validity period
          </p>
        </div>
        <div>
          <Subheading level={level + 2} className="mb-1">The price includes</Subheading>
          <Clauses items={terms.clauses.included} />
        </div>
      </section>

      <Separator className="my-6" />

      {/* 4. Payment */}
      <section>
        <Heading level={level + 1}>4. Payment</Heading>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Due on</TableHead>
              <TableHead className="w-20 text-right">Share</TableHead>
              <TableHead className="w-32 text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {terms.stages.map((stage, index) => (
              <TableRow key={index}>
                <TableCell>{stage.upon}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {percent(stage.share)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {money(quote.amount * stage.share, currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell>Total, excluding VAT</TableCell>
              <TableCell className="text-right tabular-nums">
                {percent(terms.stages.reduce((sum, s) => sum + s.share, 0))}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {money(quote.amount, currency)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </section>

      <Separator className="my-6" />

      {/* 5. Programme */}
      <section>
        <Heading level={level + 1}>5. Programme</Heading>
        <dl className="space-y-1">
          <Line
            term="Layout drawings for approval"
            amount={`within ${terms.approval} weeks of order`}
          />
          <Line
            term="Delivery of the equipment"
            amount={say(SENTENCED.handover) || "as agreed"}
          />
          {say(SENTENCED.existing) && !held.get(SENTENCED.existing)?.value.endsWith(":none") ? (
            <Line term="The existing lift" amount={say(SENTENCED.existing)} />
          ) : null}
          <Line
            term="Installation and commissioning"
            amount={`approximately ${terms.installation} weeks on site`}
          />
          {say(SENTENCED.hours) ? (
            <Line term="Working hours on site" amount={say(SENTENCED.hours)} />
          ) : null}
          <Line
            term="Final examination and acceptance"
            amount="on completion, by a notified body"
          />
        </dl>
      </section>

      <Separator className="my-6" />

      {/* 6. Maintenance */}
      <section className="grid gap-6 sm:grid-cols-2">
        <div>
          <Heading level={level + 1}>6. Maintenance agreement</Heading>
          <dl className="space-y-1">
            <Line term="Service level" amount={say(SENTENCED.service)} />
            {say(SENTENCED.coverage) ? (
              <Line term="Coverage" amount={say(SENTENCED.coverage)} />
            ) : null}
            <Line term="Usage profile" amount={say(SENTENCED.usage)} />
            <Line term="Connectivity" amount={say(SENTENCED.connectivity)} />
            {say(SENTENCED.maintainability) ? (
              <Line
                term="Maintainable by others"
                amount={say(SENTENCED.maintainability)}
              />
            ) : null}
            <Line term="Term" amount={say(SENTENCED.term) || `${years} years`} />
            <Line
              term="Charge, per month, excluding VAT"
              amount={money(terms.recurring, currency)}
            />
          </dl>
        </div>
        <div>
          <Subheading level={level + 2} className="mb-1">On these terms</Subheading>
          <Clauses items={terms.clauses.maintenance} />
        </div>
      </section>

      <Separator className="my-6" />

      {/* 7. End of life */}
      <section className="grid gap-6 sm:grid-cols-2">
        <div>
          <Heading level={level + 1}>7. End of life</Heading>
          <dl className="space-y-1">
            <Line term="At the end of its life" amount={say(SENTENCED.end) || "as the owner arranges"} />
          </dl>
        </div>
        <div>
          <Subheading level={level + 2} className="mb-1">On these terms</Subheading>
          <Clauses items={terms.clauses.end_of_life ?? []} />
        </div>
      </section>

      <Separator className="my-6" />

      {/* 8. Warranty */}
      <section>
        <Heading level={level + 1}>8. Warranty</Heading>
        <p>
          The equipment is warranted against defects in materials and
          workmanship for {terms.warranty} months from acceptance, during
          which maintenance is included as stated in the price.
        </p>
      </section>

      <Separator className="my-6" />

      {/* 9. Work by others */}
      <section>
        <Heading level={level + 1}>9. Work by others</Heading>
        <p className="mb-2">
          The price and the programme assume that the following is provided by
          the customer or their contractor, at no cost to {sellerName}, before
          installation begins:
        </p>
        {requirements.length ? (
          <dl className="mb-3 grid gap-x-8 gap-y-1 sm:grid-cols-2">
            {requirements.map((h) => (
              <Line key={h.name} term={h.heading} amount={h.label} />
            ))}
          </dl>
        ) : null}
        <Clauses items={terms.clauses.provided} />
      </section>

      <Separator className="my-6" />

      {/* 10. Exclusions */}
      <section>
        <Heading level={level + 1}>10. Not included</Heading>
        <Clauses items={terms.clauses.excluded} />
      </section>

      <Separator className="my-6" />

      {/* 11. Conditions */}
      <section>
        <Heading level={level + 1}>11. Conditions</Heading>
        <Clauses items={terms.clauses.conditions} />
      </section>

      <Separator className="my-6" />

      {/* 12. Carbon annex */}
      <section>
        <Heading level={level + 1}>
          12. Environmental information, modelled over {view.footprint.horizon}{" "}
          years
        </Heading>
        <dl className="max-w-sm space-y-1">
          {LIFE.map(({ stage, words }) => (
            <Line
              key={stage}
              term={stage === "run" ? `${words}, grid ${view.footprint.grid}` : words}
              amount={
                stage === "run" && !quote.footprint.complete
                  ? "—"
                  : tonnes(quote.footprint[stage])
              }
            />
          ))}
          <Line
            term="Total"
            amount={quote.footprint.complete ? tonnes(quote.footprint.total) : "—"}
          />
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">
          An estimate, not part of the offer. {view.footprint.scope}
        </p>
      </section>

      <Separator className="my-6" />

      {/* 13. Acceptance */}
      <section>
        <Heading level={level + 1}>13. Acceptance</Heading>
        <p>
          This proposal is open for acceptance until {day(quote.until)}. On
          acceptance it, with the conditions above, constitutes the whole
          agreement for the supply and installation of the lift described.
        </p>
        {quote.standing === "committed" && quote.committed ? (
          <p className="mt-2 font-medium">
            Accepted by {customerName} on {day(quote.committed)}.
          </p>
        ) : (
          <div className="mt-6 hidden grid-cols-2 gap-12 print:grid">
            {["For the customer", `For ${sellerName}`].map((who) => (
              <div key={who} className="border-t pt-2 text-xs text-muted-foreground">
                {who}: name, signature, date
              </div>
            ))}
          </div>
        )}
      </section>

      {quote.differs.length ? (
        <p className="mt-8 text-xs text-muted-foreground print:hidden">
          The specification on the canvas has moved since this was issued:{" "}
          {quote.differs.length} of the values above now differ. This proposal
          has not.
        </p>
      ) : null}
    </article>
  );
}
