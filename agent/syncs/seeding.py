"""Seeding — `docs/syncs/seeding.md`.

Only the range is carried by a rule.  Prices and carbon figures are invoked
directly by the wiring, because they do not follow from an option being listed:
an option can be listed with no price, and a price can change without the
catalogue changing.  Putting `Pricing/list` behind `Cataloguing/list` would have
required the latter to carry an amount, which is the option record reassembled.
"""

from __future__ import annotations

from engine import Completion, Invocation, States, Sync


def _seeds_the_solver(c: Completion, _: States) -> list[Invocation]:
    if c.failed:
        return []
    return [
        Invocation(
            "Constraining",
            "offer",
            {"variable": c.output["variable"], "option": c.output["option"]},
        )
    ]


def _leaves_the_solver(c: Completion, _: States) -> list[Invocation]:
    if c.failed:
        return []
    return [
        Invocation(
            "Constraining",
            "withhold",
            {"variable": c.output["variable"], "option": c.output["option"]},
        )
    ]


rules = [
    Sync("TheCatalogueSeedsTheSolver", ("Cataloguing", "list"), _seeds_the_solver),
    Sync("ADelistedOptionLeavesTheSolver", ("Cataloguing", "delist"), _leaves_the_solver),
]
