"use client";

import { Fragment } from "react";
import { goTo } from "@/components/configurator/address";
import { sections } from "@/components/configurator";
import {
  useConfigurator,
  type Surface,
} from "@/components/configurator/provider";
import { ledger } from "@/components/configurator/ledger";
import { ShowingMenu } from "@/components/configurator/showing";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

interface Place {
  id: string;
  title: string;
  count: number;
  surface: Surface;
}

/**
 * The way around the panel, in one row: the two surfaces `Moding` offers,
 * the specification's sections in place of its name, then the quotes. A
 * surface is one place; the specification is several, and there is no level
 * between. Every place says how much is in it.
 *
 * The quotes are reached by `focus`. A section is an address on the
 * specification (`address.tsx`): following it brings the specification
 * forward if it is not, then scrolls to the section.
 *
 * At the row's end, while the specification is showing, the `Showing` menu:
 * which facts it shows beside each item. It has nothing to say about the
 * quotes.
 */
export function PanelNav() {
  const { view, gesture, busy } = useConfigurator();
  if (!view) return null;
  const mode = view.mode;
  const { asserted, follows, open, questions } = sections(view);
  const lines = ledger(view, asserted);
  const groups: Place[][] = [
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
        // Every line of the ledger the frame leaves: each requirement, and
        // the line of values answering none when there are any.
        id: "asserted",
        title: "Asked for",
        count: lines.shown.size + (lines.unbound.length ? 1 : 0),
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
      {/* One list, the groups divided by a rule. It wraps rather than
          scrolling sideways: at a narrow width or a large text size every
          place stays in view. Nothing drops down, so there is no viewport. */}
      <NavigationMenu
        aria-label="Panel"
        viewport={false}
        className="max-w-none flex-none justify-start"
      >
        <NavigationMenuList className="flex-wrap justify-start whitespace-nowrap">
          {groups.map((places, i) => (
            <Fragment key={i}>
              {i > 0 ? (
                <li aria-hidden className="mx-1 h-3.5 w-px shrink-0 bg-border" />
              ) : null}
              {places.map((place) => {
                const current =
                  place.surface === mode && place.surface !== "canvas";
                return (
                  <NavigationMenuItem key={place.id}>
                    <NavigationMenuLink
                      href={`#${place.id}`}
                      active={current}
                      aria-disabled={busy && place.surface !== "canvas"}
                      onClick={(event) => {
                        event.preventDefault();
                        // `aria-disabled` says it; this makes it so.
                        if (busy && place.surface !== "canvas") return;
                        follow(place);
                      }}
                      className={cn(
                        "gap-1 hover:text-foreground",
                        place.surface === mode
                          ? "text-foreground"
                          : "text-muted-foreground",
                        current && "font-medium",
                      )}
                    >
                      {place.title}{" "}
                      <span className="tabular-nums">{place.count}</span>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                );
              })}
            </Fragment>
          ))}
        </NavigationMenuList>
      </NavigationMenu>
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
