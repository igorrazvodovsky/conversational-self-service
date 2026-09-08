"use client";

import { useConfigurator } from "./provider";
import { PendingQuestions } from "./question";
import { Totals } from "./totals";
import { Trace } from "./trace";
import { AskedCard, FollowsRow, OpenRow } from "./variables";

function Section({
  title,
  hint,
  count,
  children,
}: {
  title: string;
  hint: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <header className="mb-2 flex items-baseline gap-2">
        <h2 className="text-[13px] font-semibold">{title}</h2>
        <span className="text-[11px] text-[var(--muted-foreground)]">
          {count} · {hint}
        </span>
      </header>
      {count ? (
        children
      ) : (
        <p className="text-[12px] text-[var(--muted-foreground)]">Nothing yet.</p>
      )}
    </section>
  );
}

/**
 * The canvas.
 *
 * The three sections are the design's whole claim made visible: what a person
 * asked for, what follows from it, and what is still open are three different
 * kinds of fact, and a configurator that keeps them in one field cannot show
 * you this. The grouping is a property of the current state — it changes on
 * every action and cuts across the catalogue's own families.
 */
export function ConfiguratorCanvas() {
  const { view, error } = useConfigurator();

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="max-w-sm text-center text-[13px] text-[var(--muted-foreground)]">
          {error}
        </p>
      </div>
    );
  }
  if (!view) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[13px] text-[var(--muted-foreground)]">
          Reading the catalogue…
        </p>
      </div>
    );
  }

  const asked = view.variables.filter(
    (v) => v.standing === "asked" || v.standing === "unmet",
  );
  const follows = view.variables.filter((v) => v.standing === "follows");
  const open = view.variables.filter((v) => v.standing === "open");

  return (
    <div className="h-full overflow-y-auto bg-[var(--background)]">
      <div className="mx-auto max-w-3xl px-6 py-6">
        <h1 className="text-[15px] font-semibold">{view.product}</h1>
        <p className="mb-4 text-[12px] text-[var(--muted-foreground)]">
          {view.counts.asked + view.counts.unmet} asked for ·{" "}
          {view.counts.follows} follow · {view.counts.open} open
        </p>

        <Totals />

        <div className="mt-4">
          <PendingQuestions />
        </div>

        <Section
          title="You asked for"
          hint="stated, and revisable"
          count={asked.length}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {asked.map((variable) => (
              <AskedCard key={variable.name} variable={variable} />
            ))}
          </div>
        </Section>

        <Section
          title="Follows from that"
          hint="nobody chose these"
          count={follows.length}
        >
          <div className="space-y-1">
            {follows.map((variable) => (
              <FollowsRow key={variable.name} variable={variable} />
            ))}
          </div>
        </Section>

        <Section title="Still open" hint="yours to settle" count={open.length}>
          <div className="rounded-[6px] border border-[var(--border)] bg-[var(--card)] px-3">
            {open.map((variable) => (
              <OpenRow key={variable.name} variable={variable} />
            ))}
          </div>
        </Section>

        <Trace />

        <p className="mt-6 text-[11px] leading-relaxed text-[var(--muted-foreground)]">
          {view.footprint.scope}
        </p>
      </div>
    </div>
  );
}
