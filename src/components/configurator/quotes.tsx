"use client";

/**
 * The quote surface: the second of `Moding`'s surfaces, beside the canvas.
 *
 * The end of a configuration is not the configuration; it is an offer
 * somebody can accept. Quotes are a third kind of fact beside the asserted
 * and the entailed — snapshots with a price. Which frozen values the canvas
 * has since moved away from is `differs`, a read nobody maintains, and the
 * offer's *Changed since* check shows them. A comparison (`comparison.tsx`)
 * says what the difference buys and whether anybody chose it, which two
 * proposals read side by side cannot tell you.
 * The surface holds offers and nothing that makes them: requesting one, and
 * saying who it is for, are the last of shaping the specification and sit
 * with where it stands (`standing.tsx`), so the person is not sent here to
 * finish there.
 *
 * Which quote is being looked at, which way it is read, and which pair is
 * being compared are a viewer's convenience, held in the page's URL
 * (`link.tsx`), so a link to an offer read one way opens it read that way,
 * and the back button undoes a choice.
 * That a quote exists, and its standing, is `Quoting`'s.
 */

import { FileTextIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  addressable,
  compareOf,
  quoteKindOf,
  quoteOf,
  useHash,
} from "./address";
import { Comparison, NOW } from "./comparison";
import { CopyLink, READINGS, linkTo, setQuery, type Reading } from "./link";
import { STANDING } from "./document";
import { AsIssued, CHECKS, checks, Decision, type Check } from "./grounds";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { day, money } from "./format";
import { TONE } from "./tone";
import { Timeline } from "./timeline";
import { useConfigurator, type Quote, type View } from "./provider";

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
  return (
    <Table className="mb-6 text-xs">
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">No.</TableHead>
          <TableHead>Standing</TableHead>
          <TableHead className="text-right">Sum</TableHead>
          <TableHead>Issued</TableHead>
          <TableHead>Valid until</TableHead>
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

const PRESSED = "data-[state=on]:bg-foreground data-[state=on]:text-background";

export function QuoteSurface() {
  const { view, error, gesture } = useConfigurator();
  const quotes = view?.quotes ?? [];
  const latest = quotes[quotes.length - 1]?.quote ?? null;
  const params = useSearchParams();
  const selected = params.get("quote");
  const against = params.get("against");
  const asked = params.get("reading") as Reading | null;
  const reading: Reading = asked && READINGS.includes(asked) ? asked : "asked";
  const checked = params.get("check");
  const check: Check | null = CHECKS.some((c) => c.check === checked) ? (checked as Check) : null;
  const setCheck = (next: Check | null) => setQuery({ check: next }, true);
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
  const counts = quote ? checks(quote) : { unanswered: 0, changed: 0 };
  const other =
    against === NOW
      ? NOW
      : against && against !== quote?.quote
        ? quotes.find((q) => q.quote === against)
        : undefined;

  return (
    <div className="relative h-full overflow-y-auto">
      <div className="px-6 py-6">
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

        {quote ? (
          <Card
            id={`quote:${quote.quote}`}
            className={cn("px-8 py-8", addressable)}
          >
            <Decision
              quote={quote}
              view={view}
              actions={
                <>
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
                  {quote.standing === "open" ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() =>
                          void gesture({ act: "commit", quote: quote.quote })
                        }
                      >
                        Accept this proposal
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
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
                  {/* The proposal is the package that leaves the app, and
                      it is read where it prints: on its own page, not as
                      a third reading here. */}
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/quotes/${quote.quote}`} target="_blank">
                      <FileTextIcon />
                      Open the proposal
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
              </TabsList>
              <TabsContent value="asked">
                {/* The questions a person brings to an offer before
                    accepting it: what did it leave unanswered, and what
                    has moved since. Each is a filter over the reading,
                    the viewer's, held in the URL like the reading. */}
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  spacing={0}
                  value={check ?? "all"}
                  aria-label="Check"
                  className="mt-3"
                  onValueChange={(next) => {
                    if (!next || next === (check ?? "all")) return;
                    setCheck(next === "all" ? null : (next as Check));
                  }}
                >
                  <ToggleGroupItem value="all" className={PRESSED}>
                    All
                  </ToggleGroupItem>
                  {CHECKS.map(({ check: c, title }) => (
                    <ToggleGroupItem key={c} value={c} className={cn("gap-1.5", PRESSED)}>
                      {title}
                      <span className="tabular-nums text-muted-foreground group-data-[state=on]/toggle:text-background/70">
                        {counts[c]}
                      </span>
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <AsIssued quote={quote} view={view} check={check} />
              </TabsContent>
              <TabsContent value="timeline">
                <Timeline quote={quote} view={view} />
              </TabsContent>
            </Tabs>
          </Card>
        ) : (
          // Reached only by a link or a replayed focus: the surface is not
          // offered in the nav until an offer exists.
          <Empty className="border p-8">
            <EmptyHeader>
              <EmptyDescription className="max-w-sm">
                No offer yet. One is requested from the specification, once
                everything is settled and addressed.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </div>
  );
}
