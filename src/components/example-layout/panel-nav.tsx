"use client";

import { Fragment } from "react";
import { goTo } from "@/components/configurator/address";
import { sections } from "@/components/configurator";
import {
  useConfigurator,
  type Surface,
} from "@/components/configurator/provider";
import { ShowingMenu } from "@/components/configurator/showing";
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
 *
 * At the row's end, while the configuration is showing, the `Showing` menu:
 * which facts the configuration shows beside each item. It has nothing to
 * say about the other surfaces.
 */
export function PanelNav() {
  const { view, gesture, busy } = useConfigurator();
  if (!view) return null;
  const mode = view.mode;
  const { asserted, follows, open, questions } = sections(view);
  const groups: Place[][] = [
    [
      {
        id: "required",
        title: "Requirements",
        count: view.clauses.length,
        surface: "requirements",
      },
    ],
    [
      ...(questions.length
        ? [
            {
              id: "questions",
              title: "Asked of you",
              count: questions.length,
              surface: "canvas" as const,
            },
          ]
        : []),
      {
        id: "asserted",
        title: "Asserted",
        count: asserted.length,
        surface: "canvas",
      },
      {
        id: "follows",
        title: "Follows",
        count: follows.length,
        surface: "canvas",
      },
      { id: "open", title: "Open", count: open.length, surface: "canvas" },
    ],
    [
      {
        id: "quotes",
        title: "Quotes",
        count: view.quotes.length,
        surface: "quote",
      },
    ],
  ];

  const follow = (place: Place) => {
    if (place.surface === "canvas") goTo(place.id);
    else if (mode !== place.surface)
      // Focus follows the person to the surface they asked for, so the keyboard does not stay behind in the header. A surface
      // a rule brings forward takes no focus: nobody asked to go there.
      void gesture({ act: "focus", surface: place.surface }).then((next) => {
        if (next?.mode === place.surface) focusSurface(place.surface);
      });
    else focusSurface(place.surface);
  };

  return (
    // Beside the wordmark while there is room for it, on a line of its own
    // when there is not.
    <div className="flex min-w-0 flex-[1_1_16rem] flex-wrap items-center gap-2">
      {/* Wraps rather than scrolling sideways: at a narrow width or a
          large text size every place stays in view. */}
      <nav
        aria-label="Panel"
        className="flex min-w-0 flex-wrap items-center text-xs whitespace-nowrap"
      >
        {groups.map((places, i) => (
          <Fragment key={i}>
            {i > 0 ? (
              <span
                aria-hidden
                className="mx-2 h-3.5 w-px shrink-0 bg-border"
              />
            ) : null}
            <ul
              className={cn(
                "flex flex-wrap items-center gap-x-3",
                places[0].surface === mode
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {places.map((place) => (
                <li key={place.id}>
                  <a
                    href={`#${place.id}`}
                    aria-current={
                      place.surface === mode && place.surface !== "canvas"
                        ? "page"
                        : undefined
                    }
                    aria-disabled={busy && place.surface !== "canvas"}
                    onClick={(event) => {
                      event.preventDefault();
                      // `aria-disabled` says it; this makes it so.
                      if (busy && place.surface !== "canvas") return;
                      follow(place);
                    }}
                    // The row is tall and the words are small: the padding
                    // gives the pointer a target the height of the row.
                    className={cn(
                      "inline-block py-2 hover:text-foreground",
                      place.surface === mode &&
                        place.surface !== "canvas" &&
                        "font-medium",
                    )}
                  >
                    {place.title}{" "}
                    <span className="tabular-nums">{place.count}</span>
                  </a>
                </li>
              ))}
            </ul>
          </Fragment>
        ))}
      </nav>
      {mode === "canvas" ? (
        <div className="ml-auto shrink-0">
          <ShowingMenu />
        </div>
      ) : null}
    </div>
  );
}

/** Take focus to the panel's `main`, named by the surface's `h1`, once that
 * surface has rendered. The `main` rather than the heading, because a
 * surface's `h1` may be visually hidden and a ring on it would be invisible. */
function focusSurface(surface: Surface, tries = 0) {
  const heading = document.querySelector<HTMLElement>(
    `#main h1[data-surface="${surface}"]`,
  );
  if (!heading) {
    if (tries < 10) setTimeout(() => focusSurface(surface, tries + 1), 50);
    return;
  }
  const main = document.getElementById("main");
  if (!main) return;
  main.tabIndex = -1;
  main.focus();
}
