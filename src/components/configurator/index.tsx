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
import { useConfigurator, type Variable, type View } from "./provider";
import { Button } from "@/components/ui/button";
import { address, To } from "./address";
import { ClauseText } from "./clauses";
import { PendingQuestions, waiting } from "./question";
import { Standing } from "./standing";
import { Trace } from "./trace";
import { ledger, Ledger } from "./ledger";
import { FollowsRow, OpenRow } from "./variables";

function Section({
  id,
  title,
  hint,
  count,
  empty = !count,
  children,
}: {
  id: string;
  title: string;
  hint: string;
  count: number;
  /** Whether there is nothing to draw; by default, a count of nothing. */
  empty?: boolean;
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
      {!empty ? (
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
 * The strip kept at the top of the configuration's scroll: what moved since
 * the person last acted, and the frame, if any, so a mode begun anywhere is
 * visible, and its way out reachable, from anywhere. Shown only while there
 * is one or the other. The way to each section, and which facts the canvas
 * shows, are in the panel's own header (`example-layout/panel-nav.tsx`).
 */
function Header() {
  const { view } = useConfigurator();
  if (!view) return null;
  const touched = view.touched;
  const moved = touched ? touched.variables.length + touched.clauses.length : 0;
  if (!moved && !view.frame) return null;
  return (
    <div className="sticky top-0 z-10 -mx-6 space-y-2 border-b bg-ground/95 px-6 py-2 backdrop-blur">
      {moved ? (
        <p className="text-xs text-muted-foreground">
          <span aria-hidden className="mr-1.5 inline-block size-1.5 bg-primary align-middle" />
          {touched!.by} moved {moved} since you last acted
        </p>
      ) : null}
      <FrameBanner />
    </div>
  );
}

/**
 * The configuration's sections as the current state fills them. A frame
 * narrows every section to the items that bear on one question and leaves
 * the sections themselves alone — `Framing`; with no frame, `framed` is true
 * of everything. A yielded or unmet value is asserted: it sits with what was
 * asked for, not with what followed, because nothing about the person's
 * requirement changed.
 */
export function sections(view: View) {
  const framed = view.variables.filter((v) => v.framed);
  return {
    asserted: framed.filter(
      (v) =>
        v.standing === "asked" ||
        v.standing === "yielded" ||
        v.standing === "unmet",
    ),
    follows: framed.filter((v) => v.standing === "follows"),
    open: framed.filter((v) => v.standing === "open"),
    questions: waiting(view),
  };
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
 * The asserted section is the requirement ledger rendered whole
 * (`ledger.tsx`): a line per requirement, with the values answering it and
 * what each forced, and a last line of values answering none. The unit it
 * holds is the choice, the one the case's design is about, so the relation
 * between a clause and its answer is read here rather than reconstructed
 * across surfaces. The requirements surface (`requirements.tsx`) is where
 * the clauses are worded and their sources read; each line links to its
 * clause there, and a clause's answer line links to its choice here.
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

  const { asserted: asked, follows, open, questions } = sections(view);
  const families = byFamily(open);
  const lines = ledger(view, asked);

  return (
    <div className="@container h-full">
      <div className="h-full overflow-y-auto">
        <div className="px-6 pb-6">
          <Header />

          <div className="mt-4">
            <Standing />
          </div>

          {/* Only while something waits on the person: an empty section
              here would read as a question nobody asked. */}
          {questions.length ? (
            <Section
              id="questions"
              title="Asked of you"
              hint="waiting on your answer"
              count={questions.length}
            >
              <PendingQuestions />
            </Section>
          ) : null}

          {/* The ledger: by the requirement each value answers. A line with
              no answer is a requirement still to answer, and the last line,
              values answering none, is slice 0 inside the same build. */}
          <Section
            id="asserted"
            title="Asserted"
            hint={[
              "put there by a party, and revisable, by what each answers",
              lines.unanswered ? `${lines.unanswered} not yet answered` : "",
              lines.unbound.length ? `${lines.unbound.length} answering nothing` : "",
            ]
              .filter(Boolean)
              .join(" · ")}
            count={asked.length}
            empty={!asked.length && !lines.lines.length}
          >
            {/* On the ground, not in a card: the asserted values are the
                raised things, and a card around them would flatten that. */}
            <div className="border-y">
              <Ledger asserted={asked} />
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

          <Trace />

          <p className="mt-6 text-xs/relaxed text-muted-foreground">
            {view.footprint.scope}
          </p>
        </div>
      </div>
    </div>
  );
}
