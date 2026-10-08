"use client";

/**
 * The step bar: where the person is in the job, and what the step there
 * still wants (`Stepping`, docs/syncs/stepping.md).
 *
 * One row, the seller's steps in the seller's order, each a button that
 * opens the step. Pressing a step's name is `take`: the person saying they
 * are at it, a claim and nothing more, so the row is a toggle group and
 * not a stepper — a stepper's pressed segment is where the form has let
 * you get to, and this one is where you said you are. The step the person
 * took is pressed; while they have taken none, the first still wanting
 * something is marked as the place to start, in words, and nothing is
 * pressed, because nobody has said anything yet.
 *
 * What a step wants is the fact beside it: the count on the segment, and
 * the variables themselves, by address, in the popover. Finish, skip and
 * reopen are in the popover rather than on the segment, so the segment is
 * one gesture and the popover the rest, and no step is ever greyed out: the
 * map gates nothing, and a step finished with something still wanting says
 * so rather than refusing.
 */

import { useRef, useState } from "react";
import { CheckIcon, MinusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { address, addressable, targeted, To, useTargeted } from "./address";
import { TONE } from "./tone";
import { useConfigurator, type Step } from "./provider";

const OWNER: Record<string, string> = { person: "you", model: "the assistant" };

export function Steps() {
  const { view, gesture } = useConfigurator();
  const [open, setOpen] = useState<string | null>(null);
  if (!view?.stepping.steps.length) return null;
  const { at, start, steps } = view.stepping;
  const here = steps.find((s) => s.step === at);
  const starting = at ? null : steps.find((s) => s.step === start);

  return (
    <div className="mt-4 space-y-2">
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        spacing={0}
        value={at ?? ""}
        // The pressed segment is the person's claim; pressing it again does
        // not unsay it, so an empty change is ignored.
        onValueChange={(step) => step && void gesture({ act: "take", step })}
        aria-label="Where you are in the job"
        className="flex-wrap"
      >
        {steps.map((step) => (
          <Segment
            key={step.step}
            step={step}
            open={open === step.step}
            onOpen={(is) => setOpen(is ? step.step : null)}
          />
        ))}
      </ToggleGroup>
      <p className="text-xs text-muted-foreground">
        {here ? (
          <Wants step={here} lead={`You are at ${here.name.toLowerCase()}`} />
        ) : starting ? (
          <Wants step={starting} lead={`Start with ${starting.name.toLowerCase()}`} />
        ) : (
          "Every step has what it needs."
        )}
      </p>
    </div>
  );
}

function Wants({ step, lead }: { step: Step; lead: string }) {
  const { view } = useConfigurator();
  const heading = (name: string) =>
    view?.variables.find((v) => v.name === name)?.heading ?? name;
  if (!step.wanting.length) return <>{lead}; it has what it needs.</>;
  return (
    <>
      {lead}; still to say:{" "}
      {step.wanting.map((name, index) => (
        <span key={name}>
          {index > 0 ? (index === step.wanting.length - 1 ? " and " : ", ") : null}
          <To id={address.variable(name)} className="lowercase">
            {heading(name)}
          </To>
        </span>
      ))}
      .
    </>
  );
}

/**
 * One step: the segment is `take`; the mark beside its name is its status
 * and the count is what it still wants; the popover under the mark holds
 * the rest of the step's gestures. The segment carries the step's address.
 */
function Segment({
  step,
  open,
  onOpen,
}: {
  step: Step;
  open: boolean;
  onOpen: (open: boolean) => void;
}) {
  const at = address.step(step.step);
  const isTarget = useTargeted(at);
  return (
    <span
      id={at}
      className={`inline-flex items-stretch ${addressable} ${isTarget ? targeted : ""}`}
    >
      <ToggleGroupItem
        value={step.step}
        aria-label={`You are at ${step.name}`}
        className={`gap-1.5 ${step.status === "skipped" ? "text-muted-foreground" : ""}`}
      >
        {/* The name is struck, not the count: what a skipped step still
            wants is still a fact. */}
        <span className={step.status === "skipped" ? "line-through" : ""}>{step.name}</span>
        {step.wanting.length ? (
          <span className="text-muted-foreground tabular-nums">
            {step.wanting.length}
          </span>
        ) : null}
      </ToggleGroupItem>
      <Popover open={open} onOpenChange={onOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                className="-ml-px"
                aria-label={`${step.name}: ${step.status}`}
              >
                <Mark status={step.status} />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>{step.status}</TooltipContent>
        </Tooltip>
        <PopoverContent align="start" className="w-80">
          <Opened step={step} close={() => onOpen(false)} />
        </PopoverContent>
      </Popover>
    </span>
  );
}

function Mark({ status }: { status: Step["status"] }) {
  if (status === "finished") return <CheckIcon />;
  if (status === "skipped") return <MinusIcon />;
  return <span className="size-2 rounded-full border border-current" aria-hidden />;
}

/**
 * The step opened: what it wants, who owns it, how it was changed from the
 * seller's template, and the gestures. A skip needs a reason, so the button
 * opens a field the way the handover's does (`standing.tsx`); pressed
 * empty, it says what is missing rather than greying out.
 */
function Opened({ step, close }: { step: Step; close: () => void }) {
  const { view, gesture } = useConfigurator();
  const [reason, setReason] = useState("");
  const [skipping, setSkipping] = useState(false);
  const [missing, setMissing] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const heading = (name: string) =>
    view?.variables.find((v) => v.name === name)?.heading ?? name;
  const other = step.owner === "person" ? "model" : "person";
  const act = (stimulus: Parameters<typeof gesture>[0]) => {
    void gesture(stimulus);
    close();
  };
  return (
    <>
      <PopoverHeader>
        <PopoverTitle className="flex items-center gap-2">
          {step.name}
          <Badge
            variant="secondary"
            className={
              step.status === "finished"
                ? TONE.positive
                : step.status === "skipped"
                  ? TONE.caution
                  : undefined
            }
          >
            {step.status}
          </Badge>
        </PopoverTitle>
        <PopoverDescription>
          {step.wanting.length
            ? "Still to say:"
            : step.needs.length
              ? "Everything it needs is on the canvas."
              : "Nothing to ask here; the rules and the proposal settle it."}
        </PopoverDescription>
      </PopoverHeader>
      {step.wanting.length ? (
        <ul className="mt-1 space-y-0.5 text-sm">
          {step.wanting.map((name) => (
            <li key={name}>
              <To id={address.variable(name)}>{heading(name)}</To>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground">
        Owned by {OWNER[step.owner] ?? step.owner}.{" "}
        <Button
          variant="link"
          size="xs"
          className="h-auto px-0"
          onClick={() => act({ act: "reassign", step: step.step, owner: other })}
        >
          Give it to {OWNER[other]}
        </Button>
      </p>
      {step.deviation.length ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {step.deviation
            .map((d) =>
              d.kind === "skip"
                ? `Skipped: ${d.text || "no reason given"}`
                : d.kind === "rename"
                  ? `Was “${d.text}”`
                  : `Added by you`,
            )
            .join(" · ")}
        </p>
      ) : null}
      {skipping ? (
        <>
          <Textarea
            ref={field}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (e.target.value.trim()) setMissing(false);
            }}
            placeholder="The site is not settled yet"
            rows={2}
            className="mt-2"
            aria-label="Why this step is skipped"
            aria-invalid={missing || undefined}
            aria-describedby={missing ? "skip-missing" : undefined}
          />
          {missing ? (
            <p id="skip-missing" className="mt-1 text-xs">
              Say why it is skipped; the reason is kept.
            </p>
          ) : null}
        </>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {step.status === "open" ? (
          <>
            <Button size="sm" onClick={() => act({ act: "finish", step: step.step })}>
              Finish
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (!skipping) return setSkipping(true);
                if (!reason.trim()) {
                  setMissing(true);
                  requestAnimationFrame(() => field.current?.focus());
                  return;
                }
                act({ act: "skip", step: step.step, reason: reason.trim() });
              }}
            >
              Skip
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={() => act({ act: "reopen", step: step.step })}>
            Reopen
          </Button>
        )}
      </div>
    </>
  );
}
