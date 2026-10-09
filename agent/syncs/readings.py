"""Named readings over exposed concept state, shared by the rules and the read side.

Each is a calculation a `where` clause would write over the relations a
concept exposes (WYSIWID §5.5, §6.4), named once because more than one rule,
and the canvas view, need the same reading.  None is a method of a concept:
the concepts expose their state and nothing else, and a record assembled from
their relations is the reader's business, not theirs.  The definitions are in
the sync notes: *a party's profile* and *the terms on a basis* in
`docs/syncs/gestures.md`, and *the pending questions*, *held for a reason*
and *awaits an answer*, for a conflict and for the quote's addressee, in
`docs/syncs/conduct.md`.  The last is read by the
canvas, the chat and the model's tool, and by no rule: no rule reads
`Conversing`.

*The requirements of a specification* and *the grounds of an assignment*
are in `docs/syncs/gestures.md` too: the rule that issues a quote freezes
them into it, and the quote surface reads them live to compare an offer
with the specification as it stands.

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


def terms(
    stipulating: dict[str, Any], basis: str, holding: list[str]
) -> dict[str, Any]:
    """The terms on a basis: everything stipulated on it, as one record, with
    the clauses that hold (Stipulating's `terms`) under their sections."""
    clauses: dict[str, list[str]] = {}
    for clause in holding:
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



def requires(
    specifying: dict[str, Any], binding: dict[str, Any], spec: str
) -> list[dict[str, Any]]:
    """The requirements of a specification: each clause, in order, with the
    values that answer it."""
    selection = next((s for s, of in binding["for"].items() if of == spec), None)
    choices = binding["choices"].get(selection, []) if selection else []
    return [
        {
            "clause": clause,
            "text": specifying["text"][clause],
            "negotiability": specifying["negotiability"][clause],
            "answeredBy": [
                binding["value"][ch] for ch in choices if binding["answers"][ch] == clause
            ],
        }
        for clause in specifying["clauses"].get(spec, [])
    ]


def grounds(
    constraining: dict[str, Any],
    asserting: dict[str, Any],
    pricing: dict[str, Any],
    spec: str,
    holds: dict[str, str],
) -> dict[str, dict[str, Any]]:
    """The grounds of an assignment in a specification: for each value,
    whether it was asserted, gave way or follows, by whom, the rules that
    force it with their reasons, the assertions it rests on, and its line
    prices."""
    asserted = asserting["asserted"].get(spec, {})
    by = asserting["assertedBy"].get(spec, {})
    owing = constraining["owing"].get(spec, {})
    following = constraining["following"].get(spec, {})
    because = constraining["because"]
    out: dict[str, dict[str, Any]] = {}
    for variable, option in holds.items():
        asked = asserted.get(variable)
        out[variable] = {
            "standing": (
                "follows" if asked is None else "asked" if asked == option else "yielded"
            ),
            **({"asked": asked} if asked is not None and asked != option else {}),
            **({"party": by[variable]} if asked is not None and variable in by else {}),
            "owing": [
                {"rule": rule, "because": because.get(rule, rule)}
                for rule in owing.get(variable, [])
            ],
            "following": list(following.get(variable, [])),
            "capital": pricing["capital"].get(option, 0),
            "monthly": pricing["monthly"].get(option, 0),
        }
    return out

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
    chosen_since: dict[str, Any] | None = None,
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
    trace in the state.  `chosen_since` is the other part: for an utterance,
    the option chosen for the request after it, which a re-ask in the same
    flow discards from `Deciding` while the question it answered stands
    answered.
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
    chosen = deciding["chosen"].get(key) if key is not None else None
    if chosen is None and put in (chosen_since or {}):
        chosen = (chosen_since or {})[put]
    if chosen is not None:
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
        "chosen": chosen,
    }


def asked_for_addressee(
    conversing: dict[str, Any], spec: str, lacking: list[str] | None
) -> dict[str, Any] | None:
    """The question the model last put about who a quote is for, and where
    it stands: Conduct's *awaits an answer* for a matter `[ spec: ?s ;
    missing: ?f ]`.  `lacking` is what the specification lacks for a quote
    now, as `gestures.unaddressed` reads it, which the caller passes because
    that reading is the rules'.

    `status` is `awaiting` while the specification lacks only some of `?f`
    and nobody has spoken since; otherwise `recorded` (nothing of `?f` is
    missing any more), `withdrawn` (it lacks something else as well),
    `replied` or `passed`, as for a conflict.  None when the model never
    asked.
    """
    about = conversing["about"]
    put = None
    for utterance in conversing["utterances"]:
        matter = about.get(utterance)
        if (
            conversing["by"].get(utterance) == "model"
            and isinstance(matter, dict)
            and matter.get("spec") == spec
            and "missing" in matter
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
    if lacking == []:
        status = "recorded"
    elif lacking is None or not set(lacking) <= set(matter["missing"]):
        status = "withdrawn"
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
        "lacking": lacking or [],
    }


def fresh(prefix: str) -> str:
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


def wanting(stepping: dict[str, Any], standing: dict[str, str], spec: str) -> dict[str, list[str]]:
    """`?step wants ?n`: of a step's needs, the variables that stand open,
    with nothing asserted and nothing following.  `standing` is each
    variable's standing as the canvas reads it off `Asserting` and
    `Constraining`; a value the rules force or a method worked out is
    never wanting, because it stands before anyone could ask for it.
    Read by the canvas and the model alike (`docs/syncs/stepping.md`)."""
    return {
        step: [n for n in stepping["needs"].get(step, []) if standing.get(n) == "open"]
        for step in stepping["steps"].get(spec, [])
    }


def given_of(situating: dict[str, Any], spec: str, fact: str) -> str | None:
    """`Situating: { ?g in givens of ?s ; ?g of: ?f }`: the situation's given
    of the fact, or none."""
    return next(
        (g for g in situating["givens"].get(spec, []) if situating["of"].get(g) == fact),
        None,
    )


def given_by_person(situating: dict[str, Any], spec: str, fact: str) -> bool:
    """`?v is given by the person in ?s`: a given of the fact in the situation,
    recorded by the person (`docs/syncs/situating.md`)."""
    given = given_of(situating, spec, fact)
    return given is not None and situating["recordedBy"].get(given) == "person"


def situation_gives(
    situating: dict[str, Any], deriving: dict[str, Any], spec: str
) -> dict[str, Any]:
    """`?stated maps each quantity ?s gives to its value`: the givens of the
    situation whose fact is a quantity some method needs."""
    needed = {q for needs in deriving["needs"].values() for q in needs}
    return {
        situating["of"][g]: situating["is"][g]
        for g in situating["givens"].get(spec, [])
        if situating["of"].get(g) in needed
    }


def situation_open(
    situating: dict[str, Any], cataloguing: dict[str, Any], spec: str
) -> list[str]:
    """The facts of the situation that Cataloguing offers options for and
    nobody has given, in the catalogue's order."""
    given = {situating["of"][g] for g in situating["givens"].get(spec, [])}
    return [f for f in situating["facts"] if f in cataloguing["offers"] and f not in given]
