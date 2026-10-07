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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { address, addressable, goTo, targeted, To, useTargeted } from "./address";
import { openConflict, useDiscuss } from "@/components/chat/discussing";
import { money, tonnes } from "./format";
import { LIFE, priced } from "./life";
import { TONE, type Tone } from "./tone";
import { useShown } from "./showing";
import { useConfigurator, type Grid, type View } from "./provider";

/**
 * The state, named after the condition of `APersonRequestsAQuote` that fails
 * first — the same order `quotable` gives its reason in, so the word and the
 * sentence beside it never disagree.
 */
function state(view: View): { words: string; tone?: Tone } {
  if (view.quotable.ok) return { words: "Ready to quote", tone: "positive" };
  if (view.counts.unmet) return { words: "Not buildable as asked", tone: "caution" };
  if (view.counts.open) return { words: "Incomplete" };
  return { words: "Not addressed" };
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
  const shown = useShown();
  if (!view) return null;
  const { price, footprint, currency, counts, quotable } = view;
  const byStage = priced(view.stages);
  const years = price.term / 12;
  const asked = counts.asked + counts.yielded + counts.unmet;
  const issued = view.quotes.length;
  const { words, tone } = state(view);

  return (
    <Card size="sm">
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Badge variant="secondary" className={tone && TONE[tone]}>
            {words}
          </Badge>
          {quotable.ok ? null : <span className="text-sm">{capital(quotable.because)}.</span>}
          <div className="ml-auto flex gap-2">
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

        <Conflict />

        <Collapsible>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t pt-3 text-sm">
            <span>
              <span className="font-medium tabular-nums">
                {money(price.capital, currency)}
              </span>
              <span className="text-muted-foreground">
                {" "}one-off{quotable.ok ? "" : ", so far"}
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
              <div>
                {/* The price by stage of the lift's life: what is paid once
                    for each, and the maintenance charge by the month. */}
                <dl className="space-y-1 text-xs">
                  {LIFE.map(({ stage, words }) => {
                    const { capital: once, monthly } = byStage[stage];
                    if (!once && !monthly) return null;
                    const amount = [
                      once ? money(once, currency) : null,
                      monthly ? `${money(monthly, currency)}/mo` : null,
                    ]
                      .filter(Boolean)
                      .join(" + ");
                    return <Line key={stage} term={words} amount={amount} />;
                  })}
                  <Line
                    term={`Monthly, over ${years || "—"} years${
                      price.presumed ? " (presumed)" : ""
                    }`}
                    amount={money(price.instalment, currency)}
                  />
                  <Line term="Lifetime" amount={money(price.lifetime, currency)} />
                </dl>
                {/* The sum is of the values on the canvas, and what each
                    adds is the price facet, beside the value. */}
                {shown("price") ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    What each value adds is beside it on the canvas.
                  </p>
                ) : (
                  <Button
                    variant="link"
                    size="xs"
                    className="mt-1 h-auto px-0"
                    disabled={busy}
                    onClick={() => void gesture({ act: "show", facet: "price" })}
                  >
                    Show what each value adds
                  </Button>
                )}
              </div>
              <div>
                {/* The carbon by stage, over the service life: maintaining
                    and running it accrue every year of it, whatever the
                    maintenance agreement's term. */}
                <dl className="space-y-1 text-xs">
                  {LIFE.map(({ stage, words }) => (
                    <Line
                      key={stage}
                      term={words}
                      amount={
                        stage === "run" && !footprint.complete
                          ? "—"
                          : tonnes(footprint[stage])
                      }
                    />
                  ))}
                </dl>
                {/* Two states, both named, rather than one button whose
                    label is the state it is in. */}
                <Tooltip>
                  <TooltipTrigger asChild>
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
                  </TooltipTrigger>
                  <TooltipContent>
                    The same lift ranks differently against a decarbonising grid.
                  </TooltipContent>
                </Tooltip>
                <p id="grid-why" className="sr-only">
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

/**
 * A conflict, as a fact: which assertions cannot hold together, each linked
 * to its line. The question of which gives way is put in the chat, where the
 * person can ask why before choosing — in the turn that ran into it, or in a
 * conversation opened for it from here (`docs/moves.md`, "The conflict, as
 * the worked case").
 */
function Conflict() {
  const { view, label } = useConfigurator();
  const discuss = useDiscuss();
  const question = openConflict(view);
  const at = address.question("conflict");
  const isTarget = useTargeted(at);
  if (!question) return null;
  const options = question.options as { variable: string; option: string }[];
  const awaiting = question.asked?.status === "awaiting";
  return (
    <div
      id={at}
      className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t pt-3 text-sm ${addressable} ${isTarget ? targeted : ""}`}
    >
      <p>
        {options.map((option, index) => (
          <span key={option.option}>
            {index > 0 ? (index === options.length - 1 ? " and " : ", ") : null}
            <To id={address.variable(option.variable)}>{label(option.option)}</To>
          </span>
        ))}{" "}
        cannot hold together.
      </p>
      <Button
        variant="ghost"
        size="xs"
        className="ml-auto"
        onClick={() =>
          awaiting
            ? document
                .getElementById("waiting-question")
                ?.scrollIntoView({ block: "center", behavior: "smooth" })
            : discuss?.(question)
        }
      >
        {awaiting ? "The assistant asked you in the chat" : "Discuss in the chat"}
      </Button>
    </div>
  );
}
