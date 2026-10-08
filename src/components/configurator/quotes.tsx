"use client";

/**
 * The quote surface: the second of `Moding`'s surfaces, beside the canvas.
 *
 * The end of a configuration is not the configuration; it is an offer
 * somebody can accept. Quotes are a third kind of fact beside the asserted
 * and the entailed — snapshots with a price. The overview's column of frozen
 * values the canvas has since moved away from is the question a person
 * brings to two quotes, and it is `differs`, a read nobody maintains. A
 * comparison (`comparison.tsx`) says what the difference buys and whether
 * anybody chose it, which two proposals read side by side cannot tell you.
 * The request control is disabled with the reason whenever the rule that
 * issues a quote would decline to fire, so that nobody presses a button that
 * goes nowhere. Two of those reasons are about the addressee, so the surface
 * also carries the form that writes `Profiling` and `Naming`.
 *
 * Which quote is being looked at, which way it is read, and which pair is
 * being compared are a viewer's convenience, held in the page's URL
 * (`link.tsx`), so a link to an offer read one way opens it read that way,
 * and the back button undoes a choice.
 * That a quote exists, and its standing, is `Quoting`'s.
 */

import { ChevronDownIcon, PrinterIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  address,
  addressable,
  compareOf,
  quoteKindOf,
  quoteOf,
  targeted,
  useHash,
  useTargeted,
} from "./address";
import { Comparison, NOW } from "./comparison";
import { CopyLink, READINGS, linkTo, setQuery, type Reading } from "./link";
import { QuoteDocument, STANDING } from "./document";
import { AsIssued, Decision } from "./grounds";
import { cn } from "@/lib/utils";
import { day, money } from "./format";
import { TONE } from "./tone";
import { Timeline } from "./timeline";
import { useConfigurator, type Party, type Quote, type View } from "./provider";

/** Each field says what it holds, so a browser can fill the person's own
 * details for them; a quote needs the name. */
const CUSTOMER: {
  key: keyof Party;
  label: string;
  wide?: boolean;
  required?: boolean;
  type?: string;
  autoComplete: string;
}[] = [
  { key: "name", label: "Name", required: true, autoComplete: "name" },
  { key: "organisation", label: "Organisation", autoComplete: "organization" },
  { key: "address", label: "Address", wide: true, autoComplete: "street-address" },
  { key: "email", label: "Email", type: "email", autoComplete: "email" },
  { key: "phone", label: "Phone", type: "tel", autoComplete: "tel" },
];

/**
 * Each field is sent only when it changed, because `introduce` and
 * `entitle` are partial and a field left alone should stay as it was.
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
  // Arrived at from the assistant's question in the chat: open, with the
  // keyboard in the first field a quote still needs.
  const isTarget = useTargeted(address.addressee);
  const firstMissing = !customer.name ? "name" : !project.site ? "site" : null;
  useEffect(() => {
    if (!isTarget) return;
    setOpen(true);
    if (firstMissing)
      setTimeout(
        () =>
          document
            .querySelector<HTMLElement>(`#${address.addressee} [name="${firstMissing}"]`)
            ?.focus({ preventScroll: true }),
        0,
      );
  }, [isTarget, firstMissing]);

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
    // The form is remade from what is now on record; the keyboard goes back
    // to Save in the new one rather than to the top of the page.
    setTimeout(() => document.getElementById("addressee-save")?.focus(), 0);
  };

  return (
    <Collapsible
      id={address.addressee}
      open={open}
      onOpenChange={setOpen}
      className={cn("mb-6", addressable, isTarget && targeted)}
    >
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
                    {field.required ? " (needed for a quote)" : ""}
                  </span>
                  <Input
                    name={field.key}
                    type={field.type}
                    defaultValue={customer[field.key] ?? ""}
                    autoComplete={field.autoComplete}
                    aria-required={field.required || undefined}
                  />
                </label>
              ))}
              <label className="text-xs">
                <span className="mb-1 block text-muted-foreground">Job title</span>
                <Input name="title" defaultValue={project.title} autoComplete="off" />
              </label>
              <label className="text-xs">
                <span className="mb-1 block text-muted-foreground">
                  Site, where the lift is going (needed for a quote)
                </span>
                <Textarea
                  aria-required
                  name="site"
                  defaultValue={project.site}
                  rows={2}
                  className="min-h-9"
                />
              </label>
              <div className="sm:col-span-2 flex justify-end">
                <Button id="addressee-save" type="submit" size="sm" disabled={busy}>
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
          {quotes.length ? (
            <TableHead className="w-24">
              <span className="sr-only">Compare</span>
            </TableHead>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {quotes.map((q) => (
          // The whole row takes a click, for the pointer; the number is the
          // control, so the keyboard and a screen reader have a real button
          // that says which quote is shown.
          <TableRow
            key={q.quote}
            data-state={q.quote === selected ? "selected" : undefined}
            className="cursor-pointer"
            onClick={() => onSelect(q.quote)}
          >
            <TableCell className="font-medium">
              <Button
                variant="link"
                size="xs"
                className="px-0"
                aria-pressed={q.quote === selected}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(q.quote);
                }}
              >
                <span className="sr-only">Show quotation No. </span>
                {q.number}
              </Button>
            </TableCell>
            <TableCell>
              {STANDING[q.standing]}
              {q.stale.length ? <span className="text-caution"> · out of date</span> : null}
            </TableCell>
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
            {quotes.length ? (
              <TableCell className="text-right">
                {q.quote !== selected ? (
                  <Button
                    variant={q.quote === against ? "secondary" : "ghost"}
                    size="xs"
                    aria-pressed={q.quote === against}
                    onClick={(event) => {
                      event.stopPropagation();
                      onCompare(q.quote === against ? null : q.quote);
                    }}
                  >
                    Compare
                    <span className="sr-only"> No. {q.number} with the one shown</span>
                  </Button>
                ) : (
                  // The quote shown is compared with the specification as
                  // it stands from its own row.
                  <Button
                    variant={against === NOW ? "secondary" : "ghost"}
                    size="xs"
                    aria-pressed={against === NOW}
                    onClick={(event) => {
                      event.stopPropagation();
                      onCompare(against === NOW ? null : NOW);
                    }}
                  >
                    Against now
                    <span className="sr-only">: No. {q.number} with the specification as it stands</span>
                  </Button>
                )}
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function RequestButton() {
  const { view, gesture, busy } = useConfigurator();
  if (!view) return null;
  // Why not yet is said beside the button, not in a tooltip: a disabled
  // button takes no pointer and no focus, so its tooltip reaches nobody.
  const ok = view.quotable.ok;
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {ok ? null : (
        <span id="request-why-not" className="text-xs text-muted-foreground">
          Not yet: {view.quotable.because}
        </span>
      )}
      <Button
        size="sm"
        variant={ok ? "default" : "outline"}
        disabled={busy}
        aria-disabled={!ok || undefined}
        aria-describedby={ok ? undefined : "request-why-not"}
        title={
          ok
            ? "Freeze the specification, the price and the terms as they stand into a proposal"
            : undefined
        }
        className={cn(!ok && "opacity-50")}
        onClick={() => ok && void gesture({ act: "quote" })}
      >
        Request a quotation
      </Button>
    </div>
  );
}

export function QuoteSurface() {
  const { view, error, gesture, busy } = useConfigurator();
  const quotes = view?.quotes ?? [];
  const latest = quotes[quotes.length - 1]?.quote ?? null;
  const params = useSearchParams();
  const selected = params.get("quote");
  const against = params.get("against");
  const asked = params.get("reading") as Reading | null;
  const reading: Reading = asked && READINGS.includes(asked) ? asked : "asked";
  // Each choice is the person going somewhere, so a new history entry.
  const setSelected = (quote: string) => setQuery({ quote }, true);
  const setAgainst = (other: string | null) => setQuery({ against: other }, true);
  const setReading = (next: Reading) =>
    setQuery({ reading: next === "asked" ? null : next }, true);
  // A newly issued quote is the one to look at; those issued before the page
  // opened are not new.
  const seen = useRef<string | null | undefined>(undefined);
  const loaded = view !== null;
  useEffect(() => {
    if (!loaded) return;
    const before = seen.current;
    seen.current = latest;
    if (before !== undefined && latest && latest !== before)
      setQuery({ quote: latest, against: null });
  }, [loaded, latest]);
  // An address on a quote's line names the quote, and the reading that
  // carries the line: a milestone is on the timeline, anything else is read
  // against what was asked. Following it made the history entry already.
  const hash = useHash();
  useEffect(() => {
    const pair = compareOf(hash);
    if (pair) {
      setQuery({ quote: pair[0], against: pair[1] });
      return;
    }
    const named = quoteOf(hash);
    if (!named) return;
    // The quote itself is read whichever way the link asked.
    const kind = quoteKindOf(hash);
    setQuery(kind ? { quote: named, reading: kind === "event" ? "timeline" : null } : { quote: named });
  }, [hash]);

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
    against === NOW
      ? NOW
      : against && against !== quote?.quote
        ? quotes.find((q) => q.quote === against)
        : undefined;

  return (
    <div className="relative h-full overflow-y-auto">
      <div className="px-6 py-6">
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
            against={other === NOW ? NOW : (other?.quote ?? null)}
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
          <Card
            id={`quote:${quote.quote}`}
            className={cn("px-8 py-8", addressable)}
          >
            <Decision
              quote={quote}
              view={view}
              actions={
                  {/* An asked-for value moved since the offer was issued
                      (docs/syncs/staling.md). The offer stands as issued;
                      the mark is beside it until the person has looked, or
                      a fresh quote revokes this one. */}
                  {quote.stale.length ? (
                    <span className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant="secondary" className={TONE.caution}>
                        Out of date
                      </Badge>
                      <span className="text-muted-foreground">
                        {quote.stale
                          .map((b) =>
                            "variable" in b
                              ? (view.variables.find((v) => v.name === b.variable)?.heading ?? b.variable)
                              : b.clause,
                          )
                          .join(", ")}{" "}
                        moved since issue
                      </span>
                      <Button
                        variant="link"
                        size="xs"
                        className="h-auto px-0"
                        onClick={() => void gesture({ act: "clear", item: quote.quote })}
                      >
                        Noted
                      </Button>
                    </span>
                  ) : null}
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
                  <CopyLink
                    size="sm"
                    label="Copy link"
                    className="ml-auto"
                    url={() => linkTo(`quote:${quote.quote}`)}
                  />
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/quotes/${quote.quote}`} target="_blank">
                      <PrinterIcon />
                      Print
                      <span className="sr-only"> (opens in a new tab)</span>
                    </Link>
                  </Button>
                </>
              }
            />
            <Tabs
              value={reading}
              onValueChange={(value) => setReading(value as Reading)}
              className="mt-6"
            >
              <TabsList aria-label="Readings of this quotation">
                <TabsTrigger value="asked">Against what was asked</TabsTrigger>
                <TabsTrigger value="timeline">Along time</TabsTrigger>
                <TabsTrigger value="proposal">As the proposal</TabsTrigger>
              </TabsList>
              <TabsContent value="asked">
                <AsIssued quote={quote} view={view} />
              </TabsContent>
              <TabsContent value="timeline">
                <Timeline quote={quote} view={view} />
              </TabsContent>
              <TabsContent value="proposal" className="pt-4">
                <QuoteDocument quote={quote} view={view} level={3} />
              </TabsContent>
            </Tabs>
          </Card>
        ) : (
          <Empty className="border p-8">
            <EmptyHeader>
              <EmptyDescription className="max-w-sm">
                {view.quotable.ok
                  ? "Request a quotation to freeze the specification into a proposal."
                  : `A quotation can be requested once everything is settled and addressed — ${view.quotable.because}.`}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </div>
  );
}
