"use client";

import { Fragment } from "react";
import { goTo } from "@/components/configurator/address";
import { sections } from "@/components/configurator";
import { useConfigurator, type Surface } from "@/components/configurator/provider";
import { cn } from "@/lib/utils";

interface Place {
  id: string;
  title: string;
  count: number;
  surface: Surface;
}

/**
 * The way around the panel, in one row: the three surfaces `Moding` offers,
 * in the order a configuration runs, with the configuration's sections in
 * the middle in place of its name. A surface is one place; the
 * configuration is several, and there is no level between. Every place says
 * how much is in it.
 *
 * The requirements and the quotes are reached by `focus`. A section is an
 * address on the configuration (`address.tsx`): following it brings the
 * configuration forward if it is not, then scrolls to the section.
 */
export function PanelNav() {
  const { view, gesture, busy } = useConfigurator();
  if (!view) return null;
  const mode = view.mode;
  const { asserted, follows, open, questions } = sections(view);
  const groups: Place[][] = [
    [{ id: "required", title: "Requirements", count: view.clauses.length, surface: "requirements" }],
    [
      ...(questions.length
        ? [{ id: "questions", title: "Asked of you", count: questions.length, surface: "canvas" as const }]
        : []),
      { id: "asserted", title: "Asserted", count: asserted.length, surface: "canvas" },
      { id: "follows", title: "Follows", count: follows.length, surface: "canvas" },
      { id: "open", title: "Open", count: open.length, surface: "canvas" },
    ],
    [{ id: "quotes", title: "Quotes", count: view.quotes.length, surface: "quote" }],
  ];

  const follow = (place: Place) => {
    if (place.surface === "canvas") goTo(place.id);
    else if (mode !== place.surface) void gesture({ act: "focus", surface: place.surface });
  };

  return (
    <nav
      aria-label="Panel"
      className="flex min-w-0 items-center overflow-x-auto text-xs whitespace-nowrap"
    >
      {groups.map((places, i) => (
        <Fragment key={i}>
          {i > 0 ? <span aria-hidden className="mx-2 h-3.5 w-px shrink-0 bg-border" /> : null}
          <div
            className={cn(
              "flex items-center gap-x-3",
              places[0].surface === mode ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {places.map((place) => (
              <a
                key={place.id}
                href={`#${place.id}`}
                aria-current={place.surface === mode && place.surface !== "canvas" ? "page" : undefined}
                aria-disabled={busy && place.surface !== "canvas"}
                onClick={(event) => {
                  event.preventDefault();
                  follow(place);
                }}
                className={cn(
                  "hover:text-foreground",
                  place.surface === mode && place.surface !== "canvas" && "font-medium",
                )}
              >
                {place.title} <span className="tabular-nums">{place.count}</span>
              </a>
            ))}
          </div>
        </Fragment>
      ))}
    </nav>
  );
}
