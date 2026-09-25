"use client";

import { ChevronDownIcon, SparklesIcon, XIcon } from "lucide-react";
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
import { ClauseText, useAnswering } from "./clauses";
import { Consequences } from "./question";
import { adds, kilos } from "./format";
import { useConfigurator, type Option, type Variable } from "./provider";
import { useShown } from "./showing";

/**
 * The one click that sets a value, and what it carries.
 *
 * In answering mode the pick names the clause it answers and goes to
 * `Binding` (the `answer` gesture); a variable whose value already answers
 * exactly one clause keeps answering it when changed, which is a substitution;
 * otherwise the pick is the slice 0 gesture, a bare `assert`. Which of the
 * three happened is on the log, not here.
 */
function usePick(variable: Variable) {
  const { gesture } = useConfigurator();
  const { answering } = useAnswering();
  const clause =
    answering?.clause ??
    (variable.answers.length === 1 ? variable.answers[0].clause : null);
  return (option: Option) =>
    void gesture(
      clause
        ? { act: "answer", clause, option: option.id }
        : { act: "assert", variable: variable.name, option: option.id },
    );
}

/**
 * The options of a variable, and what is shown beside each.
 *
 * The label is always there. What each option adds to the price or the
 * carbon sits inside its button when the `price` or `carbon` facet is shown;
 * the catalogue's notes and the rules that rule an option out are lists
 * under the buttons when `notes` or `excluded` is. Which of those a person
 * sees is `Showing`'s, not this component's.
 */
function Options({ variable }: { variable: Variable }) {
  const { busy, view } = useConfigurator();
  const shown = useShown();
  const pick = usePick(variable);
  const currency = view?.currency ?? "";
  const price = shown("price");
  const carbon = shown("carbon");
  const noted = shown("notes")
    ? variable.options.filter((o) => o.note)
    : [];
  const excluded = shown("excluded")
    ? variable.options.filter((o) => !o.possible && o.excluded.length)
    : [];
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {variable.options.map((option) => (
          <Button
            key={option.id}
            variant={option.possible ? "outline" : "secondary"}
            size="xs"
            disabled={busy || option.id === variable.asked}
            title={
              option.possible
                ? (option.note ?? undefined)
                : "Ruled out by what has been asserted so far"
            }
            className={cn(
              "h-auto py-1",
              !option.possible && "text-muted-foreground line-through",
            )}
            onClick={() => pick(option)}
          >
            {option.label}
            {price && option.capital !== null ? (
              <span className="font-normal tabular-nums text-muted-foreground">
                {adds(option.capital, currency)}
              </span>
            ) : null}
            {price && option.monthly !== null ? (
              <span className="font-normal tabular-nums text-muted-foreground">
                {adds(option.monthly, currency)}/mo
              </span>
            ) : null}
            {carbon && option.embodied !== null ? (
              <span className="font-normal tabular-nums text-muted-foreground">
                +{kilos(option.embodied)}
              </span>
            ) : null}
          </Button>
        ))}
      </div>
      {noted.length ? (
        <dl className="space-y-0.5 text-xs text-muted-foreground">
          {noted.map((option) => (
            <div key={option.id} className="flex gap-1.5">
              <dt className="shrink-0 text-foreground">{option.label}</dt>
              <dd>{option.note}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {excluded.length ? (
        <ul className="space-y-0.5 text-xs text-muted-foreground">
          {excluded.map((option) => (
            <li key={option.id}>
              <span className="text-foreground line-through">{option.label}</span>{" "}
              {option.excluded.map((rule, i) => (
                <span key={rule.rule}>
                  {i ? " · " : ""}
                  <span className="font-mono">{rule.rule}</span> {rule.because}
                </span>
              ))}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

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
  const { gesture, busy, label, view } = useConfigurator();
  const shown = useShown();
  const unmet = variable.standing === "unmet";
  const yielded = variable.standing === "yielded";
  const framedOnThis = view?.frame?.variable === variable.name;
  return (
    <Card size="sm" className={cn(unmet && "ring-destructive/60")}>
      <CardHeader>
        <CardDescription className="uppercase tracking-wide">
          {variable.heading}
          {/* Held softly: the value answers only negotiable clauses, and
              reached the rules as a preference rather than a requirement. */}
          {variable.softly ? (
            <span className="ml-2 normal-case tracking-normal">negotiable</span>
          ) : null}
        </CardDescription>
        <CardTitle className={cn(yielded && "text-muted-foreground line-through")}>
          {label(variable.asked)}
        </CardTitle>
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
        {shown("how") && variable.how ? (
          <p className="text-xs text-muted-foreground">{variable.how}</p>
        ) : null}
        {/* What the value is for, from `Binding`. An assertion answering no
            clause is the slice 0 case and is said so, not hidden — unless
            the person hid the facet, which is theirs to do. */}
        {shown("answers") ? (
          variable.answers.length ? (
            <ul className="space-y-0.5 text-xs">
              {variable.answers.map((answer) => (
                <li key={answer.clause}>
                  <span className="text-muted-foreground">for:</span> <ClauseText text={answer.text} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">answers no stated requirement</p>
          )
        ) : null}
        <Collapsible>
          <div className="-ml-2 flex flex-wrap items-center gap-1">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="xs" className="text-muted-foreground">
                <ChevronDownIcon className="transition-transform group-data-[state=open]/button:rotate-180" />
                Change
              </Button>
            </CollapsibleTrigger>
            {/* The requirement slice: narrow the canvas to what this
                assertion forced, ruled out or refused — `Framing`. */}
            {!framedOnThis && !unmet && !yielded ? (
              <Button
                variant="ghost"
                size="xs"
                className="text-muted-foreground"
                disabled={busy}
                onClick={() =>
                  void gesture({
                    act: "frame",
                    frame: { by: "assertion", variable: variable.name },
                  })
                }
              >
                What followed from this
              </Button>
            ) : null}
          </div>
          <CollapsibleContent className="pt-1">
            <Options variable={variable} />
          </CollapsibleContent>
        </Collapsible>
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
        {yielded ? (
          <div className="space-y-1">
            {/* A preference the rules could not honour. Not red: by the
                person's own account this was the thing to give up, so no
                question is asked and nothing is refused. `Constraining`
                records nothing about it; the read is `settled` beside
                `inclined`. */}
            <p className="text-xs text-muted-foreground">
              Negotiable, and gave way
              {variable.value ? (
                <>
                  {" "}
                  to <span className="text-foreground">{label(variable.value)}</span>
                </>
              ) : null}
              .
            </p>
            {shown("rules") ? (
              <>
                <Rules rules={variable.owing} />
                {variable.following.length ? (
                  <p className="text-xs text-muted-foreground">
                    from {variable.following.map((f) => f.heading).join(", ")}
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** A variable nobody chose, whose value the rules leave no room to argue with. */
export function FollowsRow({ variable }: { variable: Variable }) {
  const { label } = useConfigurator();
  const shown = useShown();
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
        {shown("rules") ? (
          <>
            <Rules rules={variable.owing} />
            {/* The assertions the value rests on, from the same core. */}
            {variable.following.length ? (
              <p className="text-xs text-muted-foreground">
                from{" "}
                {variable.following.map((f) => f.heading).join(", ")}
              </p>
            ) : null}
          </>
        ) : null}
      </ItemContent>
    </Item>
  );
}

/** A variable still open, with what the rules have left of its range, and
 * what the assistant proposed for it, if anything. The proposal is a
 * `Deciding` request of its own: taking it is `choose`, and it becomes the
 * person's assertion; *not this one* is `decline`, and the whole then adopts
 * the rest. Neither is a pick from the options, which would be the person's
 * own value and read that way. */
export function OpenRow({ variable }: { variable: Variable }) {
  const { gesture, busy } = useConfigurator();
  const live = variable.options.filter((option) => option.possible);
  const gone = variable.options.length - live.length;
  const proposed = variable.proposed;

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
      {proposed ? (
        <div className="flex flex-wrap items-center gap-2 px-3 pb-2 text-xs">
          <span className="text-muted-foreground">
            <SparklesIcon className="mr-1 inline size-3 align-[-2px]" />
            proposed: <span className="text-foreground">{proposed.label}</span>
          </span>
          <Button
            variant="outline"
            size="xs"
            disabled={busy}
            onClick={() =>
              void gesture({
                act: "choose",
                request: proposed.request,
                option: { variable: variable.name, option: proposed.option },
              })
            }
          >
            Take it
          </Button>
          <Button
            variant="ghost"
            size="xs"
            disabled={busy}
            className="text-muted-foreground"
            onClick={() =>
              void gesture({ act: "decline", request: proposed.request })
            }
          >
            Not this one
          </Button>
          {proposed.foreseen ? (
            <div className="basis-full">
              <Consequences foreseen={proposed.foreseen} />
            </div>
          ) : null}
        </div>
      ) : null}
      <CollapsibleContent className="px-3 pb-3">
        <Options variable={variable} />
      </CollapsibleContent>
    </Collapsible>
  );
}
