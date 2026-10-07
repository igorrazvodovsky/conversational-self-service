"use client";

import { BellIcon, ChevronDownIcon, ListFilterIcon, ScrollTextIcon, UsersIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { address, addressable, Said, targeted, To, useHash, useTargeted } from "./address";
import { useConfigurator, type Turn } from "./provider";

const ago = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

/** How long ago, in the largest unit that is at least one. */
function since(at: number) {
  const seconds = Math.round(at - Date.now() / 1000);
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, size] of steps)
    if (Math.abs(seconds) >= size) return ago.format(Math.round(seconds / size), unit);
  return "just now";
}

/** The side of the sale a party acts for. */
const SIDE: Record<string, string> = { buyer: "Buyer's side", seller: "Seller's side" };

/** What the sheet opens on: everyone else's changes to the specification,
 * which is the notification center. Who is hidden rather than who is shown,
 * so a party that joins later is shown without anyone choosing it. */
const NOTICES = { hidden: ["person"], kinds: ["specification"] };

const STORED = "log:filter";

/** What is chosen, kept in this browser only: a viewer's convenience, so a
 * storage that throws or comes back empty leaves the notification center. */
function useFilter() {
  const [filter, setFilter] = useState(NOTICES);
  useEffect(() => {
    try {
      const kept = JSON.parse(localStorage.getItem(STORED) ?? "null");
      if (Array.isArray(kept?.hidden) && Array.isArray(kept?.kinds) && kept.kinds.length)
        setFilter(kept);
    } catch {}
  }, []);
  const choose = (next: typeof NOTICES) => {
    setFilter(next);
    try {
      localStorage.setItem(STORED, JSON.stringify(next));
    } catch {}
  };
  return [filter, choose] as const;
}

const shows = (turn: Turn, hidden: string[], kinds: string[]) =>
  turn.parties.some((p) => !hidden.includes(p)) && turn.kinds.some((k) => kinds.includes(k));

/** A turn by someone else that changed the specification since the person
 * last did. */
export const isNotice = (turn: Turn) =>
  turn.fresh &&
  turn.kinds.includes("specification") &&
  turn.parties.some((p) => p !== "person");

/** Who took a turn, as the notification center names them. */
export const byOf = (turn: Turn) =>
  turn.parties.includes("browser") ? "your agent" : "the assistant";

/** A party's name, from the read, for an actor it may not list. */
function useWho() {
  const { view } = useConfigurator();
  return (actor: string) => view?.parties.find((p) => p.actor === actor)?.label ?? actor;
}

/** Names in a sentence: the first as it is, the rest in lower case. */
function listed(names: string[]) {
  const all = names.map((n, i) => (i ? n.charAt(0).toLowerCase() + n.slice(1) : n));
  return all.length > 1 ? `${all.slice(0, -1).join(", ")} and ${all.at(-1)}` : all.join("");
}

/**
 * The log, read by turn, behind a bell in the panel's header: what each
 * turn changed, and on whose authority (`docs/ui.md`, "What a view is").
 * Each entry is one turn: who took part and when, the words or documents it
 * read, what it stated, answered, reworded, struck or withdrew, and beneath
 * that every record it wrote with the rule that authorised it — MSM
 * §5.2.3's accountability property, rendered rather than described.
 *
 * Who took part and what the turn did are filters over the one list, each
 * a menu, and it opens on everyone else's changes to the specification, the
 * notification center. The bell counts those since the person last changed
 * the specification themselves, whatever is chosen; nothing records that
 * the sheet was opened, so the count goes when they next act, not when they
 * look.
 */
export function Log() {
  const { view } = useConfigurator();
  const hash = useHash();
  const [open, setOpen] = useState(false);
  const [filter, choose] = useFilter();
  const turns = view?.turns ?? [];
  const addressed = hash.startsWith("turn:")
    ? turns.find((t) => address.turn(t.flow) === hash)
    : undefined;

  // An address opens the sheet, and chooses what shows the turn.
  useEffect(() => {
    if (!addressed) return;
    setOpen(true);
    if (!shows(addressed, filter.hidden, filter.kinds))
      choose({
        hidden: filter.hidden.filter((p) => !addressed.parties.includes(p)),
        kinds: [...new Set([...filter.kinds, ...addressed.kinds])],
      });
    // Only when the address changes, not when the filter does.
  }, [addressed?.flow]);

  if (!view) return null;
  const fresh = turns.filter(isNotice).length;
  const parties = view.parties;
  const visible = parties.filter((p) => !filter.hidden.includes(p.actor));
  const shown = turns.filter((t) => shows(t, filter.hidden, filter.kinds));
  // Each menu's counts are over what the other one leaves.
  const byParty = (actor: string) =>
    turns.filter((t) => t.parties.includes(actor) && shows(t, [], filter.kinds)).length;
  const byKind = (kind: string) =>
    turns.filter((t) => t.kinds.includes(kind) && shows(t, filter.hidden, [kind])).length;

  const sides = [...new Set(parties.map((p) => p.side))];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          className="text-muted-foreground"
          aria-label={fresh ? `Notifications, ${fresh} new` : "Notifications"}
          title="What each turn changed, and on whose authority"
        >
          <BellIcon />
          {fresh ? <Badge variant="ghost" className="h-auto p-0 tabular-nums hover:bg-transparent">{fresh}</Badge> : null}
        </Button>
      </SheetTrigger>
      <SheetContent
        className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md"
        // Following a link takes focus to the item; closing must not take it
        // back to the bell.
        onCloseAutoFocus={(event) => event.preventDefault()}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) setOpen(false);
        }}
      >
        <SheetHeader className="border-b">
          <SheetTitle>Activity log</SheetTitle>
          <div className="-ml-2 mt-2 flex flex-wrap items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="xs" className="text-muted-foreground">
                  <UsersIcon />
                  People
                  <ChevronDownIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {sides.map((side, i) => (
                  <DropdownMenuGroup key={side ?? "other"}>
                    {i ? <DropdownMenuSeparator /> : null}
                    {sides.length > 1 ? (
                      <DropdownMenuLabel>{side ? SIDE[side] : "Others"}</DropdownMenuLabel>
                    ) : null}
                    {parties
                      .filter((p) => p.side === side)
                      .map((p) => {
                        const on = !filter.hidden.includes(p.actor);
                        return (
                          <Choice
                            key={p.actor}
                            checked={on}
                            // One party is always shown: a list filtered to
                            // nobody could not be told from an empty log.
                            last={on && visible.length === 1}
                            count={byParty(p.actor)}
                            onChange={(checked) =>
                              choose({
                                ...filter,
                                hidden: checked
                                  ? filter.hidden.filter((a) => a !== p.actor)
                                  : [...filter.hidden, p.actor],
                              })
                            }
                          >
                            {p.label}
                          </Choice>
                        );
                      })}
                  </DropdownMenuGroup>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="xs" className="text-muted-foreground">
                  <ListFilterIcon />
                  Event types
                  <ChevronDownIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {view.kinds.map(({ kind, label }) => {
                  const on = filter.kinds.includes(kind);
                  return (
                    <Choice
                      key={kind}
                      checked={on}
                      last={on && filter.kinds.length === 1}
                      count={byKind(kind)}
                      onChange={(checked) =>
                        choose({
                          ...filter,
                          kinds: checked
                            ? [...filter.kinds, kind]
                            : filter.kinds.filter((k) => k !== kind),
                        })
                      }
                    >
                      {label}
                    </Choice>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4">
          {shown.length ? (
            <ol className="relative flex flex-col gap-4 before:absolute before:inset-y-1 before:left-1 before:w-px before:bg-border">
              {runs(shown).map((run, i, all) => {
                const first = run[0];
                // Freshness runs newest first, so the rule goes once, above
                // the first turn the person has seen.
                const divides =
                  i > 0 && i === all.findIndex((r) => !r[0].fresh) && all[0][0].fresh;
                // Who and when are said again below the rule.
                const after = i && !divides ? all[i - 1][0] : undefined;
                return (
                  <li key={first.flow} className="flex flex-col gap-4">
                    {divides ? (
                      <div className="relative flex items-center gap-2 bg-background text-muted-foreground">
                        <Separator className="flex-1" />
                        Before you last changed it
                        <Separator className="flex-1" />
                      </div>
                    ) : null}
                    <div className="relative pl-5">
                      <Mark actor={first.actor} />
                      <Head turn={first} after={after} />
                      {run.length === 1 ? <Entry turn={first} /> : <Run turns={run} hash={hash} />}
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-muted-foreground">
              {turns.length ? "No turn matches what is chosen." : "Nothing has happened yet."}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** One choice in a filter's menu, with its count. The menu stays open, as
 * a person choosing a view sets several; the last one checked stays. */
function Choice({
  checked,
  last,
  count,
  onChange,
  children,
}: {
  checked: boolean;
  last: boolean;
  count: number;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenuCheckboxItem
      checked={checked}
      disabled={last}
      onSelect={(event) => event.preventDefault()}
      onCheckedChange={onChange}
    >
      <span className="flex-1">{children}</span>
      <span className="tabular-nums text-muted-foreground">{count}</span>
    </DropdownMenuCheckboxItem>
  );
}

/** What a turn folds into a run with: surfaces brought forward, or values
 * answered and withdrawn by gesture with no words behind them. */
function foldOf(turn: Turn) {
  if (turn.moved) return "moved";
  const bare =
    !turn.said &&
    !turn.files.length &&
    !turn.stated.length &&
    !turn.reworded.length &&
    !turn.struck.length;
  return bare && (turn.asserted.length || turn.withdrawn.length) ? "values" : null;
}

/** The turns, with each run of one fold by the same parties, on one side
 * of the rule, kept together. */
function runs(turns: Turn[]): Turn[][] {
  const out: Turn[][] = [];
  for (const turn of turns) {
    const run = out.at(-1);
    const last = run?.[0];
    const fold = foldOf(turn);
    if (
      run &&
      last &&
      fold &&
      fold === foldOf(last) &&
      turn.fresh === last.fresh &&
      turn.parties.join() === last.parties.join()
    )
      run.push(turn);
    else out.push([turn]);
  }
  return out;
}

/** A turn's mark on the rail: filled for the seller's side, a ring for the
 * buyer's, as the actor's badge is. */
function Mark({ actor }: { actor: string }) {
  const { view } = useConfigurator();
  const seller = view?.parties.find((p) => p.actor === actor)?.side === "seller";
  return (
    <span
      aria-hidden
      className={cn(
        "absolute top-1.5 left-0 size-[9px] border border-foreground",
        seller ? "bg-foreground" : "bg-background",
      )}
    />
  );
}

/** Who took part and when, shown where either differs from the turn above
 * and otherwise said only to a screen reader, which has no rail to follow. */
function Head({ turn, after }: { turn: Turn; after?: Turn }) {
  const name = useWho();
  const who = turn.parties.join() !== after?.parties.join();
  const when = !after || since(turn.at) !== since(after.at);
  const at = new Date(turn.at * 1000);
  return (
    <p className={cn("mb-1.5 text-muted-foreground", !who && !when && "sr-only")}>
      <span
        className={cn(
          isNotice(turn) && "font-medium text-foreground",
          who || "sr-only",
        )}
      >
        {listed(turn.parties.map(name))}
      </span>
      <span className={who && when ? undefined : "sr-only"}> · </span>
      <time
        dateTime={at.toISOString()}
        title={at.toLocaleString()}
        className={when ? undefined : "sr-only"}
      >
        {since(turn.at)}
      </time>
    </p>
  );
}

/** A run of turns folded into one line that says what they did, opened to
 * show them, and opened by itself when one of them is addressed. */
function Run({ turns, hash }: { turns: Turn[]; hash: string }) {
  const [open, setOpen] = useState(false);
  const addressed = turns.some((t) => hash === address.turn(t.flow));
  useEffect(() => {
    if (addressed) setOpen(true);
  }, [addressed]);
  const answered = turns.reduce((n, t) => n + t.asserted.length, 0);
  const withdrew = turns.reduce((n, t) => n + t.withdrawn.length, 0);
  const values = (n: number) => (n === 1 ? "one value" : `${n} values`);
  const what = turns[0].moved
    ? `Switched surface ${turns.length === 1 ? "once" : `${turns.length} times`}`
    : [
        answered ? `answered ${values(answered)}` : "",
        withdrew ? `withdrew ${values(withdrew)}` : "",
      ]
        .filter(Boolean)
        .join(" and ")
        .replace(/^./, (c) => c.toUpperCase());
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="xs" className="-ml-2">
          <ChevronDownIcon className="text-muted-foreground transition-transform group-data-[state=open]/button:rotate-180" />
          {what}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ol className="mt-2 flex flex-col gap-3">
          {turns.map((turn, i) => (
            <li key={turn.flow}>
              <Head turn={turn} after={turns[i - 1] ?? turn} />
              <Entry turn={turn} />
            </li>
          ))}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** One turn: the words or documents that opened it, what it changed or
 * else what the gesture was, and the records it wrote. */
function Entry({ turn }: { turn: Turn }) {
  const { view, label } = useConfigurator();
  const id = address.turn(turn.flow);
  const isTarget = useTargeted(id);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (isTarget) setOpen(true);
  }, [isTarget]);
  const heading = (name: string) =>
    view?.variables.find((v) => v.name === name)?.heading ?? name;
  const present = (clause: string) => !!view?.clauses.some((c) => c.clause === clause);
  const clause = ({ clause: id, text }: { clause: string; text: string }) =>
    present(id) ? <To id={address.clause(id)}>{text}</To> : text;
  const rows: [string, React.ReactNode[]][] = [
    ["Stated", turn.stated.map(clause)],
    ["Reworded", turn.reworded.map(clause)],
    ["Struck", turn.struck.map((c) => <s key={c.clause}>{c.text}</s>)],
    [
      "Answered",
      turn.asserted.map((a) => (
        <To key={a.variable} id={address.variable(a.variable)}>
          {heading(a.variable)}: {label(a.option)}
        </To>
      )),
    ],
    [
      "Withdrew",
      turn.withdrawn.map((v) => (
        <To key={v} id={address.variable(v)}>
          {heading(v)}
        </To>
      )),
    ],
  ];
  const name = useWho();
  const opener = name(turn.actor);
  const refused = turn.records.filter((r) => r.refused).length;
  const changed = rows.some(([, items]) => items.length);
  return (
    <article
      id={id}
      className={cn(
        "group/turn relative flex flex-col gap-1.5 pr-7",
        addressable,
        isTarget && targeted,
      )}
    >
      {turn.said ? (
        <p className="line-clamp-2" title={turn.said.text}>
          {opener} said <Said utterance={turn.said.utterance} text={turn.said.text} />
        </p>
      ) : null}
      {turn.files.length ? <p>Read {turn.files.join(", ")}</p> : null}
      {!turn.said && !turn.files.length && !changed ? <p>{turn.did}</p> : null}
      {changed ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          {rows
            .filter(([, items]) => items.length)
            .map(([verb, items]) => (
              <div key={verb} className="contents">
                <dt className="text-muted-foreground">{verb}</dt>
                <dd>
                  <ul className="flex flex-col gap-0.5">
                    {items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            ))}
        </dl>
      ) : null}
      {/* Contents, so the trigger sits on the turn and a closed record takes no room. */}
      <Collapsible open={open} onOpenChange={setOpen} className="contents">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size={refused ? "xs" : "icon-xs"}
            className={cn(
              "text-muted-foreground",
              // A refusal is said in the turn's own flow. Otherwise the trigger
              // sits at the turn's corner, shown while the turn is pointed at
              // or holds focus, while open, and always where nothing points.
              refused ? "-ml-2 self-start" : "absolute top-0 right-0",
              !open &&
                !refused &&
                "pointer-fine:opacity-0 pointer-fine:group-hover/turn:opacity-100 pointer-fine:group-focus-within/turn:opacity-100",
            )}
            aria-label={`On whose authority${refused ? `, ${refused} refused` : ""}`}
            title="On whose authority"
          >
            <ScrollTextIcon />
            {refused ? `${refused} refused` : null}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ol className="mt-1 space-y-1">
            {turn.records.map((record) => (
              <li key={record.seq} className="flex flex-wrap items-baseline gap-x-2">
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
        </CollapsibleContent>
      </Collapsible>
    </article>
  );
}
