"""Staling — to mark an item whose basis has changed without changing the
item, so that nothing a person committed is silently re-decided.

Generated from `docs/concepts/staling.md`.

state
  stale:   set Item
  because: Item -> set Basis

`Item`, `Basis` and `Party` are type parameters and cannot be constrained.
An item is whatever the flagging rule names — a choice, a quote — and a
basis is whatever it names as having changed; this concept compares neither
and never looks inside them.  A basis is kept as a value, so two flags with
the same basis are one basis recorded once.

The mark comes off only by `clear`, which takes a party.  Nothing here
recomputes anything, which is the point: an item reads current again because
somebody looked, never because the numbers happened to agree again.
"""

from __future__ import annotations

import json
from typing import Any


def _key(basis: Any) -> str:
    return json.dumps(basis, sort_keys=True)


class Staling:
    name = "Staling"

    def __init__(self) -> None:
        self._because: dict[str, dict[str, Any]] = {}

    def state(self) -> dict[str, Any]:
        return {
            "stale": sorted(self._because),
            "because": {item: list(bases.values()) for item, bases in self._because.items()},
        }

    # -- actions ------------------------------------------------------------

    def flag(self, item: str, basis: Any) -> dict[str, Any]:
        self._because.setdefault(item, {})[_key(basis)] = basis
        return {"item": item, "basis": basis}

    def clear(self, party: str, item: str) -> dict[str, Any]:
        if item not in self._because:
            return {"error": f"{item} is not stale"}
        del self._because[item]
        return {"item": item, "party": party}
