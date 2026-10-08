"""Staling — `docs/syncs/staling.md`.

What is marked out of date, by which change, and who takes the mark off.
Two rules with two triggers each mark an item whose basis moved: an answer
whose requirement was reworded or relaxed, with the clause as the basis,
and an open offer whose asked-for value moved or went, with the variable as
the basis.  One gesture clears a mark, and it is the person's: there is no
`TheModelMayClear`, because an item the person committed being re-decided
without them is what the concept exists to prevent, and a model that could
clear the mark would be doing the re-deciding.

A mark changes nothing it is on.  No rule here reads `Staling`, and none
elsewhere does either: a stale answer still answers, and a stale offer can
still be accepted as issued.
"""

from __future__ import annotations

from typing import Any

from engine import Completion, Invocation, States, Sync

from .gestures import PERSON


def _answers(states: States, spec: str, clause: str) -> list[str]:
    """`Binding: { ?sel for: ?s ; ?ch in choices of ?sel ; ?ch answers: ?c }`."""
    binding = states["Binding"].state()
    selection = next((s for s, of in binding["for"].items() if of == spec), None)
    if selection is None:
        return []
    return [
        choice
        for choice in binding["choices"].get(selection, [])
        if binding["answers"].get(choice) == clause
    ]


def _a_changed_clause_stales_its_answers(c: Completion, states: States) -> list[Invocation]:
    if c.failed:
        return []
    clause, spec = c.output.get("clause"), c.output.get("spec")
    return [
        Invocation("Staling", "flag", {"item": choice, "basis": {"clause": clause}})
        for choice in _answers(states, spec, clause)
    ]


def _open_offers(states: States, spec: str, variable: str, option: Any) -> list[str]:
    """The quotes still open to the person for the specification whose frozen
    item held a value for the variable, and not this one.  `option` is None
    for a withdrawal, which differs from any value held."""
    quoting = states["Quoting"].state()
    out = []
    for quote in quoting["quotes"]:
        if quoting["issuedTo"].get(quote) != PERSON:
            continue
        if quote in quoting["committed"] or quote in quoting["revoked"]:
            continue
        item = quoting["from"].get(quote)
        if not isinstance(item, dict) or item.get("spec") != spec:
            continue
        held = item.get("holds", {})
        if variable in held and held[variable] != option:
            out.append(quote)
    return out


def _a_moved_assertion_stales_the_open_offers(
    c: Completion, states: States
) -> list[Invocation]:
    if c.failed:
        return []
    spec, variable = c.output.get("spec"), c.output.get("variable")
    option = c.output.get("option") if c.action == "assert" else None
    return [
        Invocation("Staling", "flag", {"item": quote, "basis": {"variable": variable}})
        for quote in _open_offers(states, spec, variable, option)
    ]


def _a_person_clears_a_stale_item(c: Completion, _: States) -> list[Invocation]:
    if c.output.get("act") != "clear":
        return []
    return [Invocation("Staling", "clear", {"party": PERSON, "item": c.output.get("item")})]


rules = [
    *(
        Sync(
            "AChangedClauseStalesItsAnswers",
            ("Specifying", action),
            _a_changed_clause_stales_its_answers,
        )
        for action in ("reword", "relax")
    ),
    *(
        Sync(
            "AMovedAssertionStalesTheOpenOffers",
            ("Asserting", action),
            _a_moved_assertion_stales_the_open_offers,
        )
        for action in ("assert", "withdraw")
    ),
    Sync("APersonClearsAStaleItem", ("Copiloting", "gesture"), _a_person_clears_a_stale_item),
]
