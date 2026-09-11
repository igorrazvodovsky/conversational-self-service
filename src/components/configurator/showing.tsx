"use client";

/**
 * Which facts the canvas shows beside each item — `Showing`, read for the
 * workspace's lens.
 *
 * The menu is the person's half of the concept; the model's half is the
 * `show` and `hide` tools, and both land in the same state and the same log.
 * The sections are not in the menu: what a party asserted, what follows and
 * what is open is the canvas's claim, not a facet of it.
 */

import { EyeIcon } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConfigurator } from "./provider";

const LABEL: Record<string, string> = {
  price: "Price of each option",
  carbon: "Carbon of each option",
  notes: "Notes on the options",
  excluded: "Why an option is ruled out",
  rules: "The rule behind what follows",
  answers: "The requirement a value answers",
  how: "Who asserted a value",
};

/** Whether a facet is shown, for the components that draw one. */
export function useShown(): (facet: string) => boolean {
  const { view } = useConfigurator();
  const shown = useMemo(
    () => new Set(view?.showing.filter((f) => f.shown).map((f) => f.facet)),
    [view],
  );
  return (facet) => shown.has(facet);
}

export function ShowingMenu() {
  const { view, gesture, busy } = useConfigurator();
  if (!view) return null;
  const on = view.showing.filter((f) => f.shown).length;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          className="text-muted-foreground"
          title="Choose which facts the canvas shows beside each item"
        >
          <EyeIcon />
          Show {on} of {view.showing.length}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Beside each item, at a glance</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {view.showing.map((f) => (
          <DropdownMenuCheckboxItem
            key={f.facet}
            checked={f.shown}
            disabled={busy}
            // Keep the menu open: a person choosing a view sets several.
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={(checked) =>
              void gesture({ act: checked ? "show" : "hide", facet: f.facet })
            }
          >
            <span className="flex flex-col gap-0.5">
              <span>{LABEL[f.facet] ?? f.facet}</span>
              <span className="text-muted-foreground">{f.about}</span>
            </span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
