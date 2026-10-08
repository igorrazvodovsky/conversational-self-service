"use client";

/**
 * The steps of the job as tabs over the one list (`Stepping`,
 * docs/syncs/stepping.md).
 *
 * The seller's steps in the seller's order, and "All" first. The active
 * tab is what the list is narrowed to, and choosing a step is `take`: the
 * person saying they are at it, recorded, and the canvas framed to what
 * the step is about in the same gesture. "All" is `unframe`, and the claim
 * stands in the log: the assistant still asks about the step taken. The
 * tab's panel is the list itself, under the gap filters, which work
 * within the step; the step's status, what it still wants and its
 * controls are the panel's header, so the choice and its state are in
 * one place. Tabs rather than a stepper, because a stepper's active
 * segment is where the form let you get to, and this one is where you
 * said you are: no tab is ever disabled, and a step finished with
 * something still wanting says so rather than refusing.
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TONE } from "./tone";
import { address, addressable, targeted, useTargeted } from "./address";
import { useNavigate } from "./link";
import { useConfigurator, type Step } from "./provider";

/**
 * `children` is the gap filter row, which is the active tab's panel: the
 * gaps are counted within the step, and the panel's edge says so, so the
 * two rows read as two axes — where in the job, and which kind of fact —
 * rather than as two menus of the same kind. With "All" active there is
 * no panel edge, because nothing is within anything.
 */
export function StepTabs({ children }: { children?: React.ReactNode }) {
  const { view } = useConfigurator();
  // A step is a place the person goes, and the back button returns from.
  const navigate = useNavigate();
  if (!view?.stepping.steps.length) return null;
  const { at, steps } = view.stepping;
  const framed = view.frame?.by === "step" ? view.frame.step : null;
  const active = framed ?? "all";
  const here = steps.find((s) => s.step === framed);
  return (
    <Tabs
      value={active}
      onValueChange={(next) =>
        next !== active && void navigate(next === "all" ? { act: "unframe" } : { act: "take", step: next })
      }
      className="gap-1"
    >
      {/* Ten steps wrap at the panel's width; the primitive's one-line
          height is lifted so the rows stack, with room for the active
          underline under each. */}
      <TabsList
        variant="line"
        className="h-auto flex-wrap justify-start gap-y-2 py-1 group-data-horizontal/tabs:h-auto"
      >
        <TabsTrigger value="all" className="flex-none">
          All
        </TabsTrigger>
        {steps.map((step) => (
          <Tab key={step.step} step={step} taken={step.step === at} />
        ))}
      </TabsList>
      <div className={here ? "space-y-2 border-l-2 border-foreground/20 pl-3" : "space-y-2"}>
        {here ? <StepHeader step={here} /> : null}
        {children}
      </div>
    </Tabs>
  );
}

/**
 * One step's tab: its status mark, its name, and the count of what it
 * still wants. That count is a different unit from the gap filters' — the
 * open variables the seller said this step must settle, not every open
 * value the step is about — and the tooltip on it says which. The tab
 * carries the step's address. The step the person took is underlined
 * faintly when another tab is active, so the claim is visible without a
 * second control.
 */
function Tab({ step, taken }: { step: Step; taken: boolean }) {
  const { view } = useConfigurator();
  const at = address.step(step.step);
  const isTarget = useTargeted(at);
  const heading = (name: string) =>
    view?.variables.find((v) => v.name === name)?.heading ?? name;
  return (
    <TabsTrigger
      id={at}
      value={step.step}
      title={step.status}
      className={`flex-none ${addressable} ${isTarget ? targeted : ""} ${
        step.status === "skipped" ? "text-muted-foreground/60" : ""
      } ${taken ? "underline decoration-foreground/30 underline-offset-4" : ""}`}
    >
      <Mark status={step.status} />
      {/* The name is struck, not the count: what a skipped step still
          wants is still a fact. */}
      <span className={step.status === "skipped" ? "line-through" : ""}>{step.name}</span>
      {step.wanting.length ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="font-normal tabular-nums text-muted-foreground">
              {step.wanting.length}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            Still to say: {step.wanting.map(heading).join(", ").toLowerCase()}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </TabsTrigger>
  );
}

function Mark({ status }: { status: Step["status"] }) {
  if (status === "finished") return <CheckIcon aria-hidden />;
  if (status === "skipped") return <MinusIcon aria-hidden />;
  return <span className="size-1.5 rounded-full border border-current" aria-hidden />;
}

/**
 * The panel's header: the step's status and the gestures that change it.
 * What the step still wants is not restated here: the Open filter counts
 * it and the list shows it. A skip needs a reason, so that button opens a
 * field the way the handover's does (`standing.tsx`); pressed empty, it
 * says what is missing rather than greying out.
 */
function StepHeader({ step }: { step: Step }) {
  const { gesture } = useConfigurator();
  const tone =
    step.status === "finished" ? TONE.positive : step.status === "skipped" ? TONE.caution : "";
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      <Badge variant="secondary" className={tone}>
        {step.status}
      </Badge>
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
      </span>
    </div>
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
