"use client";

/**
 * The tool-call row every backend tool gets in the chat. Built from shadcn
 * primitives (docs/ui.md), which compile through `@import "tailwindcss"` in
 * `src/app/globals.css`; copying this file into another project requires the
 * same components and Tailwind build. See CopilotKit issue #4777.
 */

import { useEffect, useState } from "react";
import { Wrench, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Spinner } from "@/components/ui/spinner";

interface ToolReasoningProps {
  name: string;
  args?: object | unknown;
  status: string;
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === "object" && value !== null)
    return `{${Object.keys(value).length} keys}`;
  if (typeof value === "string") return `"${value}"`;
  return String(value);
}

export function ToolReasoning({ name, args, status }: ToolReasoningProps) {
  const entries = args ? Object.entries(args) : [];
  const isRunning = status === "executing" || status === "inProgress";
  const [open, setOpen] = useState(isRunning);

  useEffect(() => setOpen(isRunning), [isRunning]);

  const heading = (
    <>
      {isRunning ? <Spinner className="size-3" /> : <Check />}
      <Wrench />
      <span className="font-mono">{name}</span>
    </>
  );

  if (entries.length === 0) {
    return (
      <div className="my-1.5 flex items-center gap-2 text-xs text-muted-foreground [&_svg]:size-3">
        {heading}
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="my-1.5">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          className="-ml-2 w-[calc(100%+--spacing(2))] justify-start text-muted-foreground"
        >
          {heading}
          <ChevronDown className="ml-auto transition-transform group-data-[state=open]/button:rotate-180" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1.5 ml-5 space-y-1 bg-muted px-3 py-2 font-mono text-xs">
        {entries.map(([key, value]) => (
          <div key={key} className="flex min-w-0 gap-2">
            <span className="shrink-0 text-muted-foreground">{key}:</span>
            <span className="truncate">{formatValue(value)}</span>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
