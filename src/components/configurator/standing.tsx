"use client";

import { ChevronDownIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { money, tonnes } from "./format";
import { useConfigurator, type Grid, type View } from "./provider";

/**
 * The state, named after the condition of `APersonRequestsAQuote` that fails
 * first — the same order `quotable` gives its reason in, so the word and the
 * sentence beside it never disagree.
 */
function state(view: View): string {
  if (view.quotable.ok) return "Ready to quote";
  if (view.counts.unmet) return "Not buildable as asked";
  if (view.counts.open) return "Incomplete";
  return "Not addressed";
}

function Line({ term, amount }: { term: string; amount: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="tabular-nums">{amount}</dd>
    </div>
  );
}

/**
 * Where the specification stands: whether an offer can be asked for yet and
 * what stands in the way, how its values divide between asked, followed and
 * open, and what it comes to so far. The price and carbon of a single choice
 * are beside that choice; here they are the running sum, and say so until
 * nothing is left open.
 */
export function Standing() {
  const { view, gesture, busy, grid, setGrid } = useConfigurator();
  if (!view) return null;
  const { price, footprint, currency, counts, quotable } = view;
  const asked = counts.asked + counts.yielded + counts.unmet;
  const issued = view.quotes.length;

  return (
    <Card size="sm">
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Badge variant={quotable.ok ? "default" : "outline"}>{state(view)}</Badge>
          <span className="text-sm">
            {quotable.ok ? "Everything is settled, priced and addressed." : `${capital(quotable.because)}.`}
          </span>
          <div className="ml-auto flex gap-2">
            {issued ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => void gesture({ act: "focus", surface: "quote" })}
              >
                {issued === 1 ? "1 quote issued" : `${issued} quotes issued`}
              </Button>
            ) : null}
            <Button
              size="sm"
              variant={quotable.ok ? "default" : "outline"}
              disabled={busy || !quotable.ok}
              title={
                quotable.ok
                  ? "Freeze the values and the price as they stand, for thirty days"
                  : `Not yet: ${quotable.because}`
              }
              onClick={() => void gesture({ act: "quote" })}
            >
              Request a quote
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {asked} asked · {counts.follows} follow from that · {counts.open} still open
        </p>

        <Collapsible>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t pt-3 text-sm">
            <span>
              <span className="font-medium tabular-nums">
                {money(price.capital, currency)}
              </span>
              <span className="text-muted-foreground">
                {" "}equipment{quotable.ok ? "" : ", so far"}
              </span>
            </span>
            <span>
              <span className="font-medium tabular-nums">
                {footprint.complete ? tonnes(footprint.total) : "—"}
              </span>
              <span className="text-muted-foreground">
                {" "}CO₂e over {footprint.horizon} years, modelled
              </span>
            </span>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="xs" className="ml-auto text-muted-foreground">
                <ChevronDownIcon className="transition-transform group-data-[state=open]/button:rotate-180" />
                Breakdown
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="mt-3 grid gap-6 @xl:grid-cols-2">
              <dl className="space-y-1 text-xs">
                <Line
                  term={`Monthly, over ${price.term / 12 || "—"} years${
                    price.presumed ? " (presumed)" : ""
                  }`}
                  amount={money(price.instalment, currency)}
                />
                <Line term="Lifetime" amount={money(price.lifetime, currency)} />
              </dl>
              <div>
                <dl className="space-y-1 text-xs">
                  <Line term="Making it" amount={tonnes(footprint.made)} />
                  <Line
                    term="Running it"
                    amount={footprint.complete ? tonnes(footprint.run) : "—"}
                  />
                </dl>
                {/* Two states, both named, rather than one button whose
                    label is the state it is in. */}
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  spacing={0}
                  value={grid}
                  onValueChange={(value) => value && setGrid(value as Grid)}
                  aria-label="Electricity grid"
                  aria-describedby="grid-why"
                  className="mt-3"
                >
                  <ToggleGroupItem value="today">Grid today</ToggleGroupItem>
                  <ToggleGroupItem value="decarbonising">Decarbonising</ToggleGroupItem>
                </ToggleGroup>
                <p id="grid-why" className="mt-1 text-xs text-muted-foreground">
                  The same lift ranks differently against a decarbonising grid.
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

function capital(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
