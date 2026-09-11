"""Conduct — `docs/syncs/conduct.md`.

What the model may do, stated positively.  MSM §5.3.

The enforcement is in what is absent.  No rule below invokes `Deciding/choose`,
`Quoting/commit`, `Pricing`, `Footprinting` or `Cataloguing`, so the model
cannot adopt a completion, accept a quote, set a price or change the
catalogue.  Not because it is told not to — because an action reaches the log
only by way of some synchronization, and there is no rule that would carry the
invocation through.

"Can the agent change a price?" is therefore answered by reading the `then`
clauses in this file, rather than by reasoning about what a language model is
likely to infer from a paragraph of English.
"""

from __future__ import annotations

from typing import Any

from engine import Completion, Invocation, States, Sync

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
                "request": {"spec": c.output["spec"], "about": "completion"},
                "reason": "adopt this completion",
                "options": [c.output["assignment"]],
            },
        )
    ]


def _an_adopted_completion_becomes_assertions(
    c: Completion, states: States
) -> list[Invocation]:
    """One binding per pair, one invocation per binding — WYSIWID §6.5.

    Assertions are made without a loop appearing in a concept.

    Only the genuinely open variables are asserted.  Adopting a completion
    fills the gaps: it does not restate what you already asserted, and it does
    not turn what merely follows from the rules into something you demanded.
    That second exclusion is what keeps the distinction between *asserted* and
    *follows from* readable after a completion is adopted, which is most of
    what the interface is for.

    The rule is discriminated from `TheConcededAssertionIsWithdrawn` by the
    request's `about`, not by the shape of an untyped option.  Both match
    `Deciding/choose`; a completion of a single variable and a conflict
    candidate are otherwise indistinguishable.

    The party is the person, not the model.  A person adopting a proposal is
    asserting the values in it — that is what adoption is — and the rule that
    lets them is the one the model has no counterpart for.
    """
    if c.failed:
        return []
    request = c.output.get("request")
    if not isinstance(request, dict) or request.get("about") != "completion":
        return []
    assignment = c.output.get("option")
    if not isinstance(assignment, dict):
        return []
    spec = request["spec"]
    asserting = states["Asserting"].state()
    settled = states["Constraining"].state()["settled"].get(spec, {})
    already = set(asserting["asserted"].get(spec, {})) | set(settled)
    return [
        Invocation(
            "Asserting",
            "assert",
            {
                "spec": spec,
                "variable": variable,
                "option": chosen,
                "party": PERSON,
            },
        )
        for variable, chosen in assignment.items()
        if variable not in already
    ]


def _a_changed_specification_withdraws_its_proposal(
    c: Completion, _: States
) -> list[Invocation]:
    """A proposal lasts exactly as long as the state it assumed.

    `complete` is computed against the assumptions holding when `propose` ran.
    Let the specification move underneath it and adopting it restates values
    chosen for a state that has gone — in the worst case the very assertion
    the person just gave up to resolve a conflict.

    Reachable only since a conflict and a completion could be open at once.
    Before that the second question destroyed the first, and that destruction
    was the only thing keeping this from happening.
    """
    if c.failed:
        return []
    return [
        Invocation(
            "Deciding",
            "withdraw",
            {"request": {"spec": c.output["spec"], "about": "completion"}},
        )
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
        "AnAdoptedCompletionBecomesAssertions",
        ("Deciding", "choose"),
        _an_adopted_completion_becomes_assertions,
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
