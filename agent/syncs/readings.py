"""Named readings over exposed concept state, shared by the rules and the read side.

Each is a calculation a `where` clause would write over the relations a
concept exposes (WYSIWID §5.5, §6.4), named once because more than one rule,
and the canvas view, need the same reading.  None is a method of a concept:
the concepts expose their state and nothing else, and a record assembled from
their relations is the reader's business, not theirs.  The definitions are in
the sync notes: *a party's profile* and *the terms on a basis* in
`docs/syncs/gestures.md`, *the pending questions* in `docs/syncs/conduct.md`.

Each takes the concept's exposed state, as `States[...].state()` or
`Engine.state(...)` returns it, and reads nothing else.
"""

from __future__ import annotations

from typing import Any


def profile(profiling: dict[str, Any], party: str) -> dict[str, str]:
    """A party's profile: every detail recorded for it, leaving out those never given."""
    return {
        detail: by_party[party]
        for detail, by_party in profiling.items()
        if by_party.get(party)
    }


def terms(stipulating: dict[str, Any], basis: str) -> dict[str, Any]:
    """The terms on a basis: everything stipulated on it, as one record."""
    clauses: dict[str, list[str]] = {}
    for clause in stipulating["clauses"].get(basis, []):
        clauses.setdefault(stipulating["section"][clause], []).append(
            stipulating["text"][clause]
        )
    return {
        "validity": stipulating["validity"].get(basis, 0),
        "warranty": stipulating["warranty"].get(basis, 0),
        "approval": stipulating["approval"].get(basis, 0),
        "installation": stipulating["installation"].get(basis, 0),
        "byOthers": list(stipulating["byOthers"].get(basis, [])),
        "stages": [
            {"upon": stipulating["upon"][stage], "share": stipulating["share"][stage]}
            for stage in stipulating["stages"].get(basis, [])
        ],
        "clauses": clauses,
    }


def pending(deciding: dict[str, Any]) -> list[dict[str, Any]]:
    """The pending questions: every request offered and neither chosen nor declined."""
    declined = set(deciding["declined"])
    return [
        {
            "request": deciding["request"][key],
            "reason": deciding["reason"].get(key, ""),
            "options": list(options),
        }
        for key, options in deciding["offered"].items()
        if key not in deciding["chosen"] and key not in declined
    ]
