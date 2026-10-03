"""Binding — `docs/syncs/binding.md`.

How a clause comes to be answered, how an answer reaches the solver, and what
takes an answer away.  The case's slice 1, for a build in which the person
does the mapping: a pick on the canvas names the option, the variable that
offers it is a read of `Cataloguing`, and the chain from `Binding/propose` to
`Asserting/assert` is one rule where the catalogue's has three.

Nothing here carries a `Binding/retract` back into `Asserting`.  A retraction
is a consequence of an assertion changing, never a cause of one.
"""

from __future__ import annotations

from typing import Any

from engine import Completion, Invocation, States, Sync

from .gestures import BASIS, PERSON


def _selection_for(states: States, spec: str) -> str | None:
    """`Binding: { ?sel for: ?s }`."""
    binding = states["Binding"].state()
    for selection, of in binding["for"].items():
        if of == spec:
            return selection
    return None


def _variable_offering(states: States, option: Any) -> str | None:
    """`Cataloguing: { ?v offers: ?o }` — which variable the option belongs to."""
    for variable, offered in states["Cataloguing"].state()["offers"].items():
        if option in offered:
            return variable
    return None


def _choices_of(states: States, selection: str) -> list[dict[str, Any]]:
    binding = states["Binding"].state()
    return [
        {
            "choice": choice,
            "value": binding["value"][choice],
            "answers": binding["answers"][choice],
        }
        for choice in binding["choices"].get(selection, [])
    ]


# -- opening and closing ----------------------------------------------------


def _a_started_specification_is_opened(c: Completion, _: States) -> list[Invocation]:
    """One identifier, three concepts, none of which knows the others exist.

    The catalogue's `BeginConfiguring` runs the other way, from the selection
    to the configuration; here the boot's one root action is `Asserting/start`
    and the two newer concepts hang off it.  See `docs/syncs/binding.md`.
    """
    if c.failed:
        return []
    spec = c.output["spec"]
    return [
        Invocation("Specifying", "open", {"spec": spec}),
        Invocation("Binding", "begin", {"spec": spec, "offering": BASIS}),
    ]


def _a_discarded_specification_is_closed(
    c: Completion, states: States
) -> list[Invocation]:
    if c.failed:
        return []
    spec = c.output["spec"]
    selection = _selection_for(states, spec)
    invocations = [Invocation("Specifying", "close", {"spec": spec})]
    if selection:
        invocations.append(Invocation("Binding", "abandon", {"selection": selection}))
    return invocations


# -- a person answers a clause ----------------------------------------------


def _a_person_answers_a_clause(c: Completion, states: States) -> list[Invocation]:
    """A clause with no answer on the option's variable gets a `propose`.

    Beside whatever answers it on other variables: one clause can settle
    several, and the question is per variable.
    """
    if c.output.get("act") != "answer":
        return []
    clause, option = c.output["clause"], c.output["option"]
    # A clause struck since the canvas was drawn is not one of the spec's,
    # and a choice answering it would answer nothing.
    if clause not in states["Specifying"].state()["clauses"].get(c.output["spec"], []):
        return []
    selection = _selection_for(states, c.output["spec"])
    if selection is None:
        return []
    variable = _variable_offering(states, option)
    if variable is None:
        return []
    if any(
        ch["answers"] == clause and _variable_offering(states, ch["value"]) == variable
        for ch in _choices_of(states, selection)
    ):
        return []
    return [
        Invocation(
            "Binding",
            "propose",
            {
                "party": PERSON,
                "selection": selection,
                "requirement": clause,
                "value": option,
            },
        )
    ]


def _a_person_substitutes_an_answer(c: Completion, states: States) -> list[Invocation]:
    """A clause answered on the option's variable gets a `substitute` of that
    choice alone, with a reason; its answers on other variables stand.

    Answering a clause with the value it already has fires neither rule, which
    is the ordinary meaning of a `where` that does not bind.
    """
    if c.output.get("act") != "answer":
        return []
    selection = _selection_for(states, c.output["spec"])
    if selection is None:
        return []
    clause, option = c.output["clause"], c.output["option"]
    variable = _variable_offering(states, option)
    if variable is None:
        return []
    return [
        Invocation(
            "Binding",
            "substitute",
            {
                "party": PERSON,
                "choice": ch["choice"],
                "value": option,
                "reason": c.output.get("reason", ""),
            },
        )
        for ch in _choices_of(states, selection)
        if ch["answers"] == clause
        and ch["value"] != option
        and _variable_offering(states, ch["value"]) == variable
    ]


# -- the person maps --------------------------------------------------------


def _a_choice_reaches_the_assertions(c: Completion, states: States) -> list[Invocation]:
    """The catalogue's `ApplyMapping`, with the mapping the identity.

    The value is an option, the variable that offers it is a read of
    `Cataloguing`, and `Asserting/assert` follows.  An option no variable
    offers binds nothing and the rule declines to fire; the choice stays on
    record answering its clause, and the ledger read shows it as one nothing
    in the catalogue can realise.
    """
    if c.failed:
        return []
    binding = states["Binding"].state()
    spec = binding["for"].get(c.output["selection"])
    variable = _variable_offering(states, c.output["value"])
    if spec is None or variable is None:
        return []
    return [
        Invocation(
            "Asserting",
            "assert",
            {
                "party": c.output["party"],
                "spec": spec,
                "variable": variable,
                "option": c.output["value"],
            },
        )
    ]


# -- what takes a choice away -----------------------------------------------


def _a_withdrawn_value_retracts_its_choices(
    c: Completion, states: States
) -> list[Invocation]:
    if c.failed:
        return []
    selection = _selection_for(states, c.output["spec"])
    if selection is None:
        return []
    return [
        Invocation("Binding", "retract", {"choice": ch["choice"]})
        for ch in _choices_of(states, selection)
        if ch["value"] == c.output["option"]
    ]


def _an_overwritten_value_retracts_its_choices(
    c: Completion, states: States
) -> list[Invocation]:
    """A different value for the same variable displaces the answer.

    Whoever asserted it — the person on the canvas, the model on their behalf,
    an adopted completion.  The value the person chose *for that reason* is
    gone, and a ledger that went on saying the clause was answered would be
    lying; the provenance edge on the `retract` says which assertion did it.
    """
    if c.failed:
        return []
    selection = _selection_for(states, c.output["spec"])
    if selection is None:
        return []
    variable, option = c.output["variable"], c.output["option"]
    return [
        Invocation("Binding", "retract", {"choice": ch["choice"]})
        for ch in _choices_of(states, selection)
        if ch["value"] != option and _variable_offering(states, ch["value"]) == variable
    ]


def _a_struck_clause_releases_its_choices(
    c: Completion, states: States
) -> list[Invocation]:
    """The choice goes; the value it held stays asserted.

    Striking a requirement is not taking back a value — see
    `docs/concepts/specifying.md`, "Why there is a `strike`".
    """
    if c.failed:
        return []
    selection = _selection_for(states, c.output["spec"])
    if selection is None:
        return []
    return [
        Invocation("Binding", "retract", {"choice": ch["choice"]})
        for ch in _choices_of(states, selection)
        if ch["answers"] == c.output["clause"]
    ]


rules = [
    Sync(
        "AStartedSpecificationIsOpened",
        ("Asserting", "start"),
        _a_started_specification_is_opened,
    ),
    Sync(
        "ADiscardedSpecificationIsClosed",
        ("Asserting", "discard"),
        _a_discarded_specification_is_closed,
    ),
    Sync("APersonAnswersAClause", ("Copiloting", "gesture"), _a_person_answers_a_clause),
    Sync(
        "APersonSubstitutesAnAnswer",
        ("Copiloting", "gesture"),
        _a_person_substitutes_an_answer,
    ),
    Sync(
        "AChoiceReachesTheAssertions",
        ("Binding", "propose"),
        _a_choice_reaches_the_assertions,
    ),
    Sync(
        "ASubstituteReachesTheAssertions",
        ("Binding", "substitute"),
        _a_choice_reaches_the_assertions,
    ),
    Sync(
        "AWithdrawnValueRetractsItsChoices",
        ("Asserting", "withdraw"),
        _a_withdrawn_value_retracts_its_choices,
    ),
    Sync(
        "AnOverwrittenValueRetractsItsChoices",
        ("Asserting", "assert"),
        _an_overwritten_value_retracts_its_choices,
    ),
    Sync(
        "AStruckClauseReleasesItsChoices",
        ("Specifying", "strike"),
        _a_struck_clause_releases_its_choices,
    ),
]
