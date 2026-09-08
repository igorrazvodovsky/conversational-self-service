"""Specifying — to record what a person asks of a product, apart from what
follows from it.

Generated from `docs/concepts/specifying.md`.

state
  open:      set Spec
  required:  Spec -> Variable -> Option
  preferred: Spec -> Variable -> Option

This concept validates nothing against a catalogue and solves nothing.  A
requirement that cannot be met is recorded all the same; the difference between
what is required here and what was assumable in Constraining is the most
important thing on the screen.
"""

from __future__ import annotations

from typing import Any


class Specifying:
    name = "Specifying"

    def __init__(self) -> None:
        self._open: set[str] = set()
        self._required: dict[str, dict[str, str]] = {}
        self._preferred: dict[str, dict[str, str]] = {}

    def state(self) -> dict[str, Any]:
        return {
            "open": sorted(self._open),
            "required": {s: dict(m) for s, m in self._required.items()},
            "preferred": {s: dict(m) for s, m in self._preferred.items()},
        }

    # -- actions ------------------------------------------------------------

    def start(self, spec: str) -> dict[str, Any]:
        self._open.add(spec)
        self._required[spec] = {}
        self._preferred[spec] = {}
        return {"spec": spec}

    def require(self, spec: str, variable: str, option: str) -> dict[str, Any]:
        if spec not in self._open:
            return {"error": f"{spec} is not open"}
        self._preferred[spec].pop(variable, None)
        self._required[spec][variable] = option
        return {"spec": spec, "variable": variable, "option": option}

    def prefer(self, spec: str, variable: str, option: str) -> dict[str, Any]:
        if spec not in self._open:
            return {"error": f"{spec} is not open"}
        self._required[spec].pop(variable, None)
        self._preferred[spec][variable] = option
        return {"spec": spec, "variable": variable, "option": option}

    def withdraw(self, spec: str, variable: str) -> dict[str, Any]:
        asked = self._required.get(spec, {}).pop(variable, None)
        if asked is None:
            asked = self._preferred.get(spec, {}).pop(variable, None)
        if asked is None:
            return {"error": f"nothing was asked of {variable}"}
        return {"spec": spec, "variable": variable, "option": asked}

    def discard(self, spec: str) -> dict[str, Any]:
        self._open.discard(spec)
        self._required.pop(spec, None)
        self._preferred.pop(spec, None)
        return {"spec": spec}
