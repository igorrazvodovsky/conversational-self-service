"use client";

import { ChevronDownIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { address, addressable, Said, targeted, useHash, useTargeted } from "./address";
import { useConfigurator, type Turn } from "./provider";

/**
 * The action log, read by turn.
 *
 * A flow is one occasion: the person's words and the calls the model made in
 * reply, or one gesture and what the rules did with it. So the question this
 * answers is *what did this turn do, and on whose authority*, and the turn is
 * the unit, at `#turn:<flow>` (`docs/ui.md`, "What a view is"). Under each,
 * every completion record as it was written: who performed it, which
 * concept's action it was, and the synchronization that authorised it — MSM
 * §5.2.3's accountability property, rendered rather than described.
 *
 * The record with no rule is the root action that opened the turn: a person
 * acted on a surface, said something, or the model called a tool. Everything
 * else under it happened because some rule said it could.
 */
export function Trace() {
  const { view } = useConfigurator();
  const hash = useHash();
  const [open, setOpen] = useState(false);
  const addressed = hash.startsWith("turn:");
  useEffect(() => {
    if (addressed) setOpen(true);
  }, [addressed]);
  const turns = view?.turns ?? [];
  if (!turns.length) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-8">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="xs" className="-ml-2 text-muted-foreground">
          <ChevronDownIcon className="transition-transform group-data-[state=open]/button:rotate-180" />
          What each turn did, and on whose authority
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ol className="mt-2 grid gap-2">
          {runs(turns).map((run) =>
            run.length === 1 && !run[0].moved ? (
              <OneTurn key={run[0].flow} turn={run[0]} />
            ) : (
              <Moves key={run[0].flow} turns={run} hash={hash} />
            ),
          )}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** The turns, with each run of surfaces brought forward kept together. */
function runs(turns: Turn[]): Turn[][] {
  const out: Turn[][] = [];
  for (const turn of turns) {
    const last = out.at(-1);
    if (turn.moved && last?.[0].moved) last.push(turn);
    else out.push([turn]);
  }
  return out;
}

/** A run of turns that only brought a surface forward: one line, opened to
 * show them, and opened by itself when one of them is addressed. */
function Moves({ turns, hash }: { turns: Turn[]; hash: string }) {
  const [open, setOpen] = useState(false);
  const addressed = turns.some((t) => hash === address.turn(t.flow));
  useEffect(() => {
    if (addressed) setOpen(true);
  }, [addressed]);
  const who = new Set(turns.map((t) => WHO[t.actor] ?? t.actor));
  const times = turns.length === 1 ? "once" : `${turns.length} times`;
  return (
    <li>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="xs" className="text-muted-foreground">
            <ChevronDownIcon className="transition-transform group-data-[state=open]/button:rotate-180" />
            {[...who].join(" and ")} switched surface {times}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ol className="mt-2 grid gap-2">
            {turns.map((turn) => (
              <OneTurn key={turn.flow} turn={turn} />
            ))}
          </ol>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

const WHO: Record<string, string> = {
  person: "You",
  model: "The assistant",
  browser: "Your agent",
};

function OneTurn({ turn }: { turn: Turn }) {
  const id = address.turn(turn.flow);
  const isTarget = useTargeted(id);
  const who = WHO[turn.actor] ?? turn.actor;
  return (
    <li id={id} className={cn(addressable, isTarget && targeted)}>
      <Card size="sm">
        <CardContent className="space-y-2">
          <p className="text-sm">
            {turn.said ? (
              <>
                {who} said{" "}
                <Said utterance={turn.said.utterance} text={turn.said.text} />
              </>
            ) : (
              <>
                {who}: <span className="font-mono text-xs">{turn.opened}</span>
              </>
            )}
          </p>
          <ol className="space-y-1">
            {turn.records.map((record) => (
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
                {record.refused ? <Badge variant="outline">refused</Badge> : null}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </li>
  );
}
