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
import { Button } from "@/components/ui/button";
import { AnsweringBanner, AnsweringProvider } from "./clauses";
import { PendingQuestions } from "./question";
import { ShowingMenu } from "./showing";
import { Required } from "./specification";
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
 * What the canvas is narrowed to, and the way out. Shown only while a frame
 * is on; the counts are of the slice, so the three sections still read as
 * three kinds of fact inside it.
 */
function FrameBanner() {
  const { view, gesture, busy, label } = useConfigurator();
  if (!view?.frame) return null;
  const { frame } = view;
  const inside = view.variables.filter((v) => v.framed);
  const count = (standing: string) =>
    inside.filter((v) => v.standing === standing).length;
  const unmet = count("unmet");
  return (
    <div className="mt-6 flex flex-wrap items-center gap-2 border bg-muted/40 px-3 py-2 text-xs">
      <span>
        <span className="text-muted-foreground">What followed from </span>
        <span className="font-medium uppercase tracking-wide">{frame.heading}</span>
        {frame.asked ? (
          <>
            <span className="text-muted-foreground">: </span>
            <span className="font-medium">{label(frame.asked)}</span>
          </>
        ) : null}
      </span>
      <span className="text-muted-foreground">
        · {count("follows")} follow · {count("open")} narrowed
        {unmet ? ` · ${unmet} unmet` : ""}
      </span>
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

/**
 * The canvas.
 *
 * The three sections are the design's whole claim made visible: what a party
 * asserted, what follows from it, and what is still open are three different
 * kinds of fact, and a configurator that keeps them in one field cannot show
 * you this. The grouping is a property of the current state — it changes on
 * every action and cuts across the catalogue's own families.
 *
 * Above them, since the case's slice 1, a fourth: what the person requires in
 * their own words, with what answers each clause. The same canvas with a
 * column added, which is what the case's plan says slice 1 is.
 */
export function ConfiguratorCanvas() {
  return (
    <AnsweringProvider>
      <Canvas />
    </AnsweringProvider>
  );
}

function Canvas() {
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

  // A frame narrows every section to the items that bear on one question
  // and leaves the sections themselves alone — `Framing`. With no frame,
  // `framed` is true of everything.
  const framed = view.variables.filter((v) => v.framed);
  const asked = framed.filter(
    (v) => v.standing === "asked" || v.standing === "unmet",
  );
  const follows = framed.filter((v) => v.standing === "follows");
  const open = framed.filter((v) => v.standing === "open");

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="mx-auto max-w-3xl px-6 py-6">
        <h1 className="text-base font-semibold">{view.product}</h1>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <p className="text-xs text-muted-foreground">
            {view.clauses.length} required · {view.counts.asked + view.counts.unmet}{" "}
            asserted
            {view.counts.unbound ? ` (${view.counts.unbound} answering nothing)` : ""}
            {" · "}
            {view.counts.follows} follow · {view.counts.open} open
          </p>
          {/* What the canvas shows beside each item is the person's, and the
              assistant's when asked — `Showing`. The sections are not in it. */}
          <div className="ml-auto">
            <ShowingMenu />
          </div>
        </div>

        <Totals />

        <div className="mt-4 space-y-2">
          <PendingQuestions />
          <AnsweringBanner />
        </div>

        <Required />

        <FrameBanner />

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

        {/* The end of a configuration is an offer, and the offer is a surface
            of its own. The canvas only says whether one can be requested yet,
            and how many there are. */}
        <QuoteCall />

        <Trace />

        <p className="mt-6 text-xs/relaxed text-muted-foreground">
          {view.footprint.scope}
        </p>
      </div>
    </div>
  );
}
