"""Propagation — `docs/syncs/propagation.md`.

Three rules carry what a person asked for into the solver, and two carry a
conflict back out to the person.  Nothing carries anything from Constraining
into Specifying except by way of somebody answering a question.
"""

from __future__ import annotations

from typing import Any

from engine import Completion, Invocation, States, Sync


def _requirements_reach_the_solver(c: Completion, _: States) -> list[Invocation]:
    if c.failed:
        return []
    return [
        Invocation(
            "Constraining",
            "assume",
            {
                "spec": c.output["spec"],
                "variable": c.output["variable"],
                "option": c.output["option"],
            },
        )
    ]


def _preferences_reach_the_solver_softly(c: Completion, _: States) -> list[Invocation]:
    if c.failed:
        return []
    return [
        Invocation(
            "Constraining",
            "incline",
            {
                "spec": c.output["spec"],
                "variable": c.output["variable"],
                "option": c.output["option"],
            },
        )
    ]


def _a_withdrawal_reaches_the_solver(c: Completion, _: States) -> list[Invocation]:
    if c.failed:
        return []
    return [
        Invocation(
            "Constraining",
            "release",
            {"spec": c.output["spec"], "variable": c.output["variable"]},
        )
    ]


def _a_new_specification_is_given_to_the_solver(
    c: Completion, _: States
) -> list[Invocation]:
    if c.failed:
        return []
    return [Invocation("Constraining", "consider", {"spec": c.output["spec"]})]


def _a_discarded_specification_leaves_the_solver(
    c: Completion, _: States
) -> list[Invocation]:
    """The inverse of the rule above.

    `Specifying/discard` was an action no stimulus reached and no rule
    followed.  MSM §5.1.2: an action whose inverse is missing is a trap.
    """
    if c.failed:
        return []
    return [Invocation("Constraining", "forget", {"spec": c.output["spec"]})]


def _a_discarded_specifications_questions_are_withdrawn(
    c: Completion, states: States
) -> list[Invocation]:
    """A question about a discarded specification no longer needs settling.

    One binding per request, one invocation per binding.  `Deciding` cannot see
    this for itself — it does not know what a specification is — so which
    requests to stop holding is a question for a rule.
    """
    if c.failed:
        return []
    spec = c.output["spec"]
    deciding = states["Deciding"].state()
    return [
        Invocation("Deciding", "withdraw", {"request": request})
        for request in deciding["request"].values()
        if isinstance(request, dict) and request.get("spec") == spec
    ]


def _unmet_requirements_are_tried_again(
    c: Completion, states: States
) -> list[Invocation]:
    """A requirement is tried again when whatever blocked it goes.

    This is what makes *the requirement stays on record* mean something rather
    than merely look tidy.  Give up the hospital and the 630 kg car asked for
    half an hour ago becomes buildable, so it is assumed, without anybody
    asking for it a second time.

    One binding per unmet requirement, one invocation per binding.  It cannot
    loop — a retry that succeeds invokes no `release`, and one that fails
    invokes nothing — and it terminates, because the set of requirements only
    shrinks along that path.
    """
    if c.failed:
        return []
    spec = c.output["spec"]
    required = states["Specifying"].state()["required"].get(spec, {})
    assumed = states["Constraining"].state()["assumed"].get(spec, {})
    return [
        Invocation(
            "Constraining",
            "assume",
            {"spec": spec, "variable": variable, "option": option},
        )
        for variable, option in required.items()
        if assumed.get(variable) != option
    ]


def _a_conflict_is_put_to_the_person(c: Completion, states: States) -> list[Invocation]:
    """The `where` clause aggregates rather than firing once per binding.

    WYSIWID §6.5's default — one binding, one invocation — is what gives a
    cascading delete its iteration for free, and it is the wrong default here:
    five conflicting requirements are one question with five answers, not five
    questions.
    """
    if not c.failed:
        return []
    spec = c.input["spec"]
    conceding = c.output.get("conceding") or []
    constraining = states["Constraining"].state()
    required = states["Specifying"].state()["required"].get(spec, {})
    candidates: list[dict[str, Any]] = []
    for variable in conceding:
        asked = required.get(variable)
        if asked is not None:
            candidates.append({"variable": variable, "option": asked})
    # The option that was just refused is not in `required` — it never got
    # there — so offer it explicitly as the thing to give up.
    refused = {"variable": c.input["variable"], "option": c.input["option"]}
    if refused not in candidates:
        candidates.append(refused)
    # A question needs at least two answers.  With one candidate there is
    # nothing to choose between, so none is asked — the refusal is still
    # recorded in `Constraining.refused` and still reaches the card.
    if len(candidates) < 2:
        return []
    # The reason is the rules in their own words.  `Constraining`'s error
    # string names variables and options by identity because that is all it
    # knows; a person needs the sentences, and those are `because`.
    sentences: list[str] = []
    for rule in c.output.get("culprits") or []:
        sentence = constraining["because"].get(rule)
        if sentence and sentence not in sentences:
            sentences.append(sentence)
    return [
        Invocation(
            "Deciding",
            "ask",
            {
                # The request names the question, not only its subject.  Two
                # different questions about one specification are two requests;
                # passing the specification made them one, and a pending
                # conflict was silently replaced by a proposed completion.
                "request": {"spec": spec, "about": "conflict"},
                "reason": "; ".join(sentences) or "these cannot hold together",
                "options": candidates,
            },
        )
    ]


def _the_conceded_requirement_is_withdrawn(
    c: Completion, _: States
) -> list[Invocation]:
    if c.failed:
        return []
    request = c.output.get("request")
    if not isinstance(request, dict) or request.get("about") != "conflict":
        return []
    option = c.output.get("option")
    if not isinstance(option, dict) or "variable" not in option:
        return []
    return [
        Invocation(
            "Specifying",
            "withdraw",
            {"spec": request["spec"], "variable": option["variable"]},
        )
    ]


rules = [
    Sync(
        "ANewSpecificationIsGivenToTheSolver",
        ("Specifying", "start"),
        _a_new_specification_is_given_to_the_solver,
    ),
    Sync(
        "ADiscardedSpecificationLeavesTheSolver",
        ("Specifying", "discard"),
        _a_discarded_specification_leaves_the_solver,
    ),
    Sync(
        "ADiscardedSpecificationsQuestionsAreWithdrawn",
        ("Specifying", "discard"),
        _a_discarded_specifications_questions_are_withdrawn,
    ),
    Sync(
        "RequirementsReachTheSolver",
        ("Specifying", "require"),
        _requirements_reach_the_solver,
    ),
    Sync(
        "PreferencesReachTheSolverSoftly",
        ("Specifying", "prefer"),
        _preferences_reach_the_solver_softly,
    ),
    Sync(
        "AWithdrawalReachesTheSolver",
        ("Specifying", "withdraw"),
        _a_withdrawal_reaches_the_solver,
    ),
    Sync(
        "UnmetRequirementsAreTriedAgain",
        ("Constraining", "release"),
        _unmet_requirements_are_tried_again,
    ),
    Sync(
        "AConflictIsPutToThePerson",
        ("Constraining", "assume"),
        _a_conflict_is_put_to_the_person,
    ),
    Sync(
        "TheConcededRequirementIsWithdrawn",
        ("Deciding", "choose"),
        _the_conceded_requirement_is_withdrawn,
    ),
]
