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
import { useConfigurator } from "./provider";

/**
 * The action log, read back.
 *
 * Nothing here is derived or summarised. Each row is one completion record:
 * who performed it, which concept's action it was, and the name of the
 * synchronization that authorised it — MSM §5.2.3's accountability property,
 * rendered rather than described.
 *
 * The rows with no rule are root actions, and there are only ever two kinds:
 * a person acted on a surface, or the model called a tool. Everything else in
 * the list happened because some rule said it could.
 */
export function Trace() {
  const { view } = useConfigurator();
  const records = [...(view?.log ?? [])].reverse();
  if (!records.length) return null;

  return (
    <Collapsible className="mt-8">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="xs" className="-ml-2 text-muted-foreground">
          <ChevronDownIcon className="transition-transform group-data-[state=open]/button:rotate-180" />
          What just happened, and on whose authority
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card size="sm" className="mt-2">
          <CardContent>
            <ol className="space-y-1">
              {records.map((record) => (
                <li
                  key={record.seq}
                  className="flex flex-wrap items-baseline gap-x-2 text-xs"
                >
                  <Badge
                    variant={record.actor === "model" ? "default" : "outline"}
                    className="w-14 shrink-0"
                  >
                    {record.actor}
                  </Badge>
                  <span className="font-mono">
                    {record.concept}/{record.action}
                  </span>
                  <span className="text-muted-foreground">
                    {record.via ?? "— a root action, authorised by nothing"}
                  </span>
                  {record.output && "error" in record.output ? (
                    <Badge variant="destructive">refused</Badge>
                  ) : null}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
