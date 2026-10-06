"""Propagation — `docs/syncs/propagation.md`.

Three rules carry what a party asserted into the solver — hard, softly, or
released — and two carry a conflict back out to the person.  Nothing carries
anything from Constraining into Asserting except by way of somebody answering
a question.

Whether a value reaches the solver hard or softly is read from the clause it
answers: `Specifying.negotiability`, by way of `Binding.answers`.  `Asserting`
records nothing about strength, and no tool of the model reaches the tag.
Three more rules move a value between the two strengths when the tag changes
or the clause is struck.
"""

from __future__ import annotations

import json
from typing import Any

from engine import Completion, Invocation, States, Sync

WORKSPACE = "workspace"


def _an_issued_quote_is_shown(c: Completion, _: States) -> list[Invocation]:
    """An offer that nobody sees is not an offer that was made.

    Whichever party asked for it, the quote surface takes the viewer's
    attention when a quote is issued — the same shape as
    `TheCanvasIsShownBeforeItChanges`, one concept further along.
    """
    if c.failed:
        return []
    return [Invocation("Moding", "focus", {"workspace": WORKSPACE, "surface": "quote"})]


def _a_framed_requirement_shows_the_configuration(
    c: Completion, _: States
) -> list[Invocation]:
    """What a clause frame selects is on the specification, and so is the
    pick that answers the clause; framing one from the quotes brings the
    specification forward, whichever party did it."""
    if c.failed:
        return []
    frame = c.output.get("frame")
    if not isinstance(frame, dict) or frame.get("by") != "clause":
        return []
    return [
        Invocation("Moding", "focus", {"workspace": WORKSPACE, "surface": "canvas"})
    ]


def _a_withdrawn_assertion_unframes_the_canvas(
    c: Completion, states: States
) -> list[Invocation]:
    """A frame lasts as long as what it framed.

    The `where`: the workspace's frame is by assertion, on the variable just
    withdrawn.  Otherwise the rule declines, and a frame on some other
    assertion stays.
    """
    if c.failed:
        return []
    frame = states["Framing"].state()["framed"].get(WORKSPACE)
    if not isinstance(frame, dict) or frame.get("by") != "assertion":
        return []
    if frame.get("variable") != c.output.get("variable"):
        return []
    return [Invocation("Framing", "unframe", {"lens": WORKSPACE})]


def _a_struck_clause_unframes_the_canvas(
    c: Completion, states: States
) -> list[Invocation]:
    """A frame on a requirement lasts as long as the requirement.

    The `where`: the workspace's frame is by clause, on the clause just
    struck.  Otherwise the rule declines.
    """
    if c.failed:
        return []
    frame = states["Framing"].state()["framed"].get(WORKSPACE)
    if not isinstance(frame, dict) or frame.get("by") != "clause":
        return []
    if frame.get("clause") != c.output.get("clause"):
        return []
    return [Invocation("Framing", "unframe", {"lens": WORKSPACE})]


def _a_discarded_specification_unframes_the_canvas(
    c: Completion, states: States
) -> list[Invocation]:
    if c.failed or WORKSPACE not in states["Framing"].state()["framed"]:
        return []
    return [Invocation("Framing", "unframe", {"lens": WORKSPACE})]


def _held_softly(states: States, spec: str, option: Any) -> bool:
    """`?o is held softly in ?s` — `docs/syncs/propagation.md`.

    True when at least one choice of the specification's selection holds the
    option, and every clause those choices answer is negotiable.  A value that
    answers no clause is hard; one that answers a fixed clause beside a
    negotiable one is hard, because the firmer requirement governs; and `open`
    is not a strength, so an answer to an open clause is hard too.
    """
    binding = states["Binding"].state()
    negotiability = states["Specifying"].state()["negotiability"]
    selection = next((sel for sel, of in binding["for"].items() if of == spec), None)
    if selection is None:
        return False
    answered = [
        binding["answers"][choice]
        for choice in binding["choices"].get(selection, [])
        if binding["value"][choice] == option
    ]
    return bool(answered) and all(
        negotiability.get(clause) == "negotiable" for clause in answered
    )


def _met(constraining: dict[str, Any], spec: str, variable: str, option: Any) -> bool:
    """`?v -> ?o is met in ?s` — `docs/syncs/propagation.md`.

    Assumed, or inclined with nothing refused against the variable.  The one
    way a refusal stands against an inclined value is a hardening that
    failed, and until it clears the value is unmet.
    """
    if constraining["assumed"].get(spec, {}).get(variable) == option:
        return True
    return constraining["inclined"].get(spec, {}).get(variable) == option and not (
        constraining["refused"].get(spec, {}).get(variable)
    )


def _variable_offering(states: States, option: Any) -> str | None:
    """`Cataloguing: { ?v offers: ?o }`."""
    for variable, offered in states["Cataloguing"].state()["offers"].items():
        if option in offered:
            return variable
    return None


def _assertions_reach_the_solver(c: Completion, states: States) -> list[Invocation]:
    """The `where`: the value is not held softly.  Otherwise the rule below."""
    if c.failed or _held_softly(states, c.output["spec"], c.output["option"]):
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


def _a_negotiable_answer_reaches_the_solver_softly(
    c: Completion, states: States
) -> list[Invocation]:
    """One completion, two rules with complementary `where` clauses, and no
    field on the assertion says which.  The strength is the person's tag on
    the clause, read through `Binding.answers`."""
    if c.failed or not _held_softly(states, c.output["spec"], c.output["option"]):
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


def _answers_of(states: States, spec: str, clause: str) -> list[tuple[str, Any]]:
    """`Binding: { ?sel for: ?s ; ?ch answers: ?c ; ?ch value: ?o }` with
    `Cataloguing: { ?v offers: ?o }` and `Asserting: { ?s asserted: ?v -> ?o }`:
    the (variable, option) pairs currently answering the clause and asserted."""
    binding = states["Binding"].state()
    asserted = states["Asserting"].state()["asserted"].get(spec, {})
    selection = next((sel for sel, of in binding["for"].items() if of == spec), None)
    if selection is None:
        return []
    pairs = []
    for choice in binding["choices"].get(selection, []):
        if binding["answers"][choice] != clause:
            continue
        option = binding["value"][choice]
        variable = _variable_offering(states, option)
        if variable is not None and asserted.get(variable) == option:
            pairs.append((variable, option))
    return pairs


def _a_settled_clause_softens_its_answer(
    c: Completion, states: States
) -> list[Invocation]:
    """A clause settled to negotiable after it was answered moves its value
    from assumed to inclined.  Cannot fail: an unmet value made negotiable
    becomes an inclination, and is honoured or yields in the recompute."""
    if c.failed:
        return []
    spec = c.output["spec"]
    constraining = states["Constraining"].state()
    inclined = constraining["inclined"].get(spec, {})
    refused = constraining["refused"].get(spec, {})
    # Unless already inclined with nothing refused: a value the solver
    # inclines and has since refused firmly is inclined again, so that the
    # refusal clears.
    return [
        Invocation("Constraining", "incline", {"spec": spec, "variable": v, "option": o})
        for v, o in _answers_of(states, spec, c.output["clause"])
        if _held_softly(states, spec, o)
        and not (inclined.get(v) == o and not refused.get(v))
    ]


def _a_settled_clause_hardens_its_answer(
    c: Completion, states: States
) -> list[Invocation]:
    """A clause settled to fixed, or open, after it was answered moves its
    value from inclined to assumed.  Can fail, and then
    `AConflictIsPutToThePerson` fires as for any assertion: making a
    requirement firm is how a person finds out what it costs."""
    if c.failed:
        return []
    spec = c.output["spec"]
    inclined = states["Constraining"].state()["inclined"].get(spec, {})
    return [
        Invocation("Constraining", "assume", {"spec": spec, "variable": v, "option": o})
        for v, o in _answers_of(states, spec, c.output["clause"])
        if not _held_softly(states, spec, o) and inclined.get(v) == o
    ]


def _a_retracted_choice_hardens_its_value(
    c: Completion, states: States
) -> list[Invocation]:
    """A value whose clause was struck is an ordinary assertion again.

    Matches every retraction and declines on two of the three: a withdrawn
    value is no longer asserted, and an overwritten value's variable now
    asserts something else.  Only the struck clause leaves an inclined value
    asserted with nothing negotiable behind it.
    """
    if c.failed:
        return []
    binding = states["Binding"].state()
    spec = binding["for"].get(c.output["selection"])
    option = c.output["value"]
    variable = _variable_offering(states, option)
    if spec is None or variable is None:
        return []
    asserted = states["Asserting"].state()["asserted"].get(spec, {})
    inclined = states["Constraining"].state()["inclined"].get(spec, {})
    if asserted.get(variable) != option or inclined.get(variable) != option:
        return []
    if _held_softly(states, spec, option):
        return []
    return [
        Invocation(
            "Constraining",
            "assume",
            {"spec": spec, "variable": variable, "option": option},
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

    `Asserting/discard` was an action no stimulus reached and no rule
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


def _unmet_assertions_are_tried_again(
    c: Completion, states: States
) -> list[Invocation]:
    """An assertion is tried again when whatever blocked it goes.

    This is what makes *the assertion stays on record* mean something rather
    than merely look tidy.  Give up the hospital and the 630 kg car asserted
    half an hour ago becomes buildable, so it is assumed, without anybody
    asserting it a second time.

    One binding per unmet assertion, one invocation per binding.  It cannot
    loop — a retry that succeeds invokes no `release`, and one that fails
    invokes nothing — and it terminates, because the set of assertions only
    shrinks along that path.
    """
    if c.failed:
        return []
    spec = c.output["spec"]
    asserted = states["Asserting"].state()["asserted"].get(spec, {})
    constraining = states["Constraining"].state()
    # An inclined value with nothing refused against it is met, honoured or
    # yielded, so it is not tried again: the recompute after the release
    # reconsiders it.  One a hardening refused is tried again hard.
    return [
        Invocation(
            "Constraining",
            "assume",
            {"spec": spec, "variable": variable, "option": option},
        )
        for variable, option in asserted.items()
        if not _met(constraining, spec, variable, option)
    ]


def _a_conflict_is_put_to_the_person(c: Completion, states: States) -> list[Invocation]:
    """The `where` clause aggregates rather than firing once per binding.

    WYSIWID §6.5's default — one binding, one invocation — is what gives a
    cascading delete its iteration for free, and it is the wrong default here:
    five conflicting assertions are one question with five answers, not five
    questions.
    """
    if not c.failed:
        return []
    spec = c.input["spec"]
    conceding = c.output.get("conceding") or []
    constraining = states["Constraining"].state()
    asserted = states["Asserting"].state()["asserted"].get(spec, {})
    candidates: list[dict[str, Any]] = []
    for variable in conceding:
        was = asserted.get(variable)
        if was is not None:
            candidates.append({"variable": variable, "option": was})
    # The option that was just refused is not in `asserted` — it never got
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


def _a_resolved_conflict_withdraws_its_question(
    c: Completion, states: States
) -> list[Invocation]:
    """A question about a conflict lasts as long as the conflict.

    The `where`: a conflict request for this specification is pending, and
    every assertion of the specification is assumed or inclined.  That is the
    condition the question was asked about, negated — however it came to
    hold: the person answered in words and the model withdrew at their word,
    they withdrew the refused assertion themselves, or they settled its clause
    to negotiable.  Matched on `assume` and `incline` as well as `withdraw`
    because giving up a conceding assertion only resolves the conflict once
    the refused one is tried again and taken, and softening the refused one
    resolves it the moment it is inclined.
    """
    if c.failed:
        return []
    spec = c.output["spec"]
    request = {"spec": spec, "about": "conflict"}
    deciding = states["Deciding"].state()
    key = json.dumps(request, sort_keys=True, default=str)
    if key not in deciding["offered"]:
        return []
    if key in deciding["chosen"] or key in deciding["declined"]:
        return []
    asserted = states["Asserting"].state()["asserted"].get(spec, {})
    constraining = states["Constraining"].state()
    if any(
        not _met(constraining, spec, variable, option)
        for variable, option in asserted.items()
    ):
        return []
    return [Invocation("Deciding", "withdraw", {"request": request})]


def _the_conceded_assertion_is_withdrawn(
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
            "Asserting",
            "withdraw",
            {"spec": request["spec"], "variable": option["variable"]},
        )
    ]


rules = [
    Sync(
        "ANewSpecificationIsGivenToTheSolver",
        ("Asserting", "start"),
        _a_new_specification_is_given_to_the_solver,
    ),
    Sync(
        "ADiscardedSpecificationLeavesTheSolver",
        ("Asserting", "discard"),
        _a_discarded_specification_leaves_the_solver,
    ),
    Sync(
        "ADiscardedSpecificationsQuestionsAreWithdrawn",
        ("Asserting", "discard"),
        _a_discarded_specifications_questions_are_withdrawn,
    ),
    Sync(
        "AssertionsReachTheSolver",
        ("Asserting", "assert"),
        _assertions_reach_the_solver,
    ),
    Sync(
        "ANegotiableAnswerReachesTheSolverSoftly",
        ("Asserting", "assert"),
        _a_negotiable_answer_reaches_the_solver_softly,
    ),
    Sync(
        "AWithdrawalReachesTheSolver",
        ("Asserting", "withdraw"),
        _a_withdrawal_reaches_the_solver,
    ),
    Sync(
        "ASettledClauseSoftensItsAnswer",
        ("Specifying", "settle"),
        _a_settled_clause_softens_its_answer,
    ),
    Sync(
        "ASettledClauseHardensItsAnswer",
        ("Specifying", "settle"),
        _a_settled_clause_hardens_its_answer,
    ),
    Sync(
        "ARetractedChoiceHardensItsValue",
        ("Binding", "retract"),
        _a_retracted_choice_hardens_its_value,
    ),
    Sync(
        "UnmetAssertionsAreTriedAgain",
        ("Constraining", "release"),
        _unmet_assertions_are_tried_again,
    ),
    Sync(
        "AConflictIsPutToThePerson",
        ("Constraining", "assume"),
        _a_conflict_is_put_to_the_person,
    ),
    Sync(
        "TheConcededAssertionIsWithdrawn",
        ("Deciding", "choose"),
        _the_conceded_assertion_is_withdrawn,
    ),
    Sync(
        "AResolvedConflictWithdrawsItsQuestion",
        ("Constraining", "assume"),
        _a_resolved_conflict_withdraws_its_question,
    ),
    Sync(
        "AResolvedConflictWithdrawsItsQuestion",
        ("Constraining", "incline"),
        _a_resolved_conflict_withdraws_its_question,
    ),
    Sync(
        "AResolvedConflictWithdrawsItsQuestion",
        ("Asserting", "withdraw"),
        _a_resolved_conflict_withdraws_its_question,
    ),
    Sync("AnIssuedQuoteIsShown", ("Quoting", "quote"), _an_issued_quote_is_shown),
    Sync(
        "AFramedRequirementShowsTheConfiguration",
        ("Framing", "frame"),
        _a_framed_requirement_shows_the_configuration,
    ),
    Sync(
        "AWithdrawnAssertionUnframesTheCanvas",
        ("Asserting", "withdraw"),
        _a_withdrawn_assertion_unframes_the_canvas,
    ),
    Sync(
        "AStruckClauseUnframesTheCanvas",
        ("Specifying", "strike"),
        _a_struck_clause_unframes_the_canvas,
    ),
    Sync(
        "ADiscardedSpecificationUnframesTheCanvas",
        ("Asserting", "discard"),
        _a_discarded_specification_unframes_the_canvas,
    ),
]
