"use client";

import { useRef, useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
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
import { useConfigurator, type Goal as GoalChoice, type Grid, type View } from "./provider";

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
 * The price and carbon of a single choice
 * are beside that choice; here they are the running sum, and say so until
 * nothing is left open.
 */
export function Standing() {
  const { view, gesture, grid, setGrid } = useConfigurator();
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
          <HandedOver />
          {/* Why not yet is beside the button, and the button stays in reach
              and names it, as on the quote surface (`quotes.tsx`). */}
          {quotable.ok ? null : (
            <span id="standing-why-not" className="text-sm">
              {capital(quotable.because)}.
            </span>
          )}
          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              variant={quotable.ok ? "default" : "outline"}
              aria-disabled={!quotable.ok || undefined}
              aria-describedby={quotable.ok ? undefined : "standing-why-not"}
              title={
                quotable.ok
                  ? "Freeze the values and the price as they stand, for thirty days"
                  : `Not yet: ${quotable.because}`
              }
              onClick={() => quotable.ok && void gesture({ act: "quote" })}
            >
              Request a quote
            </Button>
            <HandOver />
          </div>
        </div>

        <Conflict />
        <FinishFor />

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
                    onClick={() => void gesture({ act: "show", facet: "price" })}
                  >
                    Show what each value adds
                  </Button>
                )}
              </div>
              <div>
                {/* Maintaining and running accrue every year of the service
                    life, whatever the maintenance agreement's term. */}
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

/**
 * The person's own handover, with its reason. A reason is words, so the
 * button opens a field rather than firing: the seller is being handed the
 * specification *for* something, and that is the one fact the handover
 * holds that nothing else does (`docs/syncs/handover.md`). The gesture is
 * `APersonHandsOver`; the assistant makes the same one at the person's word.
 */
function HandOver() {
  const { view, gesture } = useConfigurator();
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  // The button is live with the field empty: pressed then, it says what is
  // missing and puts the cursor where it goes, rather than greying out
  // without a word about why.
  const [missing, setMissing] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  // The rule allows a second handover while one waits; the card offers one
  // while none does. The button comes back once the seller has taken it
  // up, which nothing here records yet.
  if (view?.handovers.some((h) => !h.received)) return null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline">
          Hand to the seller
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Hand to the seller</PopoverTitle>
          <PopoverDescription>
            What are they being handed it for? They read the specification as
            it stands, and the log says how it got there.
          </PopoverDescription>
        </PopoverHeader>
        <Textarea
          ref={field}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (e.target.value.trim()) setMissing(false);
          }}
          placeholder="A longer validity than the terms allow"
          rows={3}
          className="mt-2"
          aria-label="What it is handed over for"
          aria-invalid={missing || undefined}
          aria-describedby={missing ? "handover-missing" : undefined}
        />
        {missing ? (
          <p id="handover-missing" className="mt-1 text-xs">
            Say what the seller is being handed it for.
          </p>
        ) : null}
        <Button
          size="sm"
          className="mt-2"
          onClick={() => {
            if (!reason.trim()) {
              setMissing(true);
              // After the message is drawn, so the field is read with it.
              requestAnimationFrame(() => field.current?.focus());
              return;
            }
            void gesture({ act: "handover", reason: reason.trim() });
            setReason("");
            setOpen(false);
          }}
        >
          Hand over
        </Button>
      </PopoverContent>
    </Popover>
  );
}

/**
 * The handover as a state of the specification, beside the other: a badge
 * saying it is with the seller, with who handed it over, when and what for
 * behind it. The badge carries the handover's address, so the chat's link
 * lands on it. The latest handover is the state; the rest are in the log.
 * `received` is never set here, so the badge says the specification is with
 * the seller rather than that they have taken it up.
 */
function HandedOver() {
  const { view } = useConfigurator();
  const handover = view?.handovers.at(-1);
  const at = address.handover(handover?.handover ?? "");
  const isTarget = useTargeted(at);
  if (!handover || handover.received) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          id={at}
          variant="secondary"
          className={`${TONE.info} ${addressable} ${isTarget ? targeted : ""}`}
        >
          With the seller
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="grid gap-1">
          <p>
            {capital(handover.how ?? "handed to the seller")}
            {handover.sent ? `, ${handover.sent}` : ""}.
          </p>
          <p>For: {handover.reason}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function capital(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const GOAL: Record<GoalChoice, string> = {
  cost: "the lowest cost over its life",
  carbon: "the least carbon",
};

/**
 * What the rest is to be finished for, while the assistant's question about
 * it stands. Raised the first time a proposal is wanted and put in the chat
 * like a conflict; answered here or there with the same gesture, and the
 * completion is computed on the answer (`docs/syncs/conduct.md`, "What a
 * completion is finished for is the person's to say").
 */
function FinishFor() {
  const { view, gesture } = useConfigurator();
  const question = view?.questions.find((q) => q.about === "goal");
  const at = address.question("goal");
  const isTarget = useTargeted(at);
  if (!question) return null;
  const awaiting = question.asked?.status === "awaiting";
  return (
    <div
      id={at}
      className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t pt-3 text-sm ${addressable} ${isTarget ? targeted : ""}`}
    >
      <p>Finish the rest for</p>
      {question.options.map((option) =>
        "goal" in option ? (
          <Button
            key={option.goal}
            variant="outline"
            size="xs"
            onClick={() => void gesture({ act: "choose", request: question.request, option })}
          >
            {GOAL[option.goal as GoalChoice]}
          </Button>
        ) : null,
      )}
      {awaiting ? (
        <Button
          variant="ghost"
          size="xs"
          className="ml-auto"
          onClick={() =>
            document
              .getElementById("waiting-question")
              ?.scrollIntoView({ block: "center", behavior: "smooth" })
          }
        >
          The assistant asked you in the chat
        </Button>
      ) : null}
    </div>
  );
}

/**
 * The conflict as a fact. The question of which gives way is put in the chat, where the
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
