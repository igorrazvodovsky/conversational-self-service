"""Naming — to give an item a title and a place that a person will recognise
it by.

Generated from `docs/concepts/naming.md`.

state
  title: Item -> string
  site:  Item -> string
"""

from __future__ import annotations

from typing import Any


class Naming:
    name = "Naming"

    def __init__(self) -> None:
        self._title: dict[str, str] = {}
        self._site: dict[str, str] = {}

    def state(self) -> dict[str, Any]:
        return {"title": dict(self._title), "site": dict(self._site)}

    # -- actions ------------------------------------------------------------

    def entitle(
        self, item: str, title: str | None = None, site: str | None = None
    ) -> dict[str, Any]:
        """Not `name`: that attribute is the concept's own name, which the
        engine dispatches through.  See the note's "Why the action is not
        called `name`"."""
        if title is not None:
            self._title[item] = str(title).strip()
        if site is not None:
            self._site[item] = str(site).strip()
        return {"item": item}
