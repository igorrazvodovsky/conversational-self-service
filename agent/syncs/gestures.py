"""Gestures — `docs/syncs/gestures.md`.

What a person may do. Every one of these is a permission, stated positively,
in exactly the form the model's permissions take in `conduct.py`. The list is
deliberately readable side by side with that one: the difference between them
is the whole of what the model may not do.
"""

from __future__ import annotations

from typing import Any

from engine import Completion, Invocation, States, Sync

WORKSPACE = "workspace"

# The party a gesture is made by.  It is stated in the `then` clause rather
# than read off the completion's actor, because `Asserting/assert` takes a
# party as an argument and a rule that says who is asserting is the readable
# form of that — the case's `ApplyMapping` names `interpreter` the same way.
PERSON = "person"


def _carry(act: str, concept: str, action: str, *arguments: str, **fixed: Any):
    def then(c: Completion, _: States) -> list[Invocation]:
        if c.output.get("act") != act:
            return []
        input: dict[str, Any] = {a: c.output[a] for a in arguments if a in c.output}
        input.update(fixed)
        return [Invocation(concept, action, input)]

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
        _carry("start", "Asserting", "start", "spec"),
    ),
    Sync(
        "APersonSays",
        ("Copiloting", "gesture"),
        _carry("say", "Conversing", "say", "text", party=PERSON),
    ),
    Sync(
        "APersonAssertsAValue",
        ("Copiloting", "gesture"),
        _carry(
            "assert", "Asserting", "assert", "spec", "variable", "option", party=PERSON
        ),
    ),
    Sync(
        "APersonWithdrawsAnAssertion",
        ("Copiloting", "gesture"),
        _carry("withdraw", "Asserting", "withdraw", "spec", "variable"),
    ),
    Sync(
        "APersonDiscardsTheSpecification",
        ("Copiloting", "gesture"),
        _carry("discard", "Asserting", "discard", "spec"),
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
