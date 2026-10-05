"""Named readings over exposed concept state, shared by the rules and the read side.

Each is a calculation a `where` clause would write over the relations a
concept exposes (WYSIWID §5.5, §6.4), named once because more than one rule,
and the canvas view, need the same reading.  None is a method of a concept:
the concepts expose their state and nothing else, and a record assembled from
their relations is the reader's business, not theirs.  The definitions are in
the sync notes: *a party's profile* and *the terms on a basis* in
`docs/syncs/gestures.md`, and *the pending questions*, *held for a reason*
and *awaits an answer* in `docs/syncs/conduct.md`.  The last is read by the
canvas, the chat and the model's tool, and by no rule: no rule reads
`Conversing`.

`fresh` is the one thing here that is not a reading: it is what *bind a fresh
identity* means in a `where`.  Replay applies each recorded input again and
fires no rule, so an identity drawn at random is drawn once.

Each takes the concept's exposed state, as `States[...].state()` or
`Engine.state(...)` returns it, and reads nothing else.
"""

from __future__ import annotations

import uuid
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
            {
                "upon": stipulating["upon"][stage],
                "event": stipulating["event"].get(stage),
                "share": stipulating["share"][stage],
            }
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


def asked(
    conversing: dict[str, Any],
    deciding: dict[str, Any],
    request: Any,
    asked_again: set[str] = frozenset(),
) -> dict[str, Any] | None:
    """The question the model last put about a request, and where it stands.

    `status` is `awaiting` while the question awaits an answer, as Conduct
    defines it, and otherwise says what ended the wait: `chosen`, `declined`,
    `withdrawn` (the matter went another way), `overtaken` (a later conflict
    displaced the options it was put with, or asked the same again),
    `replied` (the person answered in words, and the matter is still open) or
    `passed` (the person said something else, and it is still open).  None when the model never
    asked.

    `asked_again` is the log's part of the reading: the utterances the
    request was asked of `Deciding` again after.  The caller reads it from
    the log, because a request asked again with the same options leaves no
    trace in the state.
    """
    about = conversing["about"]
    put = None
    for utterance in conversing["utterances"]:
        matter = about.get(utterance)
        if (
            conversing["by"].get(utterance) == "model"
            and isinstance(matter, dict)
            and matter.get("request") == request
        ):
            put = utterance
    if put is None:
        return None
    matter = about[put]
    later = conversing["utterances"][conversing["utterances"].index(put) + 1 :]
    replies = [
        {"utterance": u, "text": conversing["text"][u]}
        for u in later
        if conversing["by"].get(u) == "person" and about.get(u) == matter
    ]
    moved_on = any(
        conversing["by"].get(u) == "person" and about.get(u) != matter for u in later
    )
    key = next((k for k, r in deciding["request"].items() if r == request), None)
    if key is not None and key in deciding["chosen"]:
        status = "chosen"
    elif key is not None and key in deciding["declined"]:
        status = "declined"
    elif key is None or key not in deciding["offered"]:
        status = "withdrawn"
    elif deciding["offered"][key] != matter.get("offered") or put in asked_again:
        status = "overtaken"
    elif replies:
        status = "replied"
    elif moved_on:
        status = "passed"
    else:
        status = "awaiting"
    return {
        "utterance": put,
        "text": conversing["text"][put],
        "about": matter,
        "replies": replies,
        "status": status,
        "chosen": deciding["chosen"].get(key) if key is not None else None,
    }


def fresh(prefix: str) -> str:
    """A fresh identity: `bind a fresh identity as ?x`."""
    return f"{prefix}{uuid.uuid4().hex[:8]}"


def held_for_reason(
    asserting: dict[str, Any],
    binding: dict[str, Any],
    specifying: dict[str, Any],
    spec: str,
    variable: str,
) -> bool:
    """`?v is held for a reason in ?s`: a clause the person stated rests on the
    value asserted of it.

    `Asserting: { ?s asserted: ?v -> ?x }`, a current choice of the spec's
    selection whose value is `?x` and which answers `?c`, and
    `Specifying: { ?c statedBy: person }`.
    """
    value = asserting["asserted"].get(spec, {}).get(variable)
    if value is None:
        return False
    selection = next((s for s, of in binding["for"].items() if of == spec), None)
    if selection is None:
        return False
    return any(
        binding["value"][choice] == value
        and specifying["statedBy"].get(binding["answers"][choice]) == "person"
        for choice in binding["choices"].get(selection, [])
    )


def reasons(
    asserting: dict[str, Any],
    binding: dict[str, Any],
    specifying: dict[str, Any],
    spec: str,
) -> dict[str, list[str]]:
    """For each variable held for a reason, the clauses the person stated that
    rest on its value, for the canvas to mark it with."""
    asserted = asserting["asserted"].get(spec, {})
    selection = next((s for s, of in binding["for"].items() if of == spec), None)
    if selection is None:
        return {}
    by_value = {value: variable for variable, value in asserted.items()}
    out: dict[str, list[str]] = {}
    for choice in binding["choices"].get(selection, []):
        clause = binding["answers"][choice]
        variable = by_value.get(binding["value"][choice])
        if variable is not None and specifying["statedBy"].get(clause) == "person":
            out.setdefault(variable, []).append(clause)
    return out
