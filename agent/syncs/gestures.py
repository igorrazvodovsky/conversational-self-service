"""Gestures — `docs/syncs/gestures.md`.

What a person may do. Every one of these is a permission, stated positively,
in exactly the form the model's permissions take in `conduct.py`. The list is
deliberately readable side by side with that one: the difference between them
is the whole of what the model may not do.
"""

from __future__ import annotations

from engine import Completion, Invocation, States, Sync

WORKSPACE = "workspace"


def _act(name: str):
    def matches(c: Completion) -> bool:
        return c.output.get("act") == name

    return matches


def _carry(act: str, concept: str, action: str, *arguments: str):
    def then(c: Completion, _: States) -> list[Invocation]:
        if c.output.get("act") != act:
            return []
        return [
            Invocation(
                concept, action, {a: c.output[a] for a in arguments if a in c.output}
            )
        ]

    return then


def _a_person_focuses_a_surface(c: Completion, _: States) -> list[Invocation]:
    if c.output.get("act") != "focus":
        return []
    return [
        Invocation(
            "Moding", "focus", {"workspace": WORKSPACE, "surface": c.output["surface"]}
        )
    ]


rules = [
    Sync(
        "APersonStartsASpecification",
        ("Copiloting", "gesture"),
        _carry("start", "Specifying", "start", "spec"),
    ),
    Sync(
        "APersonStatesARequirement",
        ("Copiloting", "gesture"),
        _carry("require", "Specifying", "require", "spec", "variable", "option"),
    ),
    Sync(
        "APersonPrefersAnOption",
        ("Copiloting", "gesture"),
        _carry("prefer", "Specifying", "prefer", "spec", "variable", "option"),
    ),
    Sync(
        "APersonWithdrawsARequirement",
        ("Copiloting", "gesture"),
        _carry("withdraw", "Specifying", "withdraw", "spec", "variable"),
    ),
    Sync(
        "APersonDiscardsTheSpecification",
        ("Copiloting", "gesture"),
        _carry("discard", "Specifying", "discard", "spec"),
    ),
    Sync(
        "APersonAnswersAQuestion",
        ("Copiloting", "gesture"),
        _carry("choose", "Deciding", "choose", "request", "option"),
    ),
    Sync(
        "APersonDeclinesToAnswer",
        ("Copiloting", "gesture"),
        _carry("decline", "Deciding", "decline", "request"),
    ),
    Sync(
        "APersonFocusesASurface", ("Copiloting", "gesture"), _a_person_focuses_a_surface
    ),
]
