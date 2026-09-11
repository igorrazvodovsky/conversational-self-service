"use client";

import { ChevronDownIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Item, ItemContent } from "@/components/ui/item";
import { cn } from "@/lib/utils";
import { useConfigurator, type Variable } from "./provider";

function Rules({
  rules,
  tone,
}: {
  rules: Variable["owing"];
  tone?: "refused";
}) {
  if (!rules.length) return null;
  return (
    <ul className="space-y-0.5">
      {rules.map((rule) => (
        <li
          key={rule.rule}
          className={cn(
            "text-xs",
            tone === "refused" ? "text-destructive" : "text-muted-foreground",
          )}
        >
          <span className="font-mono">{rule.rule}</span> {rule.because}
        </li>
      ))}
    </ul>
  );
}

/** A variable a party asserted a value for, or asserted an impossible one for. */
export function AskedCard({ variable }: { variable: Variable }) {
  const { gesture, busy, label } = useConfigurator();
  const unmet = variable.standing === "unmet";
  return (
    <Card size="sm" className={cn(unmet && "ring-destructive/60")}>
      <CardHeader>
        <CardDescription className="uppercase tracking-wide">
          {variable.heading}
        </CardDescription>
        <CardTitle>{label(variable.asked)}</CardTitle>
        <CardAction>
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={busy}
            title="Take this back"
            aria-label="Take this back"
            onClick={() =>
              void gesture({ act: "withdraw", variable: variable.name })
            }
          >
            <XIcon />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2">
        {variable.how ? (
          <p className="text-xs text-muted-foreground">{variable.how}</p>
        ) : null}
        {unmet ? (
          <div className="space-y-1">
            <p className="text-xs font-medium text-destructive">
              On record, and not buildable alongside the rest.
            </p>
            {/* The rules that refused it, kept by `Constraining.refused` rather
                than only carried in the question — so the account survives the
                banner being dismissed. */}
            <Rules rules={variable.refused} tone="refused" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** A variable nobody chose, whose value the rules leave no room to argue with. */
export function FollowsRow({ variable }: { variable: Variable }) {
  const { label } = useConfigurator();
  return (
    <Item size="xs" variant="muted" role="listitem" className="items-start">
      <ItemContent className="gap-1">
        {/* Not `ItemTitle`: it clamps to one line, and undoing the clamp
            with `line-clamp-none` sets `display: block`, which drops the gap
            between heading and value. A value has to be free to wrap. */}
        <div className="flex flex-wrap items-baseline gap-x-2 text-xs font-medium">
          <span className="font-normal uppercase tracking-wide text-muted-foreground">
            {variable.heading}
          </span>
          <span className="text-sm">{label(variable.value)}</span>
        </div>
        <Rules rules={variable.owing} />
      </ItemContent>
    </Item>
  );
}

/** A variable still open, with what the rules have left of its range. */
export function OpenRow({ variable }: { variable: Variable }) {
  const { gesture, busy } = useConfigurator();
  const live = variable.options.filter((option) => option.possible);
  const gone = variable.options.length - live.length;

  return (
    <Collapsible className="border-b last:border-b-0">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto w-full justify-between gap-2 px-3 py-2 text-left text-sm font-normal"
        >
          <span>{variable.heading}</span>
          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            {live.length} left{gone ? ` · ${gone} ruled out` : ""}
            <ChevronDownIcon className="transition-transform group-data-[state=open]/button:rotate-180" />
          </span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-wrap gap-1.5 px-3 pb-3">
        {variable.options.map((option) => (
          <Button
            key={option.id}
            variant={option.possible ? "outline" : "secondary"}
            size="xs"
            disabled={busy}
            title={
              option.possible
                ? (option.note ?? undefined)
                : "Ruled out by what has been asserted so far"
            }
            className={cn(
              !option.possible && "text-muted-foreground line-through",
            )}
            onClick={() =>
              void gesture({
                act: "assert",
                variable: variable.name,
                option: option.id,
              })
            }
          >
            {option.label}
          </Button>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
