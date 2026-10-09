"""Binding — to keep every committed value bound to the requirement it
answers, so that a value can later be substituted and explained rather than merely
overwritten.

Generated from `docs/concepts/binding.md`.

state
  selections: set Selection
  for:        Selection -> Spec
  against:    Selection -> Offering
  choices:    Selection -> seq Choice
  value:      Choice -> Value
  answers:    Choice -> Requirement
  decidedBy:  Choice -> Party
  replaces:   Choice -> Choice
  reason:     Choice -> string

`Spec`, `Requirement`, `Offering`, `Value` and `Party` are type parameters and
cannot be constrained.  A value is whatever the proposing rule hands over —
here a catalogue option's identity — and this concept never looks inside it.

`choices` is the *current* answers: a substituted or retracted choice leaves
the sequence.  A replaced choice stays reachable through `replaces`, so that a
reader can ask of any value what it replaced and why.
"""

from __future__ import annotations

from typing import Any


class Binding:
    name = "Binding"

    def __init__(self) -> None:
        self._selections: set[str] = set()
        self._for: dict[str, str] = {}
        self._against: dict[str, str] = {}
        self._choices: dict[str, list[str]] = {}
        self._value: dict[str, Any] = {}
        self._answers: dict[str, str] = {}
        self._decided_by: dict[str, str] = {}
        self._replaces: dict[str, str] = {}
        self._reason: dict[str, str] = {}
        self._minted_selections = 0
        self._minted_choices = 0

    def state(self) -> dict[str, Any]:
        return {
            "selections": sorted(self._selections),
            "for": dict(self._for),
            "against": dict(self._against),
            "choices": {s: list(c) for s, c in self._choices.items()},
            "value": dict(self._value),
            "answers": dict(self._answers),
            "decidedBy": dict(self._decided_by),
            "replaces": dict(self._replaces),
            "reason": dict(self._reason),
        }

    def _selection_of(self, choice: str) -> str | None:
        for selection, choices in self._choices.items():
            if choice in choices:
                return selection
        return None

    def _hold(
        self, choice: str, selection: str, party: str, requirement: str, value: Any
    ) -> None:
        self._choices[selection].append(choice)
        self._value[choice] = value
        self._answers[choice] = requirement
        self._decided_by[choice] = party

    # -- actions ------------------------------------------------------------

    def begin(self, spec: str, offering: str) -> dict[str, Any]:
        self._minted_selections += 1
        selection = f"sel{self._minted_selections}"
        self._selections.add(selection)
        self._for[selection] = spec
        self._against[selection] = offering
        self._choices[selection] = []
        return {"selection": selection, "spec": spec}

    def propose(
        self, party: str, selection: str, requirement: str, value: Any, choice: str
    ) -> dict[str, Any]:
        if selection not in self._selections:
            return {"error": f"there is no selection {selection}"}
        if choice in self._value:
            return {"error": f"{choice} is already a choice"}
        self._hold(choice, selection, party, requirement, value)
        return {
            "choice": choice,
            "selection": selection,
            "requirement": requirement,
            "value": value,
            "party": party,
        }

    def substitute(
        self, party: str, choice: str, value: Any, reason: str = ""
    ) -> dict[str, Any]:
        selection = self._selection_of(choice)
        if selection is None:
            return {"error": f"there is no choice {choice} in any selection"}
        requirement = self._answers[choice]
        self._choices[selection].remove(choice)
        self._minted_choices += 1
        new = f"ch{self._minted_choices}"
        while new in self._value:
            self._minted_choices += 1
            new = f"ch{self._minted_choices}"
        self._hold(new, selection, party, requirement, value)
        self._replaces[new] = choice
        self._reason[new] = str(reason or "").strip()
        return {
            "choice": new,
            "selection": selection,
            "requirement": requirement,
            "value": value,
            "party": party,
            "replaced": choice,
        }

    def adopt(self, choice: str, party: str) -> dict[str, Any]:
        selection = self._selection_of(choice)
        if selection is None:
            return {"error": f"there is no choice {choice} in any selection"}
        formerly = self._decided_by[choice]
        if formerly == party:
            return {"error": f"{party} decided {choice} already"}
        self._decided_by[choice] = party
        return {
            "choice": choice,
            "selection": selection,
            "requirement": self._answers[choice],
            "party": party,
            "formerly": formerly,
        }

    def retract(self, choice: str) -> dict[str, Any]:
        selection = self._selection_of(choice)
        if selection is None:
            return {"error": f"there is no choice {choice} in any selection"}
        self._choices[selection].remove(choice)
        return {
            "choice": choice,
            "selection": selection,
            "requirement": self._answers[choice],
            "value": self._value[choice],
        }

    def abandon(self, selection: str) -> dict[str, Any]:
        self._selections.discard(selection)
        self._for.pop(selection, None)
        self._against.pop(selection, None)
        for choice in self._choices.pop(selection, []):
            for relation in (
                self._value,
                self._answers,
                self._decided_by,
                self._replaces,
                self._reason,
            ):
                relation.pop(choice, None)
        return {"selection": selection}
