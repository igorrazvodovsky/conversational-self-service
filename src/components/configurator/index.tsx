"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { addressable, NOW, useTargeted } from "./address";
import { Comparison } from "./comparison";
import { QuoteDocument } from "./document";
import { LiftDrawing, undrawn } from "./drawing";
import { useMoment } from "./link";
import { useConfigurator, type Quote, type View } from "./provider";
import { PendingQuestions, waiting } from "./question";
import { AsAsked, Offer } from "./quotes";
import { Addressee, Standing } from "./standing";
import { framedAsserted } from "./ledger";
import { AskedFor } from "./specification";
import { Timeline } from "./timeline";

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

function Blank({ children }: { children: React.ReactNode }) {
  return (
    <Empty className="mt-6 border p-8">
      <EmptyHeader>
        <EmptyDescription className="max-w-sm">{children}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

/**
 * The canvas: one document, the deal as it stands or as it stood when an
 * offer was issued, read several ways (`docs/ui.md`, "One document, read
 * several ways"). Which view and which moment are open are the viewer's,
 * read from the URL (`link.tsx`). Above every view, the same at every one,
 * is where the document stands: the draft and why it cannot yet be issued
 * (`standing.tsx`), or an issued offer as a decision (`quotes.tsx`). The
 * band carries the moment's address, so a link to an offer lands on it
 * whichever view is open.
 *
 * A view fills; it does not rearrange. Over the draft the proposal has
 * blanks, the timeline an order and nothing after it, and the drawing says
 * which sizes it still lacks. Those are the gaps, in the seller's format.
 */
export function ConfiguratorCanvas() {
  const { view, error } = useConfigurator();
  const moment = useMoment();

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

  const issued = moment.quote ? view.quotes.find((q) => q.quote === moment.quote) : undefined;
  // A link to an offer that is not there still arrives: at the draft, and
  // the page says so (`docs/ui.md`, "Links").
  const missing = moment.quote && !issued ? moment.quote : null;
  const at: Quote = issued ?? view.draft;
  const open = view.variables
    .filter((v) => v.standing === "open")
    .map((v) => ({ name: v.name, heading: v.heading, family: v.family }));

  // The pair a comparison shows: an issued offer on the left, always, since
  // the draft is the moving side.
  const against = moment.against;
  const other = against && against !== NOW ? view.quotes.find((q) => q.quote === against) : undefined;
  const pair: { a: Quote; b: Quote | typeof NOW } | null = issued
    ? against === NOW
      ? { a: issued, b: NOW }
      : other
        ? { a: issued, b: other }
        : null
    : other
      ? { a: other, b: NOW }
      : null;

  return (
    <div className="@container h-full">
      <div className="relative h-full overflow-y-auto">
        <div className="px-6 pb-6">
          {missing ? (
            <Alert className="mt-4" role="status">
              <AlertDescription>
                There is no quotation {missing}; this is the draft, as it stands.
              </AlertDescription>
            </Alert>
          ) : null}

          <Band id={`quote:${at.quote}`}>
            {issued ? <Offer quote={issued} /> : <Standing />}
          </Band>

          {moment.view === "asked" && !issued ? (
            <>
              {/* Only while something waits on the person: an empty
                  section here would read as a question nobody asked. */}
              {sections(view).questions.length ? (
                <Section
                  id="questions"
                  title="Asked of you"
                  count={sections(view).questions.length}
                >
                  <PendingQuestions />
                </Section>
              ) : null}
              <AskedFor />
              <p className="mt-6 text-xs/relaxed text-muted-foreground">
                {view.footprint.scope}
              </p>
            </>
          ) : null}

          {moment.view === "asked" && issued ? <AsAsked quote={issued} /> : null}

          {moment.view === "proposal" ? (
            <Card className="mt-6 px-8 py-8">
              <QuoteDocument
                quote={at}
                view={view}
                level={2}
                addressee={issued ? undefined : <Addressee />}
                open={issued ? [] : open}
              />
            </Card>
          ) : null}

          {moment.view === "timeline" ? (
            at.terms.programme && at.terms.programme.milestones.length > 1 ? (
              <Timeline quote={at} view={view} />
            ) : (
              <Blank>
                The programme is placed once a handover date is chosen: the
                order, then the drawings, dispatch and handover by week.
              </Blank>
            )
          ) : null}

          {moment.view === "drawing" ? (
            undrawn(at.holds).length ? (
              <Blank>
                Drawn to scale once the car and shaft are sized. Still open:{" "}
                {undrawn(at.holds)
                  .map((name) => view.variables.find((v) => v.name === name)?.heading ?? name)
                  .join(", ")}
                .
              </Blank>
            ) : (
              <div className="mt-6">
                <LiftDrawing holds={at.holds} id={`drawing-${at.quote}`} />
              </div>
            )
          ) : null}

          {moment.view === "compared" ? (
            pair ? (
              <div className="mt-6">
                <Comparison
                  a={pair.a}
                  b={pair.b}
                  view={view}
                  onClose={() => moment.set({ against: null, view: "asked" })}
                />
              </div>
            ) : (
              <Blank>
                Nothing to compare with yet. An issued offer can be set
                against another, or against the draft as it stands.
              </Blank>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** The band above the views, carrying the moment's address. */
function Band({ id, children }: { id: string; children: React.ReactNode }) {
  const isTarget = useTargeted(id);
  return (
    <div id={id} className={cn("mt-4", addressable, isTarget && targetedBand)}>
      {children}
    </div>
  );
}

const targetedBand = "animate-arrive";
