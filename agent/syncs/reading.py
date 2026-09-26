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


def _the_model_may_read_a_requirement(c: Completion, _: States) -> list[Invocation]:
    """One rule, two triggers, on the shape of the source.  A call naming
    neither a file nor an utterance reads nothing: there is no source to
    check it against."""
    if c.output.get("tool") != "read":
        return []
    if c.output.get("file"):
        source: dict[str, Any] = {"file": c.output["file"]}
    elif c.output.get("utterance"):
        source = {"utterance": c.output["utterance"]}
    else:
        return []
    return [
        Invocation(
            "Reading",
            "read",
            {
                "source": source,
                "words": c.output.get("words", ""),
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
