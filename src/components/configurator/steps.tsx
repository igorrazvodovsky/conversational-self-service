"use client";

/**
 * The step bar: where the person is in the job, and what the step there
 * still wants (`Stepping`, docs/syncs/stepping.md).
 *
 * One row, the seller's steps in the seller's order, each a segment that
 * is `take`: the person saying they are at it. Taking a step also frames
 * the canvas to what the step is about, so the segment is one gesture
 * with the whole canvas as its consequence, and the step's own controls —
 * finish, skip, reopen — are in the frame's banner (`index.tsx`) with the
 * other frames'. The pressed segment is the step the person took, which
 * is a claim and not a frame: showing everything again leaves it pressed.
 * It is a toggle group and not a stepper — a stepper's pressed segment is
 * where the form has let you get to, and this one is where you said you
 * are. While no step is taken, the first still wanting something is named
 * as the place to start, in words, and nothing is pressed.
 *
 * What a step wants is the fact beside it: the count on the segment, and
 * its status mark. No step is ever greyed out: the map gates nothing, and
 * a step finished with something still wanting says so rather than
 * refusing.
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
import { TONE } from "./tone";
import { address, addressable, targeted, To, useTargeted } from "./address";
import { useNavigate } from "./link";
import { useConfigurator, type Step } from "./provider";

export function Steps() {
  const { view } = useConfigurator();
  // A step is a place the person goes, and the back button returns from.
  const navigate = useNavigate();
  if (!view?.stepping.steps.length) return null;
  const { at, start, steps } = view.stepping;
  // While the step frames the canvas, the banner says all this.
  const framed = view.frame?.by === "step" ? view.frame.step : null;
  const here = steps.find((s) => s.step === at && s.step !== framed);
  const starting = at ? null : steps.find((s) => s.step === start);

  return (
    <div className="mt-4 space-y-2">
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        spacing={0}
        value={at ?? ""}
        // The pressed segment is the person's claim, and pressing it again
        // does not unsay it: the group's own change is ignored, and each
        // segment's click is the take, so pressing the taken step while
        // the canvas shows everything frames it again.
        onValueChange={() => undefined}
        aria-label="Where you are in the job"
        className="flex-wrap"
      >
        {steps.map((step) => (
          <Segment
            key={step.step}
            step={step}
            take={() => void navigate({ act: "take", step: step.step })}
          />
        ))}
      </ToggleGroup>
      <p className="text-xs text-muted-foreground">
        {here ? (
          <Wants step={here} lead={`You are at ${here.name.toLowerCase()}`} />
        ) : starting ? (
          <Wants step={starting} lead={`Start with ${starting.name.toLowerCase()}`} />
        ) : framed || at ? null : (
          "Every step has what it needs."
        )}
      </p>
    </div>
  );
}

/** What a step still wants, as links, after a lead-in. */
function Wants({ step, lead }: { step: Step; lead: string }) {
  if (!step.wanting.length) return <>{lead}; it has what it needs.</>;
  return (
    <>
      {lead}; still to say: <WantList step={step} />.
    </>
  );
}

/** The variables a step still wants, linked, joined as a sentence would. */
function WantList({ step }: { step: Step }) {
  const { view } = useConfigurator();
  const heading = (name: string) =>
    view?.variables.find((v) => v.name === name)?.heading ?? name;
  return (
    <>
      {step.wanting.map((name, index) => (
        <span key={name}>
          {index > 0 ? (index === step.wanting.length - 1 ? " and " : ", ") : null}
          <To id={address.variable(name)} className="lowercase">
            {heading(name)}
          </To>
        </span>
      ))}
    </>
  );
}

/**
 * One step: the segment is `take`; the mark before its name is its status
 * and the count after it is what it still wants. The segment carries the
 * step's address.
 */
function Segment({ step, take }: { step: Step; take: () => void }) {
  const at = address.step(step.step);
  const isTarget = useTargeted(at);
  return (
    <ToggleGroupItem
      id={at}
      value={step.step}
      onClick={take}
      aria-label={`You are at ${step.name}`}
      title={step.status}
      className={`gap-1.5 ${addressable} ${isTarget ? targeted : ""} ${
        step.status === "skipped" ? "text-muted-foreground" : ""
      }`}
    >
      <Mark status={step.status} />
      {/* The name is struck, not the count: what a skipped step still
          wants is still a fact. */}
      <span className={step.status === "skipped" ? "line-through" : ""}>{step.name}</span>
      {step.wanting.length ? (
        <span className="text-muted-foreground tabular-nums">{step.wanting.length}</span>
      ) : null}
    </ToggleGroupItem>
  );
}

export function Mark({ status }: { status: Step["status"] }) {
  if (status === "finished") return <CheckIcon aria-hidden />;
  if (status === "skipped") return <MinusIcon aria-hidden />;
  return <span className="size-2 rounded-full border border-current" aria-hidden />;
}

/**
 * The step as the frame's banner: what the list is narrowed to, what the
 * step still wants, its status, and the gestures that change it. A skip
 * needs a reason, so that button opens a field the way the handover's
 * does (`standing.tsx`); pressed empty, it says what is missing rather
 * than greying out. The way out, showing everything, is the banner's as
 * for every frame, and it leaves the step taken.
 */
export function StepBanner({ step }: { step: Step }) {
  const { gesture } = useConfigurator();
  const tone =
    step.status === "finished" ? TONE.positive : step.status === "skipped" ? TONE.caution : "";
  return (
    <>
      <span className="min-w-0">
        <span className="text-muted-foreground">Working on </span>
        <To id={address.step(step.step)} className="font-medium">
          {step.name}
        </To>
      </span>
      <Badge variant="secondary" className={tone}>
        {step.status}
      </Badge>
      <span className="text-muted-foreground">
        {step.wanting.length ? (
          <>
            still to say: <WantList step={step} />
          </>
        ) : (
          "it has what it needs"
        )}
      </span>
      <span className="ml-auto flex gap-1">
        {step.status === "open" ? (
          <>
            <Button variant="ghost" size="xs" onClick={() => void gesture({ act: "finish", step: step.step })}>
              Finish
            </Button>
            <SkipStep step={step} />
          </>
        ) : (
          <Button variant="ghost" size="xs" onClick={() => void gesture({ act: "reopen", step: step.step })}>
            Reopen
          </Button>
        )}
        <Button variant="ghost" size="xs" onClick={() => void gesture({ act: "unframe" })}>
          Show everything
        </Button>
      </span>
    </>
  );
}

function SkipStep({ step }: { step: Step }) {
  const { gesture } = useConfigurator();
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const [missing, setMissing] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="xs">
          Skip
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Skip {step.name.toLowerCase()}</PopoverTitle>
          <PopoverDescription>
            Why? The reason is kept, as a deviation from the seller's steps.
            Nothing is locked: the step can be reopened.
          </PopoverDescription>
        </PopoverHeader>
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
            Say why it is skipped.
          </p>
        ) : null}
        <Button
          size="sm"
          className="mt-2"
          onClick={() => {
            if (!reason.trim()) {
              setMissing(true);
              requestAnimationFrame(() => field.current?.focus());
              return;
            }
            void gesture({ act: "skip", step: step.step, reason: reason.trim() });
            setReason("");
            setOpen(false);
          }}
        >
          Skip
        </Button>
      </PopoverContent>
    </Popover>
  );
}
