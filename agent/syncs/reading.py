"""Reading — `docs/syncs/reading.md`.

How a source becomes requirements.  A person files a document beside what
they said; the model reads a requirement from either and records the reading
with its source; a rule states the reading as a clause, and another proposes
the catalogue option the model took to answer it, from where the chain in
`binding.py` asserts it and hands it to the solver.

Nothing here waits for the person.  The gate the case's `Suggesting`
supplies is, in this composition, visibility and reversibility: every clause
the model reads is stated by it and cited to its source, and the person
strikes, re-answers or withdraws.  The gated form is the same rules with one
trigger moved, and the note says where.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Any

from engine import Completion, Invocation, States, Sync

from .binding import _selection_for, _variable_offering
from .gestures import PERSON

MODEL = "model"


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


def _the_model_may_read_a_requirement(c: Completion, states: States) -> list[Invocation]:
    """One rule, two triggers, on the shape of the source.  A call naming
    neither a file nor an utterance reads nothing: there is no source to
    check it against.  Nor does one whose words the source does not bear
    out — `Filing: { ?f text: ?t }` or `Conversing: { ?u text: ?t }`, and
    `?w occurs in ?t`."""
    if c.output.get("tool") != "read":
        return []
    words = c.output.get("words", "")
    if c.output.get("file"):
        source: dict[str, Any] = {"file": c.output["file"]}
        text = states["Filing"].state()["text"].get(c.output["file"])
    elif c.output.get("utterance"):
        source = {"utterance": c.output["utterance"]}
        text = states["Conversing"].state()["text"].get(c.output["utterance"])
    else:
        return []
    if text is None or not _occurs_in(words, text):
        return []
    return [
        Invocation(
            "Reading",
            "read",
            {
                "source": source,
                "words": words,
                "answer": list(c.output.get("answer") or []),
            },
        )
    ]


def _a_read_item_becomes_a_clause(c: Completion, states: States) -> list[Invocation]:
    """`Specifying: { ?s in open }` — the one open specification."""
    if c.failed:
        return []
    return [
        Invocation(
            "Specifying",
            "require",
            {"spec": spec, "party": MODEL, "text": c.output["words"]},
        )
        for spec in states["Specifying"].state()["open"]
    ]


def _a_read_answer_is_proposed(c: Completion, states: States) -> list[Invocation]:
    """The item most recently heard whose words are the clause's text.

    The `require` was invoked by the rule on the `read`, inside one atomic
    root action, so that item is at this moment the one — the note says why
    this stands in for a conjunction of the two completions.  An option the
    catalogue does not offer binds no variable and is not proposed.
    """
    if c.failed or c.input.get("party") != MODEL:
        return []
    spec, clause, text = c.output["spec"], c.output["clause"], c.input.get("text", "")
    selection = _selection_for(states, spec)
    if selection is None:
        return []
    reading = states["Reading"].state()
    item = next(
        (i for i in reversed(list(reading["words"])) if reading["words"][i] == text),
        None,
    )
    if item is None:
        return []
    return [
        Invocation(
            "Binding",
            "propose",
            {
                "party": MODEL,
                "selection": selection,
                "requirement": clause,
                "value": option,
            },
        )
        for option in reading["answer"].get(item, [])
        if _variable_offering(states, option) is not None
    ]


rules = [
    Sync("APersonFilesADocument", ("Copiloting", "gesture"), _a_person_files_a_document),
    Sync(
        "TheModelMayReadARequirement",
        ("Copiloting", "invoke"),
        _the_model_may_read_a_requirement,
    ),
    Sync("AReadItemBecomesAClause", ("Reading", "read"), _a_read_item_becomes_a_clause),
    Sync("AReadAnswerIsProposed", ("Specifying", "require"), _a_read_answer_is_proposed),
]
