"""Cataloguing — to say what may be ordered, in terms a person can recognise.

Generated from `docs/concepts/cataloguing.md`.  Change the behaviour by editing
that specification, not this file (WYSIWID §7.3).

state
  offers:  Variable -> set Option
  heading: Variable -> string
  family:  Variable -> string
  label:   Option -> string
  note:    Option -> string
  covers:  Option -> (above: Real, upTo: Real)
"""

from __future__ import annotations

from typing import Any


class Cataloguing:
    name = "Cataloguing"

    def __init__(self) -> None:
        self._offers: dict[str, list[str]] = {}
        self._heading: dict[str, str] = {}
        self._family: dict[str, str] = {}
        self._label: dict[str, str] = {}
        self._note: dict[str, str] = {}
        self._covers: dict[str, tuple[float, float]] = {}

    def state(self) -> dict[str, Any]:
        return {
            "offers": {v: list(os) for v, os in self._offers.items()},
            "heading": dict(self._heading),
            "family": dict(self._family),
            "label": dict(self._label),
            "note": dict(self._note),
            "covers": {o: list(r) for o, r in self._covers.items()},
        }

    # -- actions ------------------------------------------------------------

    def describe(self, variable: str, heading: str, family: str) -> dict[str, Any]:
        self._heading[variable] = heading
        self._family[variable] = family
        self._offers.setdefault(variable, [])
        return {"variable": variable}

    def list(self, variable: str, option: str, label: str) -> dict[str, Any]:
        offered = self._offers.setdefault(variable, [])
        if option in offered:
            return {"error": f"{variable} already offers {option}"}
        offered.append(option)
        self._label[option] = label
        return {"variable": variable, "option": option}

    def annotate(self, option: str, note: str) -> dict[str, Any]:
        self._note[option] = note
        return {"option": option}

    def bound(self, option: str, above: float, upTo: float) -> dict[str, Any]:  # noqa: N803 — the specification's name
        if not above < upTo:
            return {"error": f"{option}'s range is empty: {above} is not less than {upTo}"}
        self._covers[option] = (above, upTo)
        return {"option": option}

    def delist(self, variable: str, option: str) -> dict[str, Any]:
        offered = self._offers.get(variable, [])
        if option in offered:
            offered.remove(option)
        return {"variable": variable, "option": option}
