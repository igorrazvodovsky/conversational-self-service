"use client";

import {
  BotIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  SparklesIcon,
  TriangleAlertIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Item, ItemContent } from "@/components/ui/item";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { address, addressable, targeted as targetedRing, To, useTargeted } from "./address";
import { ClauseText, useAnswering } from "./clauses";
import { Consequences } from "./question";
import { adds, kilos } from "./format";
import { useConfigurator, type Option, type Variable } from "./provider";
import { useShown } from "./showing";

/**
 * In answering mode the pick names the clause it answers and goes to
 * `Binding` (the `answer` gesture); a variable whose value already answers
 * exactly one clause keeps answering it when changed, which is a substitution;
 * otherwise the pick is a bare `assert`. Which of the
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
 * Which facts a person sees beside each option is `Showing`'s, not this
 * component's. The catalogue's note is advice about one option, read while
 * choosing it, so it is that option's tooltip rather than a line of its own:
 * as a list it repeated every label beneath the buttons.
 *
 * An option the rules rule out stays a choice: picking it records the
 * assertion and puts the conflict to the person. So it is not struck, which
 * would say it is gone, but marked in the caution hue as one that conflicts.
 */
function Options({ variable }: { variable: Variable }) {
  const { view } = useConfigurator();
  const shown = useShown();
  const pick = usePick(variable);
  const currency = view?.currency ?? "";
  const price = shown("price");
  const carbon = shown("carbon");
  const excluded = shown("excluded")
    ? variable.options.filter((o) => !o.possible && o.excluded.length)
    : [];
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {variable.options.map((option) => {
          const tip = option.possible
            ? option.note
            : "Conflicts with what has been asserted so far. Picking it puts the conflict to you.";
          // The current value is pressed rather than disabled: it stays in
          // reach and keeps its note, and pressing it again changes nothing.
          const current = option.id === variable.asked;
          const button = (
            <Button
              variant="outline"
              size="xs"
              aria-pressed={current}
              className={cn(
                "h-auto py-1",
                !option.possible && "border-dashed text-muted-foreground",
              )}
              onClick={() => current || pick(option)}
            >
              {current ? (
                <CheckIcon />
              ) : !option.possible ? (
                <TriangleAlertIcon aria-hidden className="text-caution" />
              ) : null}
              {option.label}
              {/* The tick and the caution mark are for the eye only. */}
              {current ? (
                <span className="sr-only">, the current value</span>
              ) : !option.possible ? (
                <span className="sr-only">, conflicts with what has been asserted</span>
              ) : null}
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
              {carbon && option.carbon !== null ? (
                <span className="font-normal tabular-nums text-muted-foreground">
                  {option.carbon < 0 ? "−" : "+"}
                  {kilos(Math.abs(option.carbon))}
                </span>
              ) : null}
            </Button>
          );
          if (!tip) return <span key={option.id}>{button}</span>;
          return (
            <Tooltip key={option.id}>
              <TooltipTrigger asChild>{button}</TooltipTrigger>
              <TooltipContent>{tip}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      {excluded.length ? (
        <ul className="space-y-0.5 text-xs text-muted-foreground">
          {excluded.map((option) => (
            <li key={option.id}>
              <span className="text-foreground">{option.label}</span> conflicts with{" "}
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

function Rules({ rules }: { rules: Variable["owing"] }) {
  if (!rules.length) return null;
  return (
    <ul className="space-y-0.5">
      {rules.map((rule) => (
        <li
          key={rule.rule}
          className="text-xs text-muted-foreground"
        >
          <span className="font-mono">{rule.rule}</span> {rule.because}
        </li>
      ))}
    </ul>
  );
}

/**
 * The assistant's mark is the sparkles its proposals carry. The open line
 * still says the `how` sentence in full.
 */
const MARKS = {
  person: { Icon: UserIcon, who: "you" },
  browser: { Icon: BotIcon, who: "your agent" },
  model: { Icon: SparklesIcon, who: "the assistant" },
} as const;

export function ByMark({ variable }: { variable: Variable }) {
  const shown = useShown();
  if (!shown("how") || !variable.by) return null;
  const { Icon, who } = MARKS[variable.by];
  return (
    <span
      title={variable.how ? variable.how[0].toUpperCase() + variable.how.slice(1) : undefined}
      className="self-center text-muted-foreground"
    >
      <Icon aria-hidden className="size-3" />
      <span className="sr-only">put there by {who}: </span>
    </span>
  );
}

/**
 * A fact of the situation, said beside its value: the building is what the
 * person says it is, not a choice, so the line says whose word it rests on
 * and lets them say they checked it on site. Checking records the value as
 * measured and makes it theirs, which takes it out of the assistant's reach
 * and out of a conflict's options (`docs/syncs/situating.md`).
 */
function GivenLine({ variable }: { variable: Variable }) {
  const { gesture, busy } = useConfigurator();
  const given = variable.given;
  if (!given || !variable.asked) return null;
  const who = MARKS[given.by].who;
  return (
    <p className="flex flex-wrap items-baseline gap-x-2">
      {given.certainty === "measured"
        ? `A fact of the building, measured on site by ${who}.`
        : given.by === "model"
          ? "A fact of the building, as the assistant took it; not checked."
          : `A fact of the building, as ${who} stated it; the assistant cannot change it.`}
      {given.certainty !== "measured" ? (
        <Button
          variant="link"
          size="xs"
          className="h-auto px-0 text-xs"
          disabled={busy}
          onClick={() => void gesture({ act: "survey", fact: variable.name, value: variable.asked })}
        >
          I checked this on site
        </Button>
      ) : null}
    </p>
  );
}

/**
 * A value a party asserted, on a line of the ledger. The value is the line's
 * way into the rest, which `AssertedDetails` draws while the line is open.
 * What stands
 * against the value is a fact about it, not a detail, so it stays: a
 * yielded value is struck through and says what it gave way to, an unmet one
 * says it cannot be built with the rest.
 */
export function AssertedPair({
  variable,
  open,
  onToggle,
}: {
  variable: Variable;
  open: boolean;
  onToggle: () => void;
}) {
  const { label } = useConfigurator();
  const unmet = variable.standing === "unmet";
  const yielded = variable.standing === "yielded";
  const isTarget = useTargeted(address.variable(variable.name));
  return (
    <div
      id={address.variable(variable.name)}
      className={cn(
        "group/pair flex flex-wrap items-baseline gap-x-2 text-sm",
        addressable,
        isTarget && targetedRing,
      )}
    >
      <span className="text-muted-foreground">
        {variable.heading}
      </span>
      <ByMark variable={variable} />
      <Button
        variant="ghost"
        size="xs"
        data-control="answer"
        aria-expanded={open}
        onClick={onToggle}
        className="-mx-1 h-auto px-1 py-0.5 text-left text-sm font-medium whitespace-normal"
      >
        <span className={cn(yielded && "text-muted-foreground line-through")}>
          {label(variable.asked)}
        </span>
        <span className="sr-only">
          {yielded ? " (gave way)" : ""}, {variable.heading}: {open ? "hide" : "show"} how it
          came to be and the other options
        </span>
        <ChevronDownIcon
          aria-hidden
          className={cn(
            "text-muted-foreground opacity-0 transition group-hover/pair:opacity-100 group-focus-visible/button:opacity-100",
            open && "rotate-180 opacity-100",
          )}
        />
      </Button>
      {unmet ? (
        <span className="text-xs text-muted-foreground">not buildable with the rest</span>
      ) : null}
      {yielded ? (
        <span className="text-xs text-muted-foreground">
          gave way
          {variable.value ? (
            <>
              {" "}
              to <span className="text-foreground">{label(variable.value)}</span>
            </>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

export function AssertedDetails({
  variable,
  under,
  sourced = false,
}: {
  variable: Variable;
  /** The ledger line it is drawn on: the clause, or null for a value
   * answering none. That clause is the line's own, so only the others are
   * named. */
  under: string | null;
  /** Whether the line's clause names the source it was read from. */
  sourced?: boolean;
}) {
  const { gesture, label } = useConfigurator();
  const shown = useShown();
  const unmet = variable.standing === "unmet";
  const yielded = variable.standing === "yielded";
  const held = new Set(variable.held);
  const others = variable.answers.filter((a) => a.clause !== under);
  return (
    <div className="space-y-1.5 text-xs text-muted-foreground">
      {/* Only the assistant's part is said here: what it read and from which
          words is what the person checks and corrects. A value the person or
          their agent chose has the mark beside it, and the log says the
          rest; said here, it would sit against the hold below as two
          claims of ownership. On a line whose clause was read from a source,
          the line already says where; the read side's sentence for that
          case, *read this in …*, would say it again. */}
      {shown("how") &&
      variable.by === "model" &&
      variable.how &&
      !(sourced && / read this (in|from) /.test(variable.how)) ? (
        <p>{variable.how[0].toUpperCase() + variable.how.slice(1)}</p>
      ) : null}
      {/* A clause the person stated holds the value for a reason, so the
          assistant cannot change it. Said here, in words, for this line and
          for the others it answers; the hold is said even with the
          `answers` facet hidden, since it is about this value. */}
      {under !== null && held.has(under) ? (
        <p>Yours: the assistant cannot change it.</p>
      ) : null}
      <GivenLine variable={variable} />
      {others.length && shown("answers") ? (
        <ul className="space-y-0.5">
          {others.map((answer) => (
            <li key={answer.clause}>
              {held.has(answer.clause) ? "Also held for " : "Also answers "}
              <To id={address.clause(answer.clause)} title="The clause, in the requirement ledger">
                <ClauseText text={answer.text} />
              </To>
            </li>
          ))}
        </ul>
      ) : others.some((a) => held.has(a.clause)) ? (
        <p>Yours: the assistant cannot change it.</p>
      ) : null}
      {variable.softly ? <p>Negotiable: it reached the rules as a preference.</p> : null}
      {unmet ? (
        <div className="space-y-1">
          <p className="text-foreground">On record, and not buildable alongside the rest.</p>
          {/* The rules that refused it, kept by `Constraining.refused` rather
              than only carried in the question — so the account survives the
              banner being dismissed. */}
          <Rules rules={variable.refused} />
        </div>
      ) : null}
      {yielded && shown("rules") ? (
        <>
          {/* A preference the rules could not honour. By the person's own
              account this was the thing to give up, so no question is asked
              and nothing is refused; the read is `settled` beside `inclined`. */}
          <Rules rules={variable.owing} />
          {variable.following.length ? (
            <p>from {variable.following.map((f) => f.heading).join(", ")}</p>
          ) : null}
        </>
      ) : null}
      <Options variable={variable} />
      <Button
        variant="ghost"
        size="xs"
        className="-ml-2 text-muted-foreground"
        onClick={() => void gesture({ act: "withdraw", variable: variable.name })}
      >
        <XIcon />
        Take back
        <span className="sr-only">
          {" "}
          {variable.heading}: {label(variable.asked)}
        </span>
      </Button>
    </div>
  );
}

/**
 * A value that follows, beneath the assertion it rests on: heading and value,
 * muted, so the line says what followed without opening. Addressed where it
 * is first drawn. The rule behind it is a detail of the open line.
 */
export function FollowsPair({
  variable,
  addressed = true,
}: {
  variable: Variable;
  addressed?: boolean;
}) {
  const { label } = useConfigurator();
  const isTarget = useTargeted(address.variable(variable.name));
  return (
    <li
      id={addressed ? address.variable(variable.name) : undefined}
      className={cn(
        "flex flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground",
        addressable,
        addressed && isTarget && targetedRing,
      )}
    >
      <span aria-hidden>↳</span>
      <span className="sr-only">forced: </span>
      <span>
        {variable.heading}
      </span>
      <span className="text-foreground">{label(variable.value)}</span>
    </li>
  );
}

/**
 * A variable nobody chose, whose value the rules leave no room to argue with,
 * on its own row. The row says what it follows from, each a link to the
 * assertion's row, so the kind of fact reads without opening anything; the
 * rule's own sentence is a facet (`rules`).
 */
export function FollowsRow({ variable }: { variable: Variable }) {
  const { label } = useConfigurator();
  const shown = useShown();
  const isTarget = useTargeted(address.variable(variable.name));
  return (
    <Item
      id={address.variable(variable.name)}
      size="xs"
      variant="muted"
      // Set into the panel's ground, on a line of its own. The
      // variant's own half-strength muted all but vanishes on that ground.
      className={cn("items-start bg-sunken", addressable, isTarget && targetedRing)}
    >
      <ItemContent className="gap-1">
        {/* Not `ItemTitle`: it clamps to one line, and undoing the clamp
            with `line-clamp-none` sets `display: block`, which drops the gap
            between heading and value. A value has to be free to wrap. */}
        <div className="flex flex-wrap items-baseline gap-x-2 text-xs font-medium">
          <span className="font-normal uppercase tracking-wide text-muted-foreground">
            {variable.heading}
          </span>
          <span className="text-sm">{label(variable.value)}</span>
          <span className="font-normal text-muted-foreground">
            follows
            {variable.following.length ? (
              <>
                {" from "}
                {variable.following.map((f, i) => (
                  <span key={f.variable}>
                    {i ? ", " : ""}
                    <To id={address.variable(f.variable)}>{f.heading}</To>
                  </span>
                ))}
              </>
            ) : (
              " from the rules alone"
            )}
          </span>
        </div>
        {shown("rules") ? <Rules rules={variable.owing} /> : null}
      </ItemContent>
    </Item>
  );
}

/** Which open rows the person has folded away. A row stands open: what is
 * open is a question, and its options are the way to answer it, so they are
 * shown until the person puts them away, one row or all at once. Folded is
 * what is kept, so a variable newly open arrives unfolded. */
const Folding = createContext<{
  folded: ReadonlySet<string>;
  fold: (names: string[], folded: boolean) => void;
}>({ folded: new Set(), fold: () => {} });

export function FoldingProvider({ children }: { children: ReactNode }) {
  const [folded, setFolded] = useState<ReadonlySet<string>>(new Set());
  const fold = useCallback((names: string[], to: boolean) => {
    setFolded((prev) => {
      const next = new Set(prev);
      for (const name of names) {
        if (to) next.add(name);
        else next.delete(name);
      }
      return next;
    });
  }, []);
  const value = useMemo(() => ({ folded, fold }), [folded, fold]);
  return <Folding.Provider value={value}>{children}</Folding.Provider>;
}

/** Folds or unfolds every open row in view at once: collapse while any of
 * them stands open, expand once all are folded. */
export function FoldAll({ open }: { open: Variable[] }) {
  const { folded, fold } = useContext(Folding);
  if (!open.length) return null;
  const names = open.map((v) => v.name);
  const anyOpen = names.some((name) => !folded.has(name));
  return (
    <Button
      variant="ghost"
      size="xs"
      className="text-muted-foreground"
      onClick={() => fold(names, anyOpen)}
    >
      {anyOpen ? <ChevronsDownUpIcon /> : <ChevronsUpDownIcon />}
      {anyOpen ? "Collapse all" : "Expand all"}
    </Button>
  );
}

/** A variable still open, with what the rules have left of its range behind
 * the heading, and what the assistant proposed for it, if anything. The proposal is a
 * `Deciding` request of its own: taking it is `choose`, and it becomes the
 * person's assertion; *not this one* is `decline`, and the whole then adopts
 * the rest. Neither is a pick from the options, which would be the person's
 * own value and read that way. */
export function OpenRow({ variable }: { variable: Variable }) {
  const { gesture } = useConfigurator();
  const proposed = variable.proposed;
  const id = address.variable(variable.name);
  const { folded, fold } = useContext(Folding);
  const open = !folded.has(variable.name);
  const setOpen = (next: boolean) => fold([variable.name], !next);
  // Addressed from elsewhere — a clause's answer line, a link in the chat —
  // the row opens, since what was wanted is the choice, not the heading.
  const targeted = useTargeted(id);
  useEffect(() => {
    if (targeted) fold([variable.name], false);
  }, [targeted, fold, variable.name]);

  return (
    <Collapsible
      id={id}
      open={open}
      onOpenChange={setOpen}
      className={cn("group/row border-t first:border-t-0", addressable, targeted && targetedRing)}
    >
      {/* The ghost button fills itself while expanded; with every row open
          by default that striped the list. A question is held apart by the
          rule above it and the space around it instead, and its heading
          set heavier than the options under it. */}
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="-mx-3 h-auto w-[calc(100%+1.5rem)] justify-between gap-2 px-3 pt-4 pb-2 text-left text-sm font-medium group-data-[state=closed]/row:pb-4 aria-expanded:bg-transparent hover:aria-expanded:bg-muted"
        >
          <span>{variable.heading}</span>
          <span className="ml-auto flex shrink-0 items-center gap-2">
            <ChevronDownIcon className="text-muted-foreground transition-transform group-data-[state=open]/button:rotate-180" />
          </span>
        </Button>
      </CollapsibleTrigger>
      {proposed ? (
        <div className="flex flex-wrap items-center gap-2 pb-2 text-xs">
          <span className="text-muted-foreground">
            <SparklesIcon className="mr-1 inline size-3 align-[-2px]" />
            proposed: <span className="text-foreground">{proposed.label}</span>
          </span>
          <Button
            variant="outline"
            size="xs"
            onClick={() =>
              void gesture({
                act: "choose",
                request: proposed.request,
                option: { variable: variable.name, option: proposed.option },
              })
            }
          >
            Take it
            <span className="sr-only"> for {variable.heading}</span>
          </Button>
          <Button
            variant="ghost"
            size="xs"
            className="text-muted-foreground"
            onClick={() =>
              void gesture({ act: "decline", request: proposed.request })
            }
          >
            Not this one
            <span className="sr-only"> for {variable.heading}</span>
          </Button>
          {proposed.foreseen ? (
            <div className="basis-full">
              <Consequences foreseen={proposed.foreseen} />
            </div>
          ) : null}
        </div>
      ) : null}
      <CollapsibleContent className="pb-5">
        <Options variable={variable} />
      </CollapsibleContent>
    </Collapsible>
  );
}
