"use client";

/**
 * The steps of the job beside the one list (`Stepping`,
 * docs/syncs/stepping.md).
 *
 * The seller's steps in the seller's order, and "All" first. The active
 * step is what the list is narrowed to, and choosing a step is `take`: the
 * person saying they are at it, recorded, and the canvas framed to what
 * the step is about in the same gesture. "All" is `unframe`, and the claim
 * stands in the log: the assistant still asks about the step taken.
 *
 * Where the panel is wide, the steps are a rail of vertical tabs to the
 * left of the list: a sequence reads down, every name is whole, and the
 * order is visible without counting. A row of ten tabs wrapped into two
 * rows that read as two groups. Where it is narrow, the same choice is a
 * picker with the step's place in the sequence, arrows to the steps either
 * side, and a bar with a segment per step, so the whole job and each
 * step's status stay in view without the names. Both are rendered and a
 * container query shows one, so the list never moves between them.
 *
 * Tabs rather than a stepper, because a stepper's active segment is where
 * the form let you get to, and this one is where you said you are: no step
 * is ever disabled, and a step finished with something still wanting says
 * so rather than refusing.
 */

import { useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, MinusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { cn } from "@/lib/utils";
import { TONE } from "./tone";
import { address, addressable, targeted, useTargeted } from "./address";
import { useNavigate } from "./link";
import { useConfigurator, type Step } from "./provider";

/** Which step frames the list, and the way to another one. */
function useSteps() {
  const { view } = useConfigurator();
  // A step is a place the person goes, and the back button returns from.
  const navigate = useNavigate();
  const steps = view?.stepping.steps ?? [];
  const framed = view?.frame?.by === "step" ? view.frame.step : null;
  const active = framed ?? "all";
  const go = (next: string) => {
    if (next !== active)
      void navigate(next === "all" ? { act: "unframe" } : { act: "take", step: next });
  };
  return { steps, at: view?.stepping.at ?? null, active, here: steps.find((s) => s.step === framed) ?? null, go };
}

/**
 * The rail, or the picker, and beside or under it `children`: the list's
 * column, whose header is `StepHeading` and the gap filters. With no steps
 * authored, the column alone.
 */
export function StepTabs({ children }: { children?: React.ReactNode }) {
  const { steps, at, active, go } = useSteps();
  if (!steps.length) return <>{children}</>;
  return (
    <Tabs
      orientation="vertical"
      value={active}
      onValueChange={go}
      className="flex-col items-stretch gap-3 @3xl:flex-row @3xl:items-start @3xl:gap-6"
    >
      {/* Sticky, so the steps stay in reach down a long list. */}
      <TabsList
        variant="line"
        aria-label="Steps"
        className="sticky top-4 hidden w-48 shrink-0 items-stretch p-0 @3xl:flex"
      >
        {/* Indented past the marks, so every name starts on one line. */}
        <TabsTrigger value="all" className="flex-none pl-7">
          All
        </TabsTrigger>
        {steps.map((step) => (
          <Tab key={step.step} step={step} taken={step.step === at && step.step !== active} />
        ))}
      </TabsList>
      <Picker className="@3xl:hidden" />
      <div className="min-w-0 flex-1">{children}</div>
    </Tabs>
  );
}

/** What a step still wants, as a count, with its names on hover. The
 * count is the open variables the seller said this step must settle, a
 * different unit from the gap filters' open values the step is about, and
 * the tooltip says which. */
function Wanting({ step }: { step: Step }) {
  const { view } = useConfigurator();
  if (!step.wanting.length) return null;
  const heading = (name: string) => view?.variables.find((v) => v.name === name)?.heading ?? name;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="ml-auto pl-2 font-normal tabular-nums text-muted-foreground">
          {step.wanting.length}
        </span>
      </TooltipTrigger>
      <TooltipContent side="right">
        Still to say: {step.wanting.map(heading).join(", ").toLowerCase()}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * One step in the rail: its status mark, its name, and what it still
 * wants. The entry carries the step's address. The step the person took is
 * underlined faintly when another is active, so the claim is visible
 * without a second control.
 */
function Tab({ step, taken }: { step: Step; taken: boolean }) {
  const at = address.step(step.step);
  const isTarget = useTargeted(at);
  return (
    <TabsTrigger
      id={at}
      value={step.step}
      title={step.status}
      className={cn(
        "flex-none whitespace-normal text-left",
        addressable,
        isTarget && targeted,
        step.status === "skipped" && "text-muted-foreground/60",
      )}
    >
      <Mark status={step.status} />
      {/* The name is struck, not the count: what a skipped step still
          wants is still a fact. */}
      <span
        className={cn(
          step.status === "skipped" && "line-through",
          taken && "underline decoration-foreground/30 underline-offset-4",
        )}
      >
        {step.name}
      </span>
      <Wanting step={step} />
    </TabsTrigger>
  );
}

function Mark({ status }: { status: Step["status"] }) {
  if (status === "finished") return <CheckIcon aria-hidden />;
  if (status === "skipped") return <MinusIcon aria-hidden />;
  return <span className="mx-[5px] size-1.5 shrink-0 rounded-full border border-current" aria-hidden />;
}

/**
 * The narrow form: the step and its place in the sequence, the steps
 * either side, and a segment per step. The menu and the arrows are the way
 * by keyboard; the segments are the overview, and a pointer's shortcut, so
 * they are left out of the tab order and of what a screen reader hears.
 */
function Picker({ className }: { className?: string }) {
  const { steps, active, here, go } = useSteps();
  const order = ["all", ...steps.map((s) => s.step)];
  const i = order.indexOf(active);
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Previous step"
          disabled={i <= 0}
          onClick={() => go(order[i - 1])}
        >
          <ChevronLeftIcon />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="xs" className="min-w-0 flex-1 justify-between">
              <span className="truncate">
                {here ? here.name : "All steps"}
                {here ? (
                  <span className="text-muted-foreground"> · {i} of {steps.length}</span>
                ) : null}
              </span>
              <ChevronDownIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width)">
            <DropdownMenuRadioGroup value={active} onValueChange={go}>
              <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
              {steps.map((step) => (
                <DropdownMenuRadioItem key={step.step} value={step.step} className="gap-1.5">
                  <Mark status={step.status} />
                  <span className={cn(step.status === "skipped" && "line-through")}>{step.name}</span>
                  {step.wanting.length ? (
                    <span className="ml-auto tabular-nums text-muted-foreground">{step.wanting.length}</span>
                  ) : null}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Next step"
          disabled={i >= order.length - 1}
          onClick={() => go(order[i + 1])}
        >
          <ChevronRightIcon />
        </Button>
      </div>
      <div className="flex gap-0.5" aria-hidden>
        {steps.map((step) => (
          <button
            key={step.step}
            type="button"
            tabIndex={-1}
            title={`${step.name}: ${step.status}`}
            onClick={() => go(step.step)}
            className={cn(
              "h-1.5 flex-1 cursor-pointer",
              step.status === "finished"
                ? "bg-foreground/70"
                : step.status === "skipped"
                  ? "bg-muted-foreground/30"
                  : "border border-foreground/30",
              step.step === active && "outline outline-1 outline-offset-1 outline-foreground",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * The list's heading while a step frames it: the step's name and place in
 * the sequence, its status where that says something, and the gestures
 * that change it. Open is every step's state until it is not, and the mark
 * beside the name already says it, so only finished and skipped get a
 * badge; a skip carries its reason. The name and place are left to the
 * picker where the picker shows them. What the step still wants is not
 * restated: the Open filter counts it and the list shows it. A skip needs
 * a reason, so that button opens a field the way the handover's does
 * (`standing.tsx`); pressed empty, it says what is missing rather than
 * greying out.
 */
export function StepHeading() {
  const { gesture } = useConfigurator();
  const { steps, here } = useSteps();
  if (!here) return null;
  const tone = here.status === "finished" ? TONE.positive : TONE.caution;
  const reason = [...here.deviation].reverse().find((d) => d.kind === "skip")?.text;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <h3 className="hidden text-sm font-semibold @3xl:block">
        {here.name}
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          {steps.indexOf(here) + 1} of {steps.length}
        </span>
      </h3>
      {here.status !== "open" ? (
        <Badge variant="secondary" className={tone}>
          {here.status}
        </Badge>
      ) : null}
      {here.status === "skipped" && reason ? (
        <span className="text-xs text-muted-foreground">{reason}</span>
      ) : null}
      <span className="ml-auto flex gap-1">
        {here.status === "open" ? (
          <>
            <Button variant="outline" size="xs" onClick={() => void gesture({ act: "finish", step: here.step })}>
              Finish
            </Button>
            <SkipStep step={here} />
          </>
        ) : (
          <Button variant="outline" size="xs" onClick={() => void gesture({ act: "reopen", step: here.step })}>
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
