"""Handover — `docs/syncs/handover.md`.

How a specification is put into the seller's hands.  Two rules, one action,
and the same `then` down to the parties: a handover goes from the person
whoever performed it, because the specification is the person's and the
seller is the only party here it can go to.  What tells the two apart is the
provenance edge, which the canvas reads.

The model's permission is unconditional, and the condition is the person's:
asked for someone at the seller, the assistant hands over in that turn.
There is no state a rule could read that says the person asked, so the
permission is not gated.  When the assistant *offers* a handover unasked is
not a rule at all — it is a read the suggestion strip makes (`views.py`,
`beyond`) and a sentence in the prompt.

What is absent is the enforcement.  No rule here carries anything to
`HandingOver/receive`: the seller is a party and not an actor, with no
surface of their own, so a handover is a record the person can see and
link to until a seller's surface performs the receipt under a rule of its
own.  And `to` is a constant: nothing hands over to anyone but the seller.
"""

from __future__ import annotations

from engine import Completion, Invocation, States, Sync

from .gestures import PERSON, SELLER


def _send(c: Completion) -> list[Invocation]:
    return [
        Invocation(
            "HandingOver",
            "send",
            {
                "item": c.output["spec"],
                "from": PERSON,
                "to": SELLER,
                "reason": c.output.get("reason", ""),
            },
        )
    ]


def _a_person_hands_over(c: Completion, _: States) -> list[Invocation]:
    if c.output.get("act") != "handover":
        return []
    return _send(c)


def _the_model_may_hand_over(c: Completion, _: States) -> list[Invocation]:
    if c.output.get("tool") != "handover":
        return []
    return _send(c)


rules = [
    Sync("APersonHandsOver", ("Copiloting", "gesture"), _a_person_hands_over),
    Sync("TheModelMayHandOver", ("Copiloting", "invoke"), _the_model_may_hand_over),
]
