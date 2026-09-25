"""Conduct — `docs/syncs/conduct.md`.

What the model may do, stated positively.  MSM §5.3.

The enforcement is in what is absent.  No rule below carries a tool call to
`Deciding/choose`, `Quoting/commit`, `Pricing`, `Footprinting` or
`Cataloguing`, so the model cannot adopt a completion, accept a quote, set a
price or change the catalogue.  Not because it is told not to — because an action reaches the log
only by way of some synchronization, and there is no rule that would carry the
invocation through.

"Can the agent change a price?" is therefore answered by reading the `then`
clauses in this file, rather than by reasoning about what a language model is
likely to infer from a paragraph of English.
"""

from __future__ import annotations

from typing import Any, Callable

from engine import Completion, Invocation, States, Sync
from . import readings

from .gestures import DETAILS, offer

WORKSPACE = "workspace"

# The party the model asserts as.  Stated here rather than read off the
# completion's actor, for the reason given in `gestures.py`.
MODEL = "model"
PERSON = "person"

# The one basis the catalogue seeds.  A second would be a second set of terms
# to quote on, and the state can now hold one.
BASIS = "catalogue"


def _tool(name: str, concept: str, action: str, *arguments: str, **fixed: Any):
    def then(c: Completion, _: States) -> list[Invocation]:
        if c.output.get("tool") != name:
            return []
        input: dict[str, Any] = {a: c.output[a] for a in arguments if a in c.output}
        input.update(fixed)
        return [Invocation(concept, action, input)]

    return then


def _the_model_may_propose_a_completion(
    c: Completion, states: States
) -> list[Invocation]:
    """The `where` clause: two other concepts' state, read by the rule.

    Constraining is handed a cost function and never learns that money exists;
    Pricing is never asked to solve anything.  That the two can be coupled at
    all without either knowing the other is WYSIWID §7.2's first and third
    design rules doing their work together.
    """
    if c.output.get("tool") != "propose":
        return []
    spec = c.output["spec"]
    measure = c.output.get("measure", "cost")
    if measure == "carbon":
        cost = _carbon_weights(states, spec)
    else:
        cost = _lifetime_weights(states, spec)
    return [
        Invocation(
            "Constraining", "complete", {"spec": c.output["spec"], "cost": cost}
        )
    ]


def _lifetime_weights(states: States, spec: str) -> dict[str, float]:
    """What each option adds to the lifetime cost, as a constant per option.

    A lifetime cost depends on the term, and the term is itself one of the
    variables being chosen, so the true objective is not linear in the
    selection.  The stated approximation: reckon recurring charges over the
    term the specification has already settled on, and over the presumed term
    when it has settled on none.  Without this the objective would weigh only
    capital, and "make it cheaper" would answer with 24/7 support and
    near-continuous traffic, because neither costs anything to buy.
    """
    pricing = states["Pricing"].state()
    settled = states["Constraining"].state()["settled"].get(spec, {})
    chosen_term = settled.get("contract_term") or pricing["usual"].get(BASIS)
    months = pricing["months"].get(chosen_term or "", 0)
    factor = pricing["factor"].get(BASIS, 1.0)
    weights = {
        option: amount * factor for option, amount in pricing["capital"].items()
    }
    for option, amount in pricing["monthly"].items():
        weights[option] = weights.get(option, 0.0) + amount * months
    return weights


def _carbon_weights(states: States, spec: str) -> dict[str, float]:
    """What each option adds to the lifetime footprint, as a constant per option.

    Embodied carbon is already per-option.  The use phase is not: it is a table
    lookup on energy class, usage profile and travel together, and over
    twenty-five years it is the larger half.  Weighing embodied carbon alone
    would answer "make it greener" with the standard drive package, because a
    regenerative one costs 120 kg to build and its saving is all in a column
    the objective never reads.

    The stated approximation: charge the use phase to each of the three
    variables the table is indexed by, averaging over the possibilities left
    open on the other two.  Annual demand rises monotonically along each of the
    three axes whatever the other two are, so no such average can reorder the
    options within an axis — which is what makes the approximation safe to
    state rather than merely convenient.  It counts the same energy three
    times, so the absolute number means nothing; only the ranking does, and
    ranking is all an objective is asked for.

    Charging it to the energy class alone was the obvious version and is wrong:
    it leaves usage profile and travel height unweighted, so the optimiser is
    free to answer "make it greener" with near-continuous traffic, which is the
    single largest thing driving the footprint up.
    """
    footprinting = states["Footprinting"].state()
    constraining = states["Constraining"].state()
    possible = constraining["possible"].get(spec, {})
    weights = dict(footprinting["embodied"])
    horizon = footprinting["horizon"].get(BASIS, 0)
    intensity = footprinting["intensity"].get("today", 0.0)
    axes = ("energy_class", "usage_profile", "travel")
    allowed = [set(possible.get(axis, [])) for axis in axes]
    if not (all(allowed) and horizon and intensity):
        return weights
    tallies: dict[str, list[float]] = {}
    for key, energy in footprinting["demand"].items():
        options = key.split("/")
        if not all(o in a for o, a in zip(options, allowed)):
            continue
        for option in options:
            tallies.setdefault(option, []).append(energy)
    for option, energies in tallies.items():
        run = sum(energies) / len(energies) * intensity * horizon
        weights[option] = weights.get(option, 0.0) + run
    return weights


# -- proposing, and not adopting -- `docs/syncs/conduct.md` ------------------

ABOUT = "completion"


def _completion(spec: str) -> dict[str, Any]:
    """The request that puts a whole assignment to the person."""
    return {"spec": spec, "about": ABOUT}


def _proposed(spec: str, variable: str) -> dict[str, Any]:
    """The request that puts one proposed value to the person."""
    return {"spec": spec, "about": ABOUT, "variable": variable}


def _is_completion(request: Any, spec: str | None = None) -> bool:
    return (
        isinstance(request, dict)
        and request.get("about") == ABOUT
        and "variable" not in request
        and (spec is None or request.get("spec") == spec)
    )


def _is_proposed(request: Any, spec: str | None = None) -> bool:
    return (
        isinstance(request, dict)
        and request.get("about") == ABOUT
        and "variable" in request
        and (spec is None or request.get("spec") == spec)
    )


def _open(states: States, spec: str) -> Callable[[str], bool]:
    """`?v is neither asserted of ?s nor settled for ?s`."""
    asserted = states["Asserting"].state()["asserted"].get(spec, {})
    settled = states["Constraining"].state()["settled"].get(spec, {})
    return lambda variable: variable not in asserted and variable not in settled


def _pending_proposed(states: States, spec: str) -> list[dict[str, Any]]:
    """Every proposed value of the specification still asked and unanswered."""
    return [
        q
        for q in readings.pending(states["Deciding"].state())
        if _is_proposed(q["request"], spec)
    ]


def _a_completion_is_put_to_the_person(c: Completion, _: States) -> list[Invocation]:
    if c.failed:
        return []
    return [
        Invocation(
            "Deciding",
            "ask",
            {
                # `about` is what keeps this question and a pending conflict
                # apart.  Both concern the same specification, and passing the
                # specification alone made one silently replace the other.
                "request": _completion(c.output["spec"]),
                "reason": "adopt this completion",
                "options": [c.output["assignment"]],
            },
        )
    ]


def _a_proposed_value_is_put_to_the_person(
    c: Completion, states: States
) -> list[Invocation]:
    """One binding per open pair in the assignment — WYSIWID §6.5.

    The completion holds two kinds of value: what the rules settle given the
    assertions, which the canvas already shows as following, and the choices
    the rules leave open.  Only the second kind is a question, and each is
    put to the person on its own, as the case's `Suggesting [Choice, Party]`
    proposes one choice at a time.
    """
    if c.failed:
        return []
    spec = c.output["spec"]
    is_open = _open(states, spec)
    return [
        Invocation(
            "Deciding",
            "ask",
            {
                "request": _proposed(spec, variable),
                "reason": "proposed to finish the specification",
                "options": [{"variable": variable, "option": option}],
            },
        )
        for variable, option in c.output["assignment"].items()
        if is_open(variable)
    ]


def _an_adopted_completion_is_taken_value_by_value(
    c: Completion, states: States
) -> list[Invocation]:
    """The whole is a shortcut over the parts.

    Choosing the completion chooses every proposed value still open, and
    asserts none of them itself: `AnAdoptedValueBecomesAnAssertion` asks, for
    each, whether its variable is still open when its turn comes.  A value a
    sibling has meanwhile settled is chosen and asserts nothing, so it reads
    *follows* and not *asked* however many values were taken in one act.
    A value the person declined is not pending, and stays declined.
    """
    if c.failed or not _is_completion(c.output.get("request")):
        return []
    spec = c.output["request"]["spec"]
    return [
        Invocation("Deciding", "choose", {"request": q["request"], "option": q["options"][0]})
        for q in _pending_proposed(states, spec)
        if q["options"]
    ]


def _an_adopted_value_becomes_an_assertion(
    c: Completion, states: States
) -> list[Invocation]:
    """Adoption is asserting the value, by the person.

    Only a genuinely open variable is asserted.  Adopting does not restate
    what you already asserted, and it does not turn what merely follows from
    the rules into something you demanded — which is what keeps *asserted*
    and *follows from* readable after a proposal is adopted.

    The rule is discriminated from `TheConcededAssertionIsWithdrawn` by the
    request's `about`, not by the shape of the option: a proposed value and a
    conflict candidate are each `{variable, option}`, one to be taken up and
    the other to be given up.

    The party is the person, not the model.  This is the rule the model has no
    counterpart for.
    """
    if c.failed or not _is_proposed(c.output.get("request")):
        return []
    request = c.output["request"]
    value = c.output.get("option")
    if not isinstance(value, dict) or value.get("variable") != request["variable"]:
        return []
    spec = request["spec"]
    if not _open(states, spec)(request["variable"]):
        return []
    return [
        Invocation(
            "Asserting",
            "assert",
            {
                "spec": spec,
                "variable": request["variable"],
                "option": value["option"],
                "party": PERSON,
            },
        )
    ]


def _a_declined_completion_is_declined_value_by_value(
    c: Completion, states: States
) -> list[Invocation]:
    """*Leave it for now* on the whole leaves every part."""
    if c.failed or not _is_completion(c.output.get("request")):
        return []
    spec = c.output["request"]["spec"]
    return [
        Invocation("Deciding", "decline", {"request": q["request"]})
        for q in _pending_proposed(states, spec)
    ]


def _a_changed_specification_withdraws_its_proposal(
    c: Completion, states: States
) -> list[Invocation]:
    """A proposal lasts exactly as long as the state it assumed.

    `complete` is computed against the assumptions holding when `propose` ran.
    Let the specification move underneath it and adopting it restates values
    chosen for a state that has gone — in the worst case the very assertion
    the person just gave up to resolve a conflict.

    An assertion the proposal already holds does not move that state: every
    rule was satisfied by the whole assignment, so it still is once part of
    it is assumed, and what remains is still the cheapest way to finish.  So
    the proposal survives its own adoption one value at a time, and survives
    the person asserting a value it proposed by hand.  Anything else — a
    different value, or a withdrawal — takes the completion and every
    proposed value off the record.
    """
    if c.failed:
        return []
    spec = c.output["spec"]
    deciding = states["Deciding"].state()
    completion = next(
        (
            key
            for key, request in deciding["request"].items()
            if _is_completion(request, spec) and key in deciding["offered"]
        ),
        None,
    )
    if completion is None:
        return []
    if c.action == "assert":
        assignment = deciding["offered"][completion][0]
        if assignment.get(c.output["variable"]) == c.output["option"]:
            return []
    return [
        Invocation("Deciding", "withdraw", {"request": request})
        for request in deciding["request"].values()
        if (_is_completion(request, spec) or _is_proposed(request, spec))
    ]


def _a_settled_variable_retires_its_proposed_value(
    c: Completion, states: States
) -> list[Invocation]:
    """A proposed value for a variable the specification has since settled
    asks about a choice nobody has, so it goes — unless the completion itself
    is chosen.  A chosen completion is the record that the person is taking
    every value, and `AnAdoptedCompletionIsTakenValueByValue` is at that
    moment choosing them in turn; a value settled by an earlier sibling is
    answered by the adoption already under way, and withdrawing it would make
    that answer fail.
    """
    if c.failed:
        return []
    spec = c.output["spec"]
    deciding = states["Deciding"].state()
    if any(
        _is_completion(deciding["request"].get(key), spec)
        for key in deciding["chosen"]
    ):
        return []
    asserted = states["Asserting"].state()["asserted"].get(spec, {})
    settled = c.output.get("settled", {})
    return [
        Invocation("Deciding", "withdraw", {"request": q["request"]})
        for q in _pending_proposed(states, spec)
        if q["request"]["variable"] in asserted or q["request"]["variable"] in settled
    ]


def _the_model_may_introduce_the_person(c: Completion, _: States) -> list[Invocation]:
    """What the person said of themselves, recorded on their behalf.

    The party is the person, as with `TheModelMayAssertAValue`: the model
    writes the person's profile and has none of its own.
    """
    if c.output.get("tool") != "introduce":
        return []
    given = {d: c.output[d] for d in DETAILS if c.output.get(d)}
    return [Invocation("Profiling", "introduce", {"party": PERSON, **given})]


def _the_model_may_entitle_the_job(c: Completion, _: States) -> list[Invocation]:
    if c.output.get("tool") != "entitle":
        return []
    given = {k: c.output[k] for k in ("title", "site") if c.output.get(k)}
    return [Invocation("Naming", "entitle", {"item": c.output["spec"], **given})]


def _the_model_may_request_a_quote(c: Completion, states: States) -> list[Invocation]:
    """The same `where` and the same `then` as `APersonRequestsAQuote`.

    Down to the party: the quote is issued to the person whoever asked for it,
    because the person is the only party an offer can be made to here.  What
    tells the two apart is the provenance edge.  What the model cannot do is
    the next thing — no rule carries an invocation to `Quoting/commit`.
    """
    if c.output.get("tool") != "quote":
        return []
    input = offer(states, c.output["spec"])
    return [Invocation("Quoting", "quote", input)] if input else []


def _the_canvas_is_shown_before_it_changes(
    c: Completion, _: States
) -> list[Invocation]:
    if c.output.get("tool") not in {
        "assert", "withdraw", "propose", "quote", "show", "hide", "frame", "unframe",
    }:
        return []
    return [
        Invocation("Moding", "focus", {"workspace": WORKSPACE, "surface": "canvas"})
    ]


rules = [
    Sync(
        "TheModelMayAssertAValue",
        ("Copiloting", "invoke"),
        _tool(
            "assert",
            "Asserting",
            "assert",
            "spec",
            "variable",
            "option",
            party=MODEL,
        ),
    ),
    Sync(
        "TheModelMayWithdrawAnAssertion",
        ("Copiloting", "invoke"),
        _tool("withdraw", "Asserting", "withdraw", "spec", "variable"),
    ),
    Sync(
        "TheModelMayProposeACompletion",
        ("Copiloting", "invoke"),
        _the_model_may_propose_a_completion,
    ),
    Sync(
        "ACompletionIsPutToThePerson",
        ("Constraining", "complete"),
        _a_completion_is_put_to_the_person,
    ),
    Sync(
        "AProposedValueIsPutToThePerson",
        ("Constraining", "complete"),
        _a_proposed_value_is_put_to_the_person,
    ),
    Sync(
        "AnAdoptedCompletionIsTakenValueByValue",
        ("Deciding", "choose"),
        _an_adopted_completion_is_taken_value_by_value,
    ),
    Sync(
        "AnAdoptedValueBecomesAnAssertion",
        ("Deciding", "choose"),
        _an_adopted_value_becomes_an_assertion,
    ),
    Sync(
        "ADeclinedCompletionIsDeclinedValueByValue",
        ("Deciding", "decline"),
        _a_declined_completion_is_declined_value_by_value,
    ),
    Sync(
        "AChangedSpecificationWithdrawsItsProposal",
        ("Asserting", "assert"),
        _a_changed_specification_withdraws_its_proposal,
    ),
    Sync(
        "AChangedSpecificationWithdrawsItsProposal",
        ("Asserting", "withdraw"),
        _a_changed_specification_withdraws_its_proposal,
    ),
    Sync(
        "ASettledVariableRetiresItsProposedValue",
        ("Constraining", "assume"),
        _a_settled_variable_retires_its_proposed_value,
    ),
    Sync(
        "ASettledVariableRetiresItsProposedValue",
        ("Constraining", "incline"),
        _a_settled_variable_retires_its_proposed_value,
    ),
    Sync(
        "TheModelMayIntroduceThePerson",
        ("Copiloting", "invoke"),
        _the_model_may_introduce_the_person,
    ),
    Sync(
        "TheModelMayEntitleTheJob",
        ("Copiloting", "invoke"),
        _the_model_may_entitle_the_job,
    ),
    Sync(
        "TheModelMayRequestAQuote",
        ("Copiloting", "invoke"),
        _the_model_may_request_a_quote,
    ),
    # The one permission the model holds on the same terms as the person, and
    # the one that changes no fact: which facts the canvas shows beside each
    # item.  A facet names something a concept already holds, so the model
    # can choose what the person sees and cannot make a fact up.
    Sync(
        "TheModelMayShowAFacet",
        ("Copiloting", "invoke"),
        _tool("show", "Showing", "show", "facet", lens=WORKSPACE),
    ),
    Sync(
        "TheModelMayHideAFacet",
        ("Copiloting", "invoke"),
        _tool("hide", "Showing", "hide", "facet", lens=WORKSPACE),
    ),
    # Likewise which items: the model may narrow the canvas to what followed
    # from one assertion, and widen it again.  The frame it passes is the
    # same value a person's click passes.
    Sync(
        "TheModelMayFrameTheCanvas",
        ("Copiloting", "invoke"),
        _tool("frame", "Framing", "frame", "frame", lens=WORKSPACE),
    ),
    Sync(
        "TheModelMayUnframeTheCanvas",
        ("Copiloting", "invoke"),
        _tool("unframe", "Framing", "unframe", lens=WORKSPACE),
    ),
    Sync(
        "TheCanvasIsShownBeforeItChanges",
        ("Copiloting", "invoke"),
        _the_canvas_is_shown_before_it_changes,
    ),
]
