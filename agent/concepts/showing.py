"""Showing — to let a viewer choose which facts about an item are shown at a
glance, and keep the choice.

Generated from `docs/concepts/showing.md`.

state
  offered: Lens -> set Facet
  about:   Facet -> string
  shown:   Lens -> set Facet
"""

from __future__ import annotations

from typing import Any


class Showing:
    name = "Showing"

    def __init__(self) -> None:
        self._offered: dict[str, list[str]] = {}
        self._about: dict[str, str] = {}
        self._shown: dict[str, list[str]] = {}

    def state(self) -> dict[str, Any]:
        return {
            "offered": {lens: list(fs) for lens, fs in self._offered.items()},
            "about": dict(self._about),
            "shown": {lens: list(fs) for lens, fs in self._shown.items()},
        }

    # -- actions ------------------------------------------------------------

    def offer(self, lens: str, facet: str, about: str) -> dict[str, Any]:
        facets = self._offered.setdefault(lens, [])
        if facet not in facets:
            facets.append(facet)
        self._about[facet] = about
        return {"lens": lens}

    def show(self, lens: str, facet: str) -> dict[str, Any]:
        if facet not in self._offered.get(lens, []):
            return {"error": f"{lens} does not offer {facet}"}
        shown = self._shown.setdefault(lens, [])
        if facet not in shown:
            shown.append(facet)
        return {"lens": lens, "facet": facet}

    def hide(self, lens: str, facet: str) -> dict[str, Any]:
        if facet not in self._offered.get(lens, []):
            return {"error": f"{lens} does not offer {facet}"}
        shown = self._shown.setdefault(lens, [])
        if facet in shown:
            shown.remove(facet)
        return {"lens": lens, "facet": facet}
