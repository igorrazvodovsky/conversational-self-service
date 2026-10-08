"use client";

/**
 * An issued offer, where the document stands at that moment.
 *
 * The end of a configuration is not the configuration; it is an offer
 * somebody can accept. An issued quote is the document held still at the
 * moment the seller committed to it, and this band sits above every view
 * of it (`docs/ui.md`, "One document, read several ways"): the offer as a
 * decision, what can be done to it, and, beside it, what to compare it
 * with. Which frozen values the draft has since moved away from is
 * `differs`, a read nobody maintains, and the offer's *Changed since* check
 * shows them; the out-of-date mark is `Staling`'s and comes off only by the
 * person's hand.
 *
 * Which moment is shown, which way it is read and which pair is compared
 * are a viewer's convenience, held in the page's URL (`link.tsx`), so a
 * link to an offer read one way opens it read that way, and the back
 * button undoes a choice. That a quote exists, and its standing, is
 * `Quoting`'s.
 */

import { ChevronDownIcon, FileTextIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { NOW } from "./address";
import { CopyLink, linkTo, useMoment, type Check } from "./link";
import { AsIssued, CHECKS, checks, Decision } from "./grounds";
import { TONE } from "./tone";
import { useConfigurator, type Quote } from "./provider";

const PRESSED = "data-[state=on]:bg-foreground data-[state=on]:text-background";

/** The band above every view of an issued offer: the decision, and what
 * can be done to it. */
export function Offer({ quote }: { quote: Quote }) {
  const { view, gesture } = useConfigurator();
  if (!view) return null;
  return (
    <Decision
      quote={quote}
      view={view}
      actions={
        <>
          {/* An asked-for value moved since the offer was issued
              (docs/syncs/staling.md). The offer stands as issued; the mark
              is beside it until the person has looked, or a fresh quote
              revokes this one. */}
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
                onClick={() => void gesture({ act: "commit", quote: quote.quote })}
              >
                Accept this proposal
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => void gesture({ act: "revoke", quote: quote.quote })}
              >
                Revoke
              </Button>
            </>
          ) : null}
          <CompareMenu />
          <CopyLink
            size="sm"
            label="Copy link"
            className="ml-auto"
            url={() => linkTo(`quote:${quote.quote}`)}
          />
          {/* The proposal is the package that leaves the app, and it is
              read where it prints: on its own page. */}
          <Button variant="outline" size="sm" asChild>
            <Link href={`/quotes/${quote.quote}`} target="_blank">
              <FileTextIcon />
              Print the proposal
              <span className="sr-only"> (opens in a new tab)</span>
            </Link>
          </Button>
        </>
      }
    />
  );
}

/**
 * What to set the moment shown against: another issued offer, or the draft.
 * Choosing one opens the comparison, which is a view of the document with
 * a pair as its parameter.
 */
export function CompareMenu() {
  const { view } = useConfigurator();
  const moment = useMoment();
  if (!view) return null;
  const others = view.quotes.filter((q) => q.quote !== moment.quote);
  const choices: { id: string; title: string }[] = [
    ...(moment.quote ? [{ id: NOW, title: "the draft, as it stands" }] : []),
    ...others.map((q) => ({ id: q.quote, title: `quotation No. ${q.number}` })),
  ];
  if (!choices.length) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          Compare with
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {choices.map((c) => (
          <DropdownMenuItem
            key={c.id}
            onSelect={() => moment.set({ against: c.id, view: "compared" })}
          >
            {c.title}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * An issued offer read against what was asked, with the questions a person
 * brings to it before accepting: what did it leave unanswered, and what
 * has moved since. Each is a filter over the reading, the viewer's, held in
 * the URL like the view.
 */
export function AsAsked({ quote }: { quote: Quote }) {
  const { view } = useConfigurator();
  const moment = useMoment();
  if (!view) return null;
  const counts = checks(quote);
  const check = moment.check;
  return (
    <div className="mt-6">
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        spacing={0}
        value={check ?? "all"}
        aria-label="Check"
        onValueChange={(next) => {
          if (!next || next === (check ?? "all")) return;
          moment.set({ check: next === "all" ? null : (next as Check) });
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
    </div>
  );
}
