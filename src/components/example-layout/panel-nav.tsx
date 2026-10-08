"use client";

import { Fragment } from "react";
import { ChevronDownIcon } from "lucide-react";
import { goTo } from "@/components/configurator/address";
import { CopyViewLink, TITLE, useMoment, type ViewName } from "@/components/configurator/link";
import { sections } from "@/components/configurator";
import { STANDING } from "@/components/configurator/document";
import { useConfigurator } from "@/components/configurator/provider";
import { Log } from "@/components/configurator/log";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  count?: number;
  /** A view of the document, or, with `at`, an address on it. */
  view?: ViewName;
  at?: boolean;
}

/**
 * The way around the document, in one row: the views by name, and the
 * moment they show. The document is one; a view is a projection of it for
 * one task, and a moment is the draft or an issued offer (`docs/ui.md`, "One
 * document, read several ways"). Both are the viewer's, held in the URL,
 * so an entry here is a URL the person can open in another tab or copy;
 * followed here, it is a new entry in the history, and the back button
 * returns to where they were.
 *
 * The question is an address on the document, not a view. The comparison
 * shows only while there is a pair to compare, which the moment's band
 * offers.
 */
export function PanelNav() {
  const { view } = useConfigurator();
  const moment = useMoment();
  if (!view) return null;
  const { questions } = sections(view);
  const issued = view.quotes;
  const current = moment.quote ? issued.find((q) => q.quote === moment.quote) : undefined;
  const groups: Place[][] = [
    [
      ...(questions.length
        ? [{ id: "questions", title: "Asked of you", count: questions.length, at: true }]
        : []),
      { id: "asked", title: TITLE.asked, view: "asked" as const },
    ],
    [
      { id: "proposal", title: TITLE.proposal, view: "proposal" as const },
      { id: "timeline", title: TITLE.timeline, view: "timeline" as const },
      { id: "drawing", title: TITLE.drawing, view: "drawing" as const },
      ...(moment.against ? [{ id: "compared", title: TITLE.compared, view: "compared" as const }] : []),
    ],
  ];

  const follow = (place: Place) => {
    if (place.at) goTo(place.id);
    else if (place.view && place.view !== moment.view) {
      moment.set({ view: place.view });
      // Focus follows the person to the view they asked for, so the
      // keyboard does not stay behind in the header.
      focusMain(place.view);
    } else if (place.view) focusMain(place.view);
  };

  const momentWord = current
    ? `No. ${current.number} · ${STANDING[current.standing]}`
    : "As it stands";

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
          {groups.filter((places) => places.length).map((places, i) => (
            <Fragment key={i}>
              {i > 0 ? (
                <li aria-hidden className="mx-1 h-3.5 w-px shrink-0 bg-border" />
              ) : null}
              {places.map((place) => {
                const isCurrent = !place.at && place.view === moment.view;
                return (
                  <NavigationMenuItem key={place.id}>
                    <NavigationMenuLink
                      href={
                        place.at
                          ? `#${place.id}`
                          : hrefOf(place.view!, moment.quote)
                      }
                      active={isCurrent}
                      onClick={(event) => {
                        event.preventDefault();
                        follow(place);
                      }}
                      className={cn(
                        "gap-1 hover:text-foreground",
                        isCurrent ? "text-foreground" : "text-muted-foreground",
                        isCurrent && "font-medium",
                      )}
                    >
                      {place.title}
                      {place.count === undefined ? null : (
                        <span className="tabular-nums">{place.count}</span>
                      )}
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                );
              })}
            </Fragment>
          ))}
        </NavigationMenuList>
      </NavigationMenu>
      {/* The moment, once there is more than one: the draft, or an issued
          offer by its number. With nothing issued the draft is implied, and
          the band above the view says so. */}
      {issued.length ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="xs" className="text-muted-foreground">
              <span className="sr-only">Moment: </span>
              {momentWord}
              <ChevronDownIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuRadioGroup
              value={moment.quote ?? "draft"}
              onValueChange={(value) =>
                moment.set({
                  quote: value === "draft" ? null : value,
                  against: null,
                  check: null,
                })
              }
            >
              <DropdownMenuRadioItem value="draft">As it stands</DropdownMenuRadioItem>
              {[...issued].reverse().map((q) => (
                <DropdownMenuRadioItem key={q.quote} value={q.quote}>
                  No. {q.number} · {STANDING[q.standing]}
                  {q.stale.length ? " · out of date" : ""}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <Log />
        <CopyViewLink />
      </div>
    </div>
  );
}

/** A view's URL at the moment shown, as `link.tsx` writes it. */
function hrefOf(view: ViewName, quote: string | null): string {
  const params = new URLSearchParams();
  if (view !== "asked") params.set("view", view);
  if (quote) params.set("quote", quote);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

/** Take focus to the panel's `main`, named by the view's `h1`, once that
 * view has rendered. The `main` rather than the heading, because the `h1`
 * is visually hidden and a ring on it would be invisible. */
function focusMain(view: ViewName, tries = 0) {
  const heading = document.querySelector<HTMLElement>(
    `#main h1[data-view="${view}"]`,
  );
  if (!heading) {
    if (tries < 10) setTimeout(() => focusMain(view, tries + 1), 50);
    return;
  }
  const main = document.getElementById("main");
  if (!main) return;
  main.tabIndex = -1;
  main.focus();
}
