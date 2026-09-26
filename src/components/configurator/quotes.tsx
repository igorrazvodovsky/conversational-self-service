"use client";

/**
 * The quote surface: the second of `Moding`'s surfaces, beside the canvas,
 * and the one a configuration ends on.
 *
 * The end of a configuration is not the configuration; it is an offer
 * somebody can accept. Quotes are a third kind of fact beside the asserted
 * and the entailed — snapshots with a price — and this surface shows one at a
 * time as the proposal it is, under an overview of every offer issued: its
 * standing, its sum, when it runs out, and which of its frozen values the
 * canvas has since moved away from. That last column is the question a
 * person brings to two quotes, and it is `differs`, a read nobody maintains.
 * Two quotes can also be compared outright: only the rows on which they
 * differ, with the sums, which is the one slice of a quote that two
 * proposals read side by side cannot give you.
 * The request control is disabled with the reason whenever the rule that
 * issues a quote would decline to fire, so that nobody presses a button that
 * goes nowhere. Two of those reasons are about the addressee, so the surface
 * also carries the form that writes `Profiling` and `Naming`.
 *
 * Which quote is being looked at is a viewer's convenience, held here; that a
 * quote exists, and its standing, is `Quoting`'s.
 */

import { ChevronDownIcon, PrinterIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { QuoteDocument, STANDING } from "./document";
import { day, money } from "./format";
import { useConfigurator, type Party, type Quote, type View } from "./provider";

const CUSTOMER: { key: keyof Party; label: string; wide?: boolean }[] = [
  { key: "name", label: "Name" },
  { key: "organisation", label: "Organisation" },
  { key: "address", label: "Address", wide: true },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
];

/**
 * Who the proposal is for, and where the lift is going. Two gestures, one
 * per concept: the customer's details are `introduce`, the job's title and
 * site are `entitle`. Each field is sent only when it changed, because both
 * actions are partial and a field left alone should stay as it was.
 */
function Addressee() {
  const { view, gesture, busy } = useConfigurator();
  const customer = view?.customer ?? {};
  const project = view?.project ?? { title: "", site: "" };
  const missing = !customer.name || !project.site;
  const [open, setOpen] = useState(missing);
  useEffect(() => {
    if (missing) setOpen(true);
  }, [missing]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const changed = <T extends string>(keys: T[], was: Record<string, string | undefined>) =>
      Object.fromEntries(
        keys
          .map((key) => [key, String(data.get(key) ?? "").trim()] as const)
          .filter(([key, value]) => value !== (was[key] ?? "")),
      );
    const details = changed(
      CUSTOMER.map((f) => f.key),
      customer as Record<string, string | undefined>,
    );
    const naming = changed(["title", "site"], project);
    if (Object.keys(details).length)
      await gesture({ act: "introduce", ...details });
    if (Object.keys(naming).length) await gesture({ act: "entitle", ...naming });
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mb-6">
      <Card size="sm">
        <CardHeader>
          <CardDescription className="uppercase tracking-wide">
            Addressee
          </CardDescription>
          <CardTitle>
            {customer.name
              ? [customer.name, customer.organisation].filter(Boolean).join(", ")
              : "Who is this proposal for?"}
          </CardTitle>
          {project.site ? (
            <CardDescription>
              {[project.title, project.site].filter(Boolean).join(" · ")}
            </CardDescription>
          ) : null}
          <CardAction>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Edit the addressee"
              >
                <ChevronDownIcon className="transition-transform group-data-[state=open]/button:rotate-180" />
              </Button>
            </CollapsibleTrigger>
          </CardAction>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <form
              // Keyed on what is on record, so that a detail the assistant
              // records while the form is open shows in its field rather than
              // being sent back blank as the person's correction.
              key={JSON.stringify([customer, project])}
              onSubmit={(e) => void submit(e)}
              className="grid gap-3 sm:grid-cols-2"
            >
              {CUSTOMER.map((field) => (
                <label
                  key={field.key}
                  className={field.wide ? "sm:col-span-2 text-xs" : "text-xs"}
                >
                  <span className="mb-1 block text-muted-foreground">
                    {field.label}
                  </span>
                  <Input
                    name={field.key}
                    defaultValue={customer[field.key] ?? ""}
                    autoComplete="off"
                  />
                </label>
              ))}
              <label className="text-xs">
                <span className="mb-1 block text-muted-foreground">Job title</span>
                <Input name="title" defaultValue={project.title} autoComplete="off" />
              </label>
              <label className="text-xs">
                <span className="mb-1 block text-muted-foreground">
                  Site, where the lift is going
                </span>
                <Textarea
                  name="site"
                  defaultValue={project.site}
                  rows={2}
                  className="min-h-9"
                />
              </label>
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" size="sm" disabled={busy}>
                  Save
                </Button>
              </div>
            </form>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/**
 * Every offer issued, one row each, with what a person compares them by.
 * `differs` is the read that answers "what changed since" — the headings of
 * the frozen values the canvas no longer holds — and it is the one column
 * two proposals read side by side cannot give you.
 */
function Issued({
  quotes,
  view,
  selected,
  against,
  onSelect,
  onCompare,
}: {
  quotes: Quote[];
  view: View;
  selected: string | null;
  against: string | null;
  onSelect: (quote: string) => void;
  onCompare: (quote: string | null) => void;
}) {
  const heading = new Map(view.variables.map((v) => [v.name, v.heading]));
  return (
    <Table className="mb-6 text-xs">
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">No.</TableHead>
          <TableHead>Standing</TableHead>
          <TableHead className="text-right">Sum</TableHead>
          <TableHead>Issued</TableHead>
          <TableHead>Valid until</TableHead>
          <TableHead>Differs from the canvas</TableHead>
          {quotes.length > 1 ? <TableHead className="w-24" /> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {quotes.map((q) => (
          <TableRow
            key={q.quote}
            data-state={q.quote === selected ? "selected" : undefined}
            aria-current={q.quote === selected ? "true" : undefined}
            className="cursor-pointer"
            tabIndex={0}
            onClick={() => onSelect(q.quote)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              onSelect(q.quote);
            }}
          >
            <TableCell className="font-medium">{q.number}</TableCell>
            <TableCell>{STANDING[q.standing]}</TableCell>
            <TableCell className="text-right tabular-nums">
              {money(q.amount, view.currency)}
            </TableCell>
            <TableCell>{q.issued ? day(q.issued) : "—"}</TableCell>
            <TableCell>{day(q.until)}</TableCell>
            <TableCell className="max-w-64 whitespace-normal text-muted-foreground">
              {q.differs.length
                ? `${q.differs.length}: ${q.differs
                    .map((name) => heading.get(name) ?? name)
                    .join(", ")}`
                : "nothing"}
            </TableCell>
            {quotes.length > 1 ? (
              <TableCell className="text-right">
                {q.quote !== selected ? (
                  <Button
                    variant={q.quote === against ? "secondary" : "ghost"}
                    size="xs"
                    onClick={(event) => {
                      event.stopPropagation();
                      onCompare(q.quote === against ? null : q.quote);
                    }}
                  >
                    {q.quote === against ? "Comparing" : "Compare"}
                  </Button>
                ) : null}
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * The difference slice: two proposals reduced to the rows on which they
 * differ, with the sums. A rendering of two frozen items side by side and
 * nothing more; which pair is the viewer's, held on the surface.
 */
function Comparison({
  a,
  b,
  view,
  onClose,
}: {
  a: Quote;
  b: Quote;
  view: View;
  onClose: () => void;
}) {
  const of = (q: Quote) => new Map(q.holds.map((h) => [h.name, h]));
  const ha = of(a);
  const hb = of(b);
  const rows = view.variables
    .map((v) => v.name)
    .filter((name) => ha.get(name)?.value !== hb.get(name)?.value)
    .map((name) => ({
      name,
      heading: ha.get(name)?.heading ?? hb.get(name)?.heading ?? name,
      a: ha.get(name)?.label ?? "—",
      b: hb.get(name)?.label ?? "—",
    }));
  const monthly = (q: Quote) =>
    `${money(q.terms.recurring, view.currency)}/mo over ${q.terms.months / 12} years`;
  return (
    <div className="mb-6 border">
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2 text-xs">
        <span className="font-medium">
          No. {a.number} against No. {b.number}
        </span>
        <span className="text-muted-foreground">
          · {rows.length ? `${rows.length} differ` : "nothing differs"} · frozen values, as issued
        </span>
        <Button variant="ghost" size="xs" className="ml-auto" onClick={onClose}>
          Stop comparing
        </Button>
      </div>
      <Table className="text-xs">
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>No. {a.number}</TableHead>
            <TableHead>No. {b.number}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.name}>
              <TableCell className="text-muted-foreground">{row.heading}</TableCell>
              <TableCell>{row.a}</TableCell>
              <TableCell>{row.b}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell className="text-muted-foreground">Sum, excluding VAT</TableCell>
            <TableCell className="tabular-nums font-medium">
              {money(a.amount, view.currency)}
            </TableCell>
            <TableCell className="tabular-nums font-medium">
              {money(b.amount, view.currency)}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="text-muted-foreground">Maintenance</TableCell>
            <TableCell className="tabular-nums">{monthly(a)}</TableCell>
            <TableCell className="tabular-nums">{monthly(b)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

function RequestButton() {
  const { view, gesture, busy } = useConfigurator();
  if (!view) return null;
  return (
    <Button
      size="sm"
      variant={view.quotable.ok ? "default" : "outline"}
      disabled={busy || !view.quotable.ok}
      title={
        view.quotable.ok
          ? "Freeze the specification, the price and the terms as they stand into a proposal"
          : `Not yet: ${view.quotable.because}`
      }
      onClick={() => void gesture({ act: "quote" })}
    >
      Request a quotation
    </Button>
  );
}

export function QuoteSurface() {
  const { view, error, gesture, busy } = useConfigurator();
  const quotes = view?.quotes ?? [];
  const latest = quotes[quotes.length - 1]?.quote ?? null;
  const [selected, setSelected] = useState<string | null>(null);
  // The second quote of a comparison, when one is being made.
  const [against, setAgainst] = useState<string | null>(null);
  // A newly issued quote is the one to look at.
  useEffect(() => {
    setSelected(latest);
  }, [latest]);

  // A read that failed says nothing about the state; what was last read
  // stays up until one succeeds.
  if (error && !view) {
    return (
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyDescription className="max-w-sm">{error}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  if (!view) {
    return (
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyMedia>
            <Spinner />
          </EmptyMedia>
        </EmptyHeader>
      </Empty>
    );
  }

  const quote = quotes.find((q) => q.quote === selected) ?? quotes.at(-1);
  const other =
    against && against !== quote?.quote
      ? quotes.find((q) => q.quote === against)
      : undefined;

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="mx-auto max-w-3xl px-6 py-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {quotes.length
              ? `${quotes.length} issued · proposals, frozen as issued`
              : "No proposal yet"}
          </span>
          <div className="ml-auto">
            <RequestButton />
          </div>
        </div>

        {quotes.length ? (
          <Issued
            quotes={quotes}
            view={view}
            selected={quote?.quote ?? null}
            against={other?.quote ?? null}
            onSelect={setSelected}
            onCompare={setAgainst}
          />
        ) : null}

        {quote && other ? (
          <Comparison
            a={quote}
            b={other}
            view={view}
            onClose={() => setAgainst(null)}
          />
        ) : null}

        <Addressee />

        {quote ? (
          <QuoteDocument
            quote={quote}
            view={view}
            actions={
              <>
                {quote.standing === "open" ? (
                  <>
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        void gesture({ act: "commit", quote: quote.quote })
                      }
                    >
                      Accept this proposal
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      className="text-muted-foreground"
                      onClick={() =>
                        void gesture({ act: "revoke", quote: quote.quote })
                      }
                    >
                      Revoke
                    </Button>
                  </>
                ) : null}
                <Button variant="outline" size="sm" asChild className="ml-auto">
                  <Link href={`/quotes/${quote.quote}`} target="_blank">
                    <PrinterIcon />
                    Print
                  </Link>
                </Button>
              </>
            }
          />
        ) : (
          <Empty className="border p-8">
            <EmptyHeader>
              <EmptyDescription className="max-w-sm">
                {view.quotable.ok
                  ? "Everything is settled, priced and addressed. Request a quotation to freeze it into a proposal."
                  : `A quotation can be requested once everything is settled and addressed — ${view.quotable.because}.`}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </div>
  );
}
