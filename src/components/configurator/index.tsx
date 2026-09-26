"use client";

import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { ItemGroup } from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useConfigurator, type Variable } from "./provider";
import { Button } from "@/components/ui/button";
import { address, To } from "./address";
import { ClauseText } from "./clauses";
import { PendingQuestions } from "./question";
import { ShowingMenu } from "./showing";
import { Totals } from "./totals";
import { Trace } from "./trace";
import { AskedCard, FollowsRow, OpenRow } from "./variables";

function Section({
  id,
  title,
  hint,
  count,
  children,
}: {
  id: string;
  title: string;
  hint: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-6 scroll-mt-28">
      <header className="mb-2 flex items-baseline gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground">
          {count} · {hint}
        </span>
      </header>
      {count ? (
        children
      ) : (
        <Empty className="border p-4">
          <EmptyDescription>Nothing yet.</EmptyDescription>
        </Empty>
      )}
    </section>
  );
}

/**
 * What the canvas is narrowed to, and the way out. Shown only while a frame
 * is on; the counts are of the slice, so the three sections still read as
 * three kinds of fact inside it. A frame on a clause is also the answering
 * mode, and the strip says so.
 */
function FrameBanner() {
  const { view, gesture, busy, label } = useConfigurator();
  if (!view?.frame) return null;
  const { frame } = view;
  const inside = view.variables.filter((v) => v.framed);
  const count = (standing: string) =>
    inside.filter((v) => v.standing === standing).length;
  const unmet = count("unmet");
  const yielded = count("yielded");
  const asked = count("asked") + yielded + unmet;
  return (
    <div className="flex flex-wrap items-center gap-2 border bg-muted/40 px-3 py-1.5 text-xs">
      {frame.by === "assertion" ? (
        <>
          <span>
            <span className="text-muted-foreground">What followed from </span>
            <To id={address.variable(frame.variable)} className="font-medium uppercase tracking-wide">
              {frame.heading}
            </To>
            {frame.asked ? (
              <>
                <span className="text-muted-foreground">: </span>
                <span className="font-medium">{label(frame.asked)}</span>
              </>
            ) : null}
          </span>
          <span className="text-muted-foreground">
            · {count("follows")} follow · {count("open")} narrowed
            {yielded ? ` · ${yielded} gave way` : ""}
            {unmet ? ` · ${unmet} unmet` : ""}
          </span>
        </>
      ) : (
        <>
          <span className="min-w-0">
            <span className="text-muted-foreground">About </span>
            <To id={address.clause(frame.clause)} className="font-medium">
              “<ClauseText text={frame.text} />”
            </To>
          </span>
          <span className="text-muted-foreground">
            · answered by {asked} · {count("follows")} followed · {count("open")} still open
            could answer it · a value picked now does
          </span>
        </>
      )}
      <Button
        variant="ghost"
        size="xs"
        className="ml-auto"
        disabled={busy}
        onClick={() => void gesture({ act: "unframe" })}
      >
        Show everything
      </Button>
    </div>
  );
}

/**
 * The way around the configuration: one line, kept at the top of its
 * column's scroll, naming each section with its count and linking to it.
 * Under it, the frame the canvas is in, if any, so a mode begun anywhere is
 * visible, and its way out reachable, from anywhere.
 */
function Header({
  asserted,
  follows,
  open,
}: {
  asserted: number;
  follows: number;
  open: number;
}) {
  const { view } = useConfigurator();
  if (!view) return null;
  const places: { id: string; title: string; count: number }[] = [
    // The ledger is the other surface; its link brings it forward.
    { id: "required", title: "Required", count: view.clauses.length },
    ...(view.questions.length
      ? [{ id: "questions", title: "Asked of you", count: view.questions.length }]
      : []),
    { id: "asserted", title: "Asserted", count: asserted },
    { id: "follows", title: "Follows", count: follows },
    { id: "open", title: "Open", count: open },
  ];
  const touched = view.touched;
  const moved = touched ? touched.variables.length + touched.clauses.length : 0;
  return (
    <div className="sticky top-0 z-10 -mx-6 space-y-2 border-b bg-background/95 px-6 py-2 backdrop-blur">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <nav aria-label="Sections" className="flex flex-wrap gap-x-3 text-xs">
          {places.map((place) => (
            <a
              key={place.id}
              href={`#${place.id}`}
              className="text-muted-foreground hover:text-foreground"
            >
              {place.title}{" "}
              <span className="tabular-nums text-foreground">{place.count}</span>
            </a>
          ))}
        </nav>
        {moved ? (
          <span className="text-xs text-muted-foreground">
            <span className="mr-1.5 inline-block size-1.5 bg-primary align-middle" />
            {touched!.by} moved {moved} since you last acted
          </span>
        ) : null}
        <div className="ml-auto">
          <ShowingMenu />
        </div>
      </div>
      <FrameBanner />
    </div>
  );
}

/** The step off the canvas: request a quote, or go and look at the ones issued. */
function QuoteCall() {
  const { view, gesture, busy } = useConfigurator();
  if (!view) return null;
  const count = view.quotes.length;
  return (
    <section className="mt-6 flex flex-wrap items-center gap-2 border-t pt-4">
      <span className="text-xs text-muted-foreground">
        {view.quotable.ok
          ? "Everything is settled and priced."
          : `A quote needs everything settled — ${view.quotable.because}.`}
      </span>
      <div className="ml-auto flex gap-2">
        {count ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => void gesture({ act: "focus", surface: "quote" })}
          >
            {count === 1 ? "1 quote issued" : `${count} quotes issued`}
          </Button>
        ) : null}
        <Button
          size="sm"
          variant={view.quotable.ok ? "default" : "outline"}
          disabled={busy || !view.quotable.ok}
          title={
            view.quotable.ok
              ? "Freeze the values and the price as they stand, for thirty days"
              : `Not yet: ${view.quotable.because}`
          }
          onClick={() => void gesture({ act: "quote" })}
        >
          Request a quote
        </Button>
      </div>
    </section>
  );
}

/** The open variables, by the catalogue's family, in the catalogue's order. */
function byFamily(open: Variable[]): [string, Variable[]][] {
  const groups = new Map<string, Variable[]>();
  for (const v of open) {
    const rows = groups.get(v.family);
    if (rows) rows.push(v);
    else groups.set(v.family, [v]);
  }
  return [...groups.entries()];
}

const family = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

/**
 * The configuration: what is the case.
 *
 * The three sections are the design's whole claim made visible: what a party
 * asserted, what follows from it, and what is still open are three different
 * kinds of fact, and a configurator that keeps them in one field cannot show
 * you this. The grouping is a property of the current state — it changes on
 * every action and cuts across the catalogue's own families.
 *
 * What the person requires, in their words, is the other surface
 * (`requirements.tsx`). The two are projections of one relation — a clause
 * and the value that answers it — and they are linked item by item rather
 * than laid side by side, since neither reads well at half the panel's
 * width: a card's `for:` line goes to the clause, a clause's answer line
 * comes here, and a clause framed there narrows this surface to what
 * concerns it (`Framing`), where a value picked answers it.
 */
export function ConfiguratorCanvas() {
  const { view, error } = useConfigurator();

  // A read that failed says nothing about the state; what was last read
  // stays up until one succeeds.
  if (error && !view) {
    return (
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyDescription className="max-w-sm">{error}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  if (!view) {
    return (
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyMedia>
            <Spinner />
          </EmptyMedia>
          <EmptyDescription>Reading the catalogue…</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  // A frame narrows every section to the items that bear on one question
  // and leaves the sections themselves alone — `Framing`. With no frame,
  // `framed` is true of everything.
  const framed = view.variables.filter((v) => v.framed);
  // A yielded value is asserted: it sits with what was asked for, not with
  // what followed, because nothing about the person's requirement changed.
  const asked = framed.filter(
    (v) =>
      v.standing === "asked" ||
      v.standing === "yielded" ||
      v.standing === "unmet",
  );
  const follows = framed.filter((v) => v.standing === "follows");
  const open = framed.filter((v) => v.standing === "open");
  const families = byFamily(open);

  return (
    <div className="@container h-full bg-background">
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 pb-6">
          <Header asserted={asked.length} follows={follows.length} open={open.length} />

          <div className="mt-4">
            <Totals />
          </div>

          <div id="questions" className="mt-4 scroll-mt-28">
            <PendingQuestions />
          </div>

          <Section
            id="asserted"
            title="Asserted"
            hint={`put there by a party, and revisable${
              view.counts.unbound ? ` · ${view.counts.unbound} answering nothing` : ""
            }`}
            count={asked.length}
          >
            <div className="grid gap-2 @2xl:grid-cols-2">
              {asked.map((variable) => (
                <AskedCard key={variable.name} variable={variable} />
              ))}
            </div>
          </Section>

          <Section
            id="follows"
            title="Follows from that"
            hint="nobody chose these"
            count={follows.length}
          >
            <ItemGroup className="gap-1">
              {follows.map((variable) => (
                <FollowsRow key={variable.name} variable={variable} />
              ))}
            </ItemGroup>
          </Section>

          {/* Grouped by the catalogue's family, so the scan a person brings
              here — what kind of thing is left — has an answer. The grouping
              is the catalogue's, not the state's, which is why it is only
              inside this section and not across the three. */}
          <Section
            id="open"
            title="Still open"
            hint={view.frame?.by === "clause" ? "a pick here answers the clause" : "yours to settle"}
            count={open.length}
          >
            <Card className="gap-0 py-0">
              {families.map(([name, rows], i) => (
                <div key={name}>
                  {families.length > 1 ? (
                    <div
                      className={cn(
                        "flex items-baseline gap-2 border-b bg-muted/40 px-3 py-1 text-xs",
                        i > 0 && "border-t",
                      )}
                    >
                      <span className="uppercase tracking-wide text-muted-foreground">
                        {family(name)}
                      </span>
                      <span className="text-muted-foreground">{rows.length}</span>
                    </div>
                  ) : null}
                  {rows.map((variable) => (
                    <OpenRow key={variable.name} variable={variable} />
                  ))}
                </div>
              ))}
            </Card>
          </Section>

          {/* The end of a configuration is an offer, and the offer is a
              surface of its own. The canvas only says whether one can be
              requested yet, and how many there are. */}
          <QuoteCall />

          <Trace />

          <p className="mt-6 text-xs/relaxed text-muted-foreground">
            {view.footprint.scope}
          </p>
        </div>
      </div>
    </div>
  );
}
