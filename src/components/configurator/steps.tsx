"use client";

/**
 * The steps of the job beside the one list (docs/syncs/gestures.md, "The
 * canvas is narrowed to one step of the job").
 *
 * The seller's steps as the catalogue lists them, and "All" first.
 * Choosing a step is `frame` by step: the list narrowed to what the step
 * is about, with the gap filters working within it. "All" is `unframe`.
 * That is the whole of it: a step is a place to look, not a thing with a
 * status. Nothing here is taken, finished or skipped, because where the
 * person is in the job is where they are looking, and a step is done when
 * nothing in it is open, which the count already says. A skip that asked
 * for a reason, and a finish that asked for a click, would have been
 * declarations made for the seller's instrument at the person's expense;
 * navigating away is the skip.
 *
 * No count beside a step. What is still open in it is the Open filter's
 * number once the step is chosen; a column of counts on an untouched form
 * is the required-field asterisk in another coat, and what a quote still
 * lacks is `Standing`'s one read against that one goal.
 *
 * The steps have no order, and nothing here says one: no place in a
 * sequence, no arrows to the next, no progress bar. Where the panel is
 * wide, the steps are a rail of vertical tabs to the left of the list,
 * every name whole. Where it is narrow, the same choice is a picker. Both
 * are rendered and a container query shows one, so the list never moves
 * between them. Tabs rather than a stepper, because a stepper's active
 * segment is where the form let you get to, and this one is where you
 * chose to look.
 */

import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { address, addressable, targeted, useTargeted } from "./address";
import { useNavigate } from "./link";
import { useConfigurator, type Step } from "./provider";

/** Which step frames the list, and the way to another one. */
function useSteps() {
  const { view } = useConfigurator();
  // A step is a place the person goes, and the back button returns from.
  const navigate = useNavigate();
  const steps = view?.steps ?? [];
  const framed = view?.frame?.by === "step" ? view.frame.step : null;
  const active = framed ?? "all";
  const go = (next: string) => {
    if (next !== active)
      void navigate(
        next === "all" ? { act: "unframe" } : { act: "frame", frame: { by: "step", step: next } },
      );
  };
  return { steps, active, here: steps.find((s) => s.step === framed) ?? null, go };
}

/**
 * The rail, or the picker, and beside or under it `children`: the list's
 * column. With no steps in the catalogue, the column alone.
 */
export function StepTabs({ children }: { children?: React.ReactNode }) {
  const { steps, active, go } = useSteps();
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
        aria-label="Steps"
        className="sticky top-4 hidden w-48 shrink-0 items-stretch gap-px bg-transparent p-0 @3xl:flex"
      >
        <TabsTrigger value="all" className={cn("flex-none", selected)}>
          All
        </TabsTrigger>
        {steps.map((step) => (
          <Tab key={step.step} step={step} />
        ))}
      </TabsList>
      <Picker className="@3xl:hidden" />
      <div className="min-w-0 flex-1">{children}</div>
    </Tabs>
  );
}

/** The active step as a filled row. */
const selected = "data-active:bg-foreground/10 dark:data-active:border-transparent dark:data-active:bg-foreground/10";

/** One step in the rail. The entry carries the step's address. */
function Tab({ step }: { step: Step }) {
  const at = address.step(step.step);
  const isTarget = useTargeted(at);
  return (
    <TabsTrigger
      id={at}
      value={step.step}
      className={cn("flex-none whitespace-normal text-left", selected, addressable, isTarget && targeted)}
    >
      {step.name}
    </TabsTrigger>
  );
}

/**
 * The narrow form: a menu of the steps, and the one the list is narrowed
 * to as its label.
 */
function Picker({ className }: { className?: string }) {
  const { steps, active, here, go } = useSteps();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="xs" className={cn("w-full min-w-0 justify-between", className)}>
          <span className="truncate">{here ? here.name : "All steps"}</span>
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width)">
        <DropdownMenuRadioGroup value={active} onValueChange={go}>
          <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
          {steps.map((step) => (
            <DropdownMenuRadioItem key={step.step} value={step.step}>
              {step.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
