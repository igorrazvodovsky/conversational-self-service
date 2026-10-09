"""Reading — `docs/syncs/reading.md`.

How a source becomes requirements.  A person files a document beside what
they said; the model reads a requirement from either and records the reading
with its source; a rule states the reading as a clause, and another proposes
the catalogue option the model took to answer it, from where the chain in
`binding.py` asserts it and hands it to the solver.  A quantity the model
read is worked out by the catalogue's methods, and the option whose range
contains the result is proposed the same way.

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


def _enough(
    deriving: dict[str, Any], method: str, states: dict[str, Any], pool: dict[str, Any]
) -> bool:
    """`?m is enough for ?stated, and needs a quantity ?q states`: every
    quantity the method needs is in the pool or presumed, and at least one
    is among those this reading states."""
    needs = deriving["needs"][method]
    presumes = deriving["presumes"][method]
    return any(q in states for q in needs) and all(
        q in pool or q in presumes for q in needs
    )


def worked_out_by(
    deriving: dict[str, Any], states: dict[str, Any], pool: dict[str, Any] | None = None
) -> dict[str, str]:
    """For each quantity the reading's states can be worked out into, the
    first method yielding it that the pool is enough for, in the catalogue's
    order.  The pool is the situation's givens, which include what the
    reading states once recorded; before that, the states themselves."""
    chosen: dict[str, str] = {}
    if not states:
        return chosen
    pool = {**states, **(pool or {})} if pool is not None else states
    for method in deriving["methods"]:
        yields = deriving["yields"][method]
        if yields not in chosen and _enough(deriving, method, states, pool):
            chosen[yields] = method
    return chosen


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
    answer = list(c.output.get("answer") or [])
    if _named_twice(states, answer):
        return []
    # `?q names only quantities some method in Deriving needs`, and `?a names
    # no option of a variable ?q is worked out into`.
    stated = dict(c.output.get("states") or {})
    deriving = states["Deriving"].state()
    needed = {q for needs in deriving["needs"].values() for q in needs}
    if any(q not in needed for q in stated):
        return []
    spec = next(iter(states["Specifying"].state()["open"]), None)
    gives = (
        readings.situation_gives(states["Situating"].state(), deriving, spec)
        if spec is not None
        else {}
    )
    into = worked_out_by(deriving, stated, gives)
    if any(_variable_offering(states, option) in into for option in answer):
        return []
    return [
        Invocation(
            "Reading",
            "read",
            {
                "source": source,
                "words": words,
                "answer": answer,
                "states": stated,
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


def _given(states: States, spec: str, variable: str) -> bool:
    """`?v is given by the person in ?s`."""
    return readings.given_by_person(states["Situating"].state(), spec, variable)


def _a_read_answer_is_proposed(c: Completion, states: States) -> list[Invocation]:
    """`Reading: { ?c answer: ?a* }` — the clause is the item, so its answer is
    read under its own identity.  An option the catalogue does not offer binds
    no variable and is not proposed; nor is one whose variable is held for a
    reason or is a fact of the situation the person gave, which leaves the
    clause unanswered for the person.
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
        if variable is None or _held(states, spec, variable) or _given(states, spec, variable):
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


def _a_read_quantity_is_worked_out(c: Completion, states: States) -> list[Invocation]:
    """`Reading: { ?c states: ?q }`, `?stated maps each quantity ?s gives to
    its value`, and for each quantity the first method yielding it that
    ?stated is enough for and that needs a quantity ?q states.  The givens
    were recorded before the clause was stated (`situating.py`)."""
    if c.failed or c.input.get("party") != MODEL:
        return []
    clause, spec = c.output["clause"], c.output["spec"]
    states_ = states["Reading"].state()["states"].get(clause) or {}
    deriving = states["Deriving"].state()
    gives = readings.situation_gives(states["Situating"].state(), deriving, spec)
    into = worked_out_by(deriving, states_, gives)
    return [
        Invocation(
            "Deriving",
            "derive",
            {
                "method": method,
                "for": clause,
                "stated": dict(gives),
                "derivation": readings.fresh("d"),
            },
        )
        for method in into.values()
    ]


def _a_worked_out_quantity_is_proposed(c: Completion, states: States) -> list[Invocation]:
    """`Specifying: { ?s clauses: ?c }`, `Binding: { ?sel for: ?s }`, and the
    option of the variable the method yields whose range contains the
    result: `?n in ?r` is more than `above` and at most `upTo`.  A result no
    range contains proposes nothing; nor does a variable held for a reason
    or given by the person, nor a clause a choice already answers on that
    variable, which is the marked answer a survey's derivation stands
    beside."""
    if c.failed:
        return []
    clause, variable, result = c.output["for"], c.output["yields"], c.output["result"]
    spec = next(
        (s for s, clauses in states["Specifying"].state()["clauses"].items() if clause in clauses),
        None,
    )
    if spec is None:
        return []
    selection = _selection_for(states, spec)
    if selection is None or _held(states, spec, variable) or _given(states, spec, variable):
        return []
    cataloguing = states["Cataloguing"].state()
    binding = states["Binding"].state()
    if any(
        binding["answers"][ch] == clause
        and binding["value"][ch] in cataloguing["offers"].get(variable, [])
        for ch in binding["choices"].get(selection, [])
    ):
        return []
    for option in cataloguing["offers"].get(variable, []):
        covers = cataloguing["covers"].get(option)
        if covers and covers[0] < result <= covers[1]:
            return [
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
            ]
    return []


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
    Sync(
        "AReadQuantityIsWorkedOut", ("Specifying", "require"), _a_read_quantity_is_worked_out
    ),
    Sync(
        "AWorkedOutQuantityIsProposed", ("Deriving", "derive"), _a_worked_out_quantity_is_proposed
    ),
    Sync("APersonKeepsAReading", ("Copiloting", "gesture"), _a_person_keeps_a_reading),
    Sync("ARewordedReadingIsKept", ("Specifying", "reword"), _a_reworded_reading_is_kept),
]
