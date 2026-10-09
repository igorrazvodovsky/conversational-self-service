"""Situating — `docs/syncs/situating.md`.

The facts of the situation the lift must fit, held apart from the
requirement.  A value asserted of a variable the catalogue lists under
`situation` is recorded as a given off the assertion, with the party it
came from; a quantity a reading states is recorded as a given before the
clause is stated; the person vouches for a given by keeping the reading,
surveys one, or drops one.  What rests on a changed given is worked out
again and marked, never replaced.

Registered before the propagation and reading rules, on purpose: the engine
fires rules on one completion in registration order, each cascade to its
end, so the given is on record before the solver's conflict question reads
it and before the clause a reading becomes is worked out.
"""

from __future__ import annotations

from typing import Any

from engine import Completion, Invocation, States, Sync

from . import readings
from .binding import _selection_for
from .gestures import PERSON

MODEL = "model"


def _gives(states: States, spec: str) -> dict[str, Any]:
    return readings.situation_gives(
        states["Situating"].state(), states["Deriving"].state(), spec
    )


def _open_spec(states: States) -> str | None:
    return next(iter(states["Specifying"].state()["open"]), None)


def _an_asserted_fact_is_a_given(c: Completion, states: States) -> list[Invocation]:
    """`Situating: { ?v in facts }`, and no given of ?v already holds ?o: a
    survey's assertion of what it measured records nothing again."""
    if c.failed:
        return []
    spec, variable, option = c.output["spec"], c.output["variable"], c.output["option"]
    situating = states["Situating"].state()
    if variable not in situating["facts"]:
        return []
    given = readings.given_of(situating, spec, variable)
    if given is not None and situating["is"].get(given) == option:
        return []
    return [
        Invocation(
            "Situating",
            "record",
            {
                "situation": spec,
                "party": c.input.get("party", MODEL),
                "fact": variable,
                "value": option,
                "given": readings.fresh("g"),
            },
        )
    ]


def _a_withdrawn_fact_is_struck(c: Completion, states: States) -> list[Invocation]:
    if c.failed:
        return []
    given = readings.given_of(states["Situating"].state(), c.output["spec"], c.output["variable"])
    if given is None:
        return []
    return [Invocation("Situating", "strike", {"given": given})]


def _a_read_quantity_is_a_given(c: Completion, states: States) -> list[Invocation]:
    """`?q maps ?f to ?n ; Situating: { ?f in facts } ; ?f is not given by
    the person in ?s`."""
    if c.failed:
        return []
    spec = _open_spec(states)
    if spec is None:
        return []
    situating = states["Situating"].state()
    return [
        Invocation(
            "Situating",
            "record",
            {
                "situation": spec,
                "party": MODEL,
                "fact": fact,
                "value": value,
                "given": readings.fresh("g"),
            },
        )
        for fact, value in (c.output.get("states") or {}).items()
        if fact in situating["facts"] and not readings.given_by_person(situating, spec, fact)
    ]


def _a_kept_reading_vouches_for_its_givens(
    c: Completion, states: States
) -> list[Invocation]:
    """The facts the reading answered or stated, whose given in the situation
    still holds that value and is the model's, recorded again as the
    person's."""
    if c.failed or c.input.get("party") != PERSON:
        return []
    spec, clause = c.output["spec"], c.output["clause"]
    reading = states["Reading"].state()
    cataloguing = states["Cataloguing"].state()
    situating = states["Situating"].state()
    offering = {o: v for v, os in cataloguing["offers"].items() for o in os}
    held: dict[str, Any] = {
        offering[o]: o for o in reading["answer"].get(clause, []) if o in offering
    }
    held.update(reading["states"].get(clause) or {})
    out = []
    for fact, value in held.items():
        given = readings.given_of(situating, spec, fact)
        if (
            given is None
            or situating["is"].get(given) != value
            or situating["recordedBy"].get(given) != MODEL
        ):
            continue
        out.append(
            Invocation(
                "Situating",
                "record",
                {
                    "situation": spec,
                    "party": PERSON,
                    "fact": fact,
                    "value": value,
                    "given": readings.fresh("g"),
                },
            )
        )
    return out


def _a_person_surveys_a_fact(c: Completion, states: States) -> list[Invocation]:
    """Two blocks on the state: a fact already given is surveyed; one nobody
    has given is recorded and surveyed in one move."""
    if c.output.get("act") != "survey":
        return []
    fact, value = c.output.get("fact"), c.output.get("value")
    spec = _open_spec(states)
    situating = states["Situating"].state()
    if spec is None or fact not in situating["facts"] or value is None:
        return []
    given = readings.given_of(situating, spec, fact)
    if given is not None:
        return [
            Invocation("Situating", "survey", {"party": PERSON, "given": given, "value": value})
        ]
    given = readings.fresh("g")
    return [
        Invocation(
            "Situating",
            "record",
            {"situation": spec, "party": PERSON, "fact": fact, "value": value, "given": given},
        ),
        Invocation("Situating", "survey", {"party": PERSON, "given": given, "value": value}),
    ]


def _a_surveyed_fact_reaches_the_assertions(
    c: Completion, states: States
) -> list[Invocation]:
    """`Cataloguing: { ?v offers: ?o }`, and the solver does not hold it yet."""
    if c.failed:
        return []
    spec, variable, option = c.output["situation"], c.output["fact"], c.output["value"]
    if option not in states["Cataloguing"].state()["offers"].get(variable, []):
        return []
    if states["Asserting"].state()["asserted"].get(spec, {}).get(variable) == option:
        return []
    return [
        Invocation(
            "Asserting",
            "assert",
            {"party": c.output["party"], "spec": spec, "variable": variable, "option": option},
        )
    ]


def _resting(
    states: States, spec: str, fact: str, unless: Any = None
) -> list[tuple[str, str, str]]:
    """`Deriving: { ?d for: ?c ; ?d method: ?m ; ?m needs: ?f ; ?m yields: ?y }`
    with ?c a clause of ?s, leaving out a derivation that used `unless` for
    the fact, stated or assumed: each (clause, method, yields) once.  The
    latest derivation for a clause and quantity is the one that stands."""
    deriving = states["Deriving"].state()
    clauses = set(states["Specifying"].state()["clauses"].get(spec, []))
    latest: dict[tuple[str, str], str] = {}
    for derivation, clause in deriving["for"].items():
        method = deriving["method"][derivation]
        if clause in clauses:
            latest[(clause, deriving["yields"][method])] = derivation
    out: list[tuple[str, str, str]] = []
    for (clause, yields), derivation in latest.items():
        method = deriving["method"][derivation]
        if fact not in deriving["needs"].get(method, []):
            continue
        used = {**deriving["assumed"][derivation], **deriving["stated"][derivation]}.get(fact)
        if unless is not None and used == unless:
            continue
        out.append((clause, method, yields))
    return out


def _a_surveyed_quantity_is_worked_out_again(
    c: Completion, states: States
) -> list[Invocation]:
    """For each clause and quantity a derivation needing the fact yielded,
    where the derivation used another value for it, the first method
    yielding it that the situation's givens are enough for."""
    if c.failed:
        return []
    spec, fact, value = c.output["situation"], c.output["fact"], c.output["value"]
    deriving = states["Deriving"].state()
    gives = _gives(states, spec)
    out = []
    done: set[tuple[str, str]] = set()
    for clause, _, yields in _resting(states, spec, fact, unless=value):
        if (clause, yields) in done:
            continue
        method = next(
            (
                m
                for m in deriving["methods"]
                if deriving["yields"][m] == yields and _enough_over(deriving, m, gives)
            ),
            None,
        )
        if method is None:
            continue
        done.add((clause, yields))
        out.append(
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
        )
    return out


def _enough_over(deriving: dict[str, Any], method: str, gives: dict[str, Any]) -> bool:
    """A method is enough over the situation's givens when every quantity it
    needs is given or presumed, and at least one is given."""
    needs = deriving["needs"][method]
    presumes = deriving["presumes"][method]
    return any(q in gives for q in needs) and all(q in gives or q in presumes for q in needs)


def _a_changed_given_stales_what_rests_on_it(
    c: Completion, states: States
) -> list[Invocation]:
    """One rule, two triggers: a survey whose measurement differs from what
    the derivation used, or a strike.  `Binding: { ?ch answers: ?c ; ?ch
    value: ?o }` with ?o an option of the variable the method yields."""
    if c.failed:
        return []
    spec, fact, given = c.output["situation"], c.output["fact"], c.output["given"]
    unless = c.output.get("value") if c.action == "survey" else None
    selection = _selection_for(states, spec)
    if selection is None:
        return []
    binding = states["Binding"].state()
    offers = states["Cataloguing"].state()["offers"]
    out = []
    flagged: set[str] = set()
    for clause, _, yields in _resting(states, spec, fact, unless=unless):
        for choice in binding["choices"].get(selection, []):
            if choice in flagged or binding["answers"][choice] != clause:
                continue
            if binding["value"][choice] in offers.get(yields, []):
                flagged.add(choice)
                out.append(
                    Invocation(
                        "Staling", "flag", {"item": choice, "basis": {"given": given}}
                    )
                )
    return out


def _a_person_drops_a_given(c: Completion, states: States) -> list[Invocation]:
    """Two blocks: a fact the solver holds is withdrawn, which strikes the
    given by `AWithdrawnFactIsStruck`; a quantity is struck outright."""
    if c.output.get("act") != "drop":
        return []
    given = c.output.get("given")
    situating = states["Situating"].state()
    if given not in situating["of"]:
        return []
    fact = situating["of"][given]
    spec = next(s for s, gs in situating["givens"].items() if given in gs)
    if fact in states["Asserting"].state()["asserted"].get(spec, {}):
        return [Invocation("Asserting", "withdraw", {"spec": spec, "variable": fact})]
    return [Invocation("Situating", "strike", {"given": given})]


rules = [
    Sync("AnAssertedFactIsAGiven", ("Asserting", "assert"), _an_asserted_fact_is_a_given),
    Sync("AWithdrawnFactIsStruck", ("Asserting", "withdraw"), _a_withdrawn_fact_is_struck),
    Sync("AReadQuantityIsAGiven", ("Reading", "read"), _a_read_quantity_is_a_given),
    Sync(
        "AKeptReadingVouchesForItsGivens",
        ("Specifying", "adopt"),
        _a_kept_reading_vouches_for_its_givens,
    ),
    Sync("APersonSurveysAFact", ("Copiloting", "gesture"), _a_person_surveys_a_fact),
    Sync(
        "ASurveyedFactReachesTheAssertions",
        ("Situating", "survey"),
        _a_surveyed_fact_reaches_the_assertions,
    ),
    # The mark before the new derivation: both read the latest derivation
    # for a clause, and the mark is for the one that stood when the fact
    # was measured.
    Sync(
        "AChangedGivenStalesWhatRestsOnIt",
        ("Situating", "survey"),
        _a_changed_given_stales_what_rests_on_it,
    ),
    Sync(
        "AChangedGivenStalesWhatRestsOnIt",
        ("Situating", "strike"),
        _a_changed_given_stales_what_rests_on_it,
    ),
    Sync(
        "ASurveyedQuantityIsWorkedOutAgain",
        ("Situating", "survey"),
        _a_surveyed_quantity_is_worked_out_again,
    ),
    Sync("APersonDropsAGiven", ("Copiloting", "gesture"), _a_person_drops_a_given),
]
