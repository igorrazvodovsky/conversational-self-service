"use client";

/**
 * The requirements surface: what the person requires, in their words.
 *
 * One of `Moding`'s three surfaces, beside the configuration and the offer.
 * It holds the ledger (`specification.tsx`) with the sources it was read
 * from beneath it (`sources.tsx`), at a width the words can be read at. What
 * answers each clause is shown on the clause; the value itself lives on the
 * configuration, and the clause's answer line links there. Framing a clause
 * brings the configuration forward (`AFramedRequirementShowsTheConfiguration`),
 * and the frame strip there links back.
 */

import { Button } from "@/components/ui/button";
import { useConfigurator } from "./provider";
import { ClauseText } from "./clauses";
import { To, address } from "./address";
import { Sources } from "./sources";
import { Required } from "./specification";

/**
 * The strip at the top: what the ledger is, what moved, and the frame if a
 * clause is framed — the same fact the configuration's strip
 * shows, read from this side.
 */
function Header() {
  const { view, gesture, busy } = useConfigurator();
  if (!view) return null;
  const frame = view.frame?.by === "clause" ? view.frame : null;
  const touched = view.touched;
  const moved = touched ? touched.clauses.length : 0;
  return (
    <div className="sticky top-0 z-10 -mx-6 space-y-2 border-b bg-ground/95 px-6 py-2 backdrop-blur">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="text-sm font-semibold">{view.product}</h1>
        {moved ? (
          <span className="text-xs text-muted-foreground">
            <span className="mr-1.5 inline-block size-1.5 bg-primary align-middle" />
            {touched!.by} moved {moved} since you last acted
          </span>
        ) : null}
      </div>
      {frame ? (
        <div className="flex flex-wrap items-center gap-2 border bg-muted/40 px-3 py-1.5 text-xs">
          <span className="min-w-0">
            <span className="text-muted-foreground">The configuration is narrowed to </span>
            <To id={address.clause(frame.clause)} className="font-medium">
              “<ClauseText text={frame.text} />”
            </To>
            <span className="text-muted-foreground"> · a value picked there answers it</span>
          </span>
          <a href="#asserted" className="ml-auto text-xs underline decoration-dotted underline-offset-2">
            See it
          </a>
          <Button
            variant="ghost"
            size="xs"
            disabled={busy}
            onClick={() => void gesture({ act: "unframe" })}
          >
            Show everything
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function RequirementsSurface() {
  const { view } = useConfigurator();
  if (!view) return null;
  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 pb-6">
        <Header />
        <div className="mt-4">
          <Required />
        </div>
        <Sources />
      </div>
    </div>
  );
}
