"use client";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { useConfigurator, type View } from "./provider";
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
 * A frame narrows the canvas to the items that bear on one question —
 * `Framing`; with no frame, `framed` is true of everything.
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
 * The specification: what is the case (`ledger.tsx`). The only other surface
 * is the quotes.
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

          <AskedFor />

          <p className="mt-6 text-xs/relaxed text-muted-foreground">
            {view.footprint.scope}
          </p>
        </div>
      </div>
    </div>
  );
}
