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
 * The canvas.
 *
 * The three sections are the design's whole claim made visible: what a party
 * asserted, what follows from it, and what is still open are three different
 * kinds of fact, and a configurator that keeps them in one field cannot show
 * you this. The grouping is a property of the current state — it changes on
 * every action and cuts across the catalogue's own families.
 */
export function ConfiguratorCanvas() {
  const { view, error } = useConfigurator();

  if (error) {
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

  const asked = view.variables.filter(
    (v) => v.standing === "asked" || v.standing === "unmet",
  );
  const follows = view.variables.filter((v) => v.standing === "follows");
  const open = view.variables.filter((v) => v.standing === "open");

  return (
    <div className="h-full overflow-y-auto bg-background">
      {/* Below `lg` the canvas takes the full width, and the threads launcher
          and the Chat/Configurator switch are fixed over its top corners. */}
      <div className="mx-auto max-w-3xl px-6 py-6 max-lg:pt-16">
        <h1 className="text-base font-semibold">{view.product}</h1>
        <p className="mb-4 text-xs text-muted-foreground">
          {view.counts.asked + view.counts.unmet} asserted ·{" "}
          {view.counts.follows} follow · {view.counts.open} open
        </p>

        <Totals />

        <div className="mt-4">
          <PendingQuestions />
        </div>

        <Section
          title="Asserted"
          hint="put there by a party, and revisable"
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
          <ItemGroup className="gap-1">
            {follows.map((variable) => (
              <FollowsRow key={variable.name} variable={variable} />
            ))}
          </ItemGroup>
        </Section>

        <Section title="Still open" hint="yours to settle" count={open.length}>
          <Card className="gap-0 py-0">
            {open.map((variable) => (
              <OpenRow key={variable.name} variable={variable} />
            ))}
          </Card>
        </Section>

        <Trace />

        <p className="mt-6 text-xs/relaxed text-muted-foreground">
          {view.footprint.scope}
        </p>
      </div>
    </div>
  );
}
