"""Reading — `docs/syncs/reading.md`.

How a source becomes requirements.  A person files a document beside what
they said; the model reads a requirement from either and records the reading
with its source; a rule states the reading as a clause, and another proposes
the catalogue option the model took to answer it, from where the chain in
`binding.py` asserts it and hands it to the solver.

Nothing here waits for the person.  The gate the case's `Suggesting`
supplies is, in this composition, visibility and reversibility: every clause
the model reads is stated by it and cited to its source, and the person
strikes, re-answers, withdraws or keeps it.  The gated form is the same rules
with one trigger moved, and the note says where.

A reading stated as a requirement is one individual in two concepts: the
clause's identity is the item's (`docs/syncs/reading.md`, "A reading becomes
a clause, and its answer a choice").
"""

from __future__ import annotations

import re
import unicodedata
from typing import Any

from engine import Completion, Invocation, States, Sync

from . import readings
from .binding import _selection_for, _variable_offering
from .gestures import PERSON

MODEL = "model"


def _held(states: States, spec: str, variable: str) -> bool:
    """`?v is held for a reason in ?s`."""
    return readings.held_for_reason(
        states["Asserting"].state(),
        states["Binding"].state(),
        states["Specifying"].state(),
        spec,
        variable,
    )


def _a_person_files_a_document(c: Completion, _: States) -> list[Invocation]:
    if c.output.get("act") != "file":
        return []
    return [
        Invocation(
            "Filing",
            "file",
            {
                "party": PERSON,
                "name": c.output.get("name", ""),
                "text": c.output.get("text", ""),
            },
        )
    ]


_PLAIN = str.maketrans(
    {
        "\u2018": "'", "\u2019": "'", "\u201a": "'", "\u201b": "'",
        "\u201c": '"', "\u201d": '"', "\u201e": '"', "\u201f": '"',
        "\u2010": "-", "\u2011": "-", "\u2012": "-", "\u2013": "-",
        "\u2014": "-", "\u2015": "-", "\u2212": "-", "\u00ad": "",
    }
)


def _normalised(text: str, rejoin: bool = False) -> str:
    """What extraction and typing do to text, forgiven and nothing else:
    compatibility forms folded, curly quotes and dashes made plain, every run
    of whitespace one space, case ignored.  A hyphen at a line break is kept
    as a hyphen, or with `rejoin` taken as a word broken across the line."""
    text = unicodedata.normalize("NFKC", text).translate(_PLAIN)
    if rejoin:
        text = re.sub(r"(\w)-[ \t]*\r?\n\s*(\w)", r"\1\2", text)
    else:
        text = re.sub(r"(\w)-[ \t]*\r?\n\s*(\w)", r"\1-\2", text)
    return re.sub(r"\s+", " ", text).strip().casefold()


def _occurs_in(words: str, text: str) -> bool:
    """`?w occurs in ?t` — one unbroken passage of the text, once both are
    normalised.  Cut short at either end, never in the middle."""
    passage = _normalised(words)
    return bool(passage) and any(
        passage in _normalised(text, rejoin) for rejoin in (False, True)
    )


def _named_twice(states: States, answer: list[Any]) -> list[str]:
    """The variables an answer names more than one option for, read from
    `Cataloguing`: `?a names at most one option per variable` fails on them."""
    seen: dict[str, Any] = {}
    twice: list[str] = []
    for option in dict.fromkeys(answer):
        variable = _variable_offering(states, option)
        if variable is None:
            continue
        if variable in seen and variable not in twice:
            twice.append(variable)
        seen[variable] = option
    return twice


def _the_model_may_read_a_requirement(c: Completion, states: States) -> list[Invocation]:
    """One rule, two triggers, on the shape of the source.  A call naming
    neither a file nor an utterance reads nothing: there is no source to
    check it against.  Nor does one whose words the source does not bear
    out — `Filing: { ?f text: ?t }` or `Conversing: { ?u text: ?t }`, and
    `?w occurs in ?t` — or whose answer names two options on one variable.
    An utterance said about something, a reply to a question, is not a
    source: `Conversing: { ?u about: _ }` does not bind."""
    if c.output.get("tool") != "read":
        return []
    words = c.output.get("words", "")
    if c.output.get("file"):
        source: dict[str, Any] = {"file": c.output["file"]}
        text = states["Filing"].state()["text"].get(c.output["file"])
    elif c.output.get("utterance"):
        source = {"utterance": c.output["utterance"]}
        conversing = states["Conversing"].state()
        if c.output["utterance"] in conversing["about"]:
            return []
        text = conversing["text"].get(c.output["utterance"])
    else:
        return []
    if text is None or not _occurs_in(words, text):
        return []
    if _named_twice(states, c.output.get("answer") or []):
        return []
    return [
        Invocation(
            "Reading",
            "read",
            {
                "source": source,
                "words": words,
                "answer": list(c.output.get("answer") or []),
                "item": readings.fresh("r"),
            },
        )
    ]


def _a_read_item_becomes_a_clause(c: Completion, states: States) -> list[Invocation]:
    """`Specifying: { ?s in open }` — the one open specification.  The clause
    is the item."""
    if c.failed:
        return []
    return [
        Invocation(
            "Specifying",
            "require",
            {
                "spec": spec,
                "party": MODEL,
                "text": c.output["words"],
                "clause": c.output["item"],
            },
        )
        for spec in states["Specifying"].state()["open"]
    ]


def _a_read_answer_is_proposed(c: Completion, states: States) -> list[Invocation]:
    """`Reading: { ?c answer: ?a* }` — the clause is the item, so its answer is
    read under its own identity.  An option the catalogue does not offer binds
    no variable and is not proposed; nor is one whose variable is held for a
    reason, which leaves the clause unanswered for the person.
    """
    if c.failed or c.input.get("party") != MODEL:
        return []
    spec, clause = c.output["spec"], c.output["clause"]
    selection = _selection_for(states, spec)
    if selection is None:
        return []
    answer = states["Reading"].state()["answer"].get(clause, [])
    out = []
    for option in answer:
        variable = _variable_offering(states, option)
        if variable is None or _held(states, spec, variable):
            continue
        out.append(
            Invocation(
                "Binding",
                "propose",
                {
                    "party": MODEL,
                    "selection": selection,
                    "requirement": clause,
                    "value": option,
                    "choice": readings.fresh("ch"),
                },
            )
        )
    return out


def _a_person_keeps_a_reading(c: Completion, _: States) -> list[Invocation]:
    if c.output.get("act") != "keep":
        return []
    return [Invocation("Specifying", "adopt", {"clause": c.output.get("clause"), "party": PERSON})]


def _a_reworded_reading_is_kept(c: Completion, states: States) -> list[Invocation]:
    """`Specifying: { ?c statedBy: model }`.  Only the person rewords, so no
    actor is needed in the `when`."""
    if c.failed:
        return []
    clause = c.output["clause"]
    if states["Specifying"].state()["statedBy"].get(clause) != MODEL:
        return []
    return [Invocation("Specifying", "adopt", {"clause": clause, "party": PERSON})]


rules = [
    Sync("APersonFilesADocument", ("Copiloting", "gesture"), _a_person_files_a_document),
    Sync(
        "TheModelMayReadARequirement",
        ("Copiloting", "invoke"),
        _the_model_may_read_a_requirement,
    ),
    Sync("AReadItemBecomesAClause", ("Reading", "read"), _a_read_item_becomes_a_clause),
    Sync("AReadAnswerIsProposed", ("Specifying", "require"), _a_read_answer_is_proposed),
    Sync("APersonKeepsAReading", ("Copiloting", "gesture"), _a_person_keeps_a_reading),
    Sync("ARewordedReadingIsKept", ("Specifying", "reword"), _a_reworded_reading_is_kept),
]
