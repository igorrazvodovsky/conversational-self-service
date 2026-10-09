"""Situating — to hold the facts of the situation that the outcome must fit
and cannot trade, with how firmly each is known and who it comes from.

Generated from `docs/concepts/situating.md`.  Change the behaviour by editing
that specification, not this file (WYSIWID §7.3).

state
  facts:      set Fact
  meaning:    Fact -> string
  givens:     Situation -> set Given
  of:         Given -> Fact
  is:         Given -> Value
  certainty:  Given -> ("estimated" | "measured")
  recordedBy: Given -> Party
"""

from __future__ import annotations

from typing import Any

ESTIMATED = "estimated"
MEASURED = "measured"


class Situating:
    name = "Situating"

    def __init__(self) -> None:
        self._facts: list[str] = []
        self._meaning: dict[str, str] = {}
        self._givens: dict[str, list[str]] = {}
        self._of: dict[str, str] = {}
        self._is: dict[str, Any] = {}
        self._certainty: dict[str, str] = {}
        self._recorded_by: dict[str, str] = {}
        self._situation: dict[str, str] = {}

    def state(self) -> dict[str, Any]:
        return {
            "facts": list(self._facts),
            "meaning": dict(self._meaning),
            "givens": {s: list(gs) for s, gs in self._givens.items()},
            "of": dict(self._of),
            "is": dict(self._is),
            "certainty": dict(self._certainty),
            "recordedBy": dict(self._recorded_by),
        }

    # -- actions ------------------------------------------------------------

    def describe(self, fact: str, meaning: str) -> dict[str, Any]:
        if fact not in self._facts:
            self._facts.append(fact)
        self._meaning[fact] = meaning
        return {"fact": fact}

    def record(
        self, situation: str, party: str, fact: str, value: Any, given: str
    ) -> dict[str, Any]:
        if fact not in self._facts:
            return {"error": f"{fact} is not a fact of a situation"}
        if given in self._of:
            return {"error": f"{given} exists already"}
        replaced = next(
            (g for g in self._givens.get(situation, []) if self._of[g] == fact), None
        )
        if replaced is not None:
            self._remove(replaced)
        self._givens.setdefault(situation, []).append(given)
        self._of[given] = fact
        self._is[given] = value
        self._certainty[given] = ESTIMATED
        self._recorded_by[given] = party
        self._situation[given] = situation
        return {
            "given": given,
            "situation": situation,
            "fact": fact,
            "value": value,
            "party": party,
            "replaced": replaced,
        }

    def survey(self, party: str, given: str, value: Any) -> dict[str, Any]:
        if given not in self._of:
            return {"error": f"there is no given {given}"}
        was = self._is[given]
        self._is[given] = value
        self._certainty[given] = MEASURED
        self._recorded_by[given] = party
        return {
            "given": given,
            "situation": self._situation[given],
            "fact": self._of[given],
            "value": value,
            "was": was,
            "party": party,
        }

    def strike(self, given: str) -> dict[str, Any]:
        if given not in self._of:
            return {"error": f"there is no given {given}"}
        out = {
            "given": given,
            "situation": self._situation[given],
            "fact": self._of[given],
            "value": self._is[given],
        }
        self._remove(given)
        return out

    def _remove(self, given: str) -> None:
        situation = self._situation.pop(given)
        self._givens[situation].remove(given)
        for relation in (self._of, self._is, self._certainty, self._recorded_by):
            relation.pop(given, None)
