"use client";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { useConfigurator, type View } from "./provider";
import { Button } from "@/components/ui/button";
import { address, To } from "./address";
import { ClauseText } from "./clauses";
import { PendingQuestions, waiting } from "./question";
import { Standing } from "./standing";
import { framedAsserted } from "./ledger";
import { AskedFor } from "./specification";

function Section({
  id,
  title,
  count,
  children,
}: {
  id: string;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-6 scroll-mt-28">
      <header className="mb-2 flex items-baseline gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground">
          {count}
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
 * What the canvas is narrowed to, and the way out. Shown while an assertion
 * or a clause frames it — an assertion only by the assistant or the person's
 * own agent, since the page's own way to what one forced is the card itself; the counts are of the slice, by kind of fact. A
 * frame on a clause is also the answering mode, and the strip says so. A gap
 * frame is a filter, shown pressed above the list it filters.
 */
function FrameBanner() {
  const { view, gesture, busy, label } = useConfigurator();
  if (!view?.frame || view.frame.by === "gap") return null;
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
            <span className="text-muted-foreground">Narrowed to </span>
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
            · forced {count("follows")}
            {count("open") ? ` · narrowed ${count("open")} open` : ""}
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
            · answered by {asked} · {count("follows")} followed · {count("open")} open
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
 * The strip kept at the top of the configuration's scroll: the frame, if
 * any, so a mode begun anywhere is visible, and its way out reachable, from
 * anywhere. What the other party changed is in the log, behind the bell in
 * the panel's header (`log.tsx`).
 */
function Header() {
  const { view } = useConfigurator();
  if (!view?.frame || view.frame.by === "gap") return null;
  return (
    <div className="sticky top-0 z-10 -mx-6 border-b bg-ground/95 px-6 py-2 backdrop-blur">
      <FrameBanner />
    </div>
  );
}

/**
 * What the current state and frame leave on the canvas, by kind of fact. A
 * frame narrows it to the items that bear on one question — `Framing`; with
 * no frame, `framed` is true of everything. A yielded or unmet value is
 * asserted, not followed, because nothing about the person's requirement
 * changed.
 */
export function sections(view: View) {
  const framed = view.variables.filter((v) => v.framed);
  return {
    asserted: framedAsserted(view),
    follows: framed.filter((v) => v.standing === "follows"),
    open: framed.filter((v) => v.standing === "open"),
    questions: waiting(view),
  };
}

/**
 * The specification: what is the case.
 *
 * One list, the requirement ledger written as a document (`specification.tsx`,
 * `ledger.tsx`): each requirement on its own line, in the person's words and
 * edited there, beside the values asserted to answer it, each with what it
 * forced beneath it; then a line for each value answering none, its
 * requirement empty; then what is still open, by the catalogue's family; and
 * the sources the assistant read from beneath. Asked for, follows from that
 * and still open are three kinds of fact, and each item says which it is
 * where it stands — a value that follows sits under the assertions it rests
 * on, with the rule — rather than in a section of its own. The gaps are
 * filters over the list. The only other surface is the quotes.
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

  const { questions } = sections(view);

  return (
    <div className="@container h-full">
      <div className="relative h-full overflow-y-auto">
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
              count={questions.length}
            >
              <PendingQuestions />
            </Section>
          ) : null}

          {/* The one list: each requirement beside what answers it and
              what that forced, the values answering none, what is open. */}
          <AskedFor />

          <p className="mt-6 text-xs/relaxed text-muted-foreground">
            {view.footprint.scope}
          </p>
        </div>
      </div>
    </div>
  );
}
