"""Conduct — `docs/syncs/conduct.md`.

What the model may do, stated positively.  MSM §5.3.

The enforcement is in what is absent.  No rule below invokes `Deciding/choose`,
`Pricing`, `Footprinting` or `Cataloguing`, so the model cannot adopt a
completion, set a price or change the catalogue.  Not because it is told not
to — because an action reaches the log only by way of some synchronization, and
there is no rule that would carry the invocation through.

"Can the agent change a price?" is therefore answered by reading the `then`
clauses in this file, rather than by reasoning about what a language model is
likely to infer from a paragraph of English.
"""

from __future__ import annotations

from engine import Completion, Invocation, States, Sync

WORKSPACE = "workspace"

# The one basis the catalogue seeds.  A second would be a second set of terms
# to quote on, and the state can now hold one.
BASIS = "catalogue"


def _tool(name: str, concept: str, action: str, *arguments: str):
    def then(c: Completion, _: States) -> list[Invocation]:
        if c.output.get("tool") != name:
            return []
        return [
            Invocation(
                concept, action, {a: c.output[a] for a in arguments if a in c.output}
            )
        ]

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


def _an_adopted_completion_becomes_requirements(
    c: Completion, states: States
) -> list[Invocation]:
    """One binding per pair, one invocation per binding — WYSIWID §6.5.

    Requirements are stated without a loop appearing in a concept.

    Only the genuinely open variables are stated.  Adopting a completion fills
    the gaps: it does not restate what you already required, and it does not
    turn what merely follows from the rules into something you demanded.  That
    second exclusion is what keeps the distinction between *asked for* and
    *follows from* readable after a completion is adopted, which is most of
    what the interface is for.

    The rule is discriminated from `TheConcededRequirementIsWithdrawn` by the
    request's `about`, not by the shape of an untyped option.  Both match
    `Deciding/choose`; a completion of a single variable and a conflict
    candidate are otherwise indistinguishable.

    A *preference* is not in that exclusion, and the asymmetry is the point.
    A preference does not narrow anything, so a preferred variable is still
    open and still has to be settled by the completion — a completion is
    exactly the thing that turns "I would like panoramic glass" into "and you
    can have it".  Leaving preferences out would have the price quoted with the
    proposal differ from the price on the canvas a moment later.
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
    specifying = states["Specifying"].state()
    settled = states["Constraining"].state()["settled"].get(spec, {})
    already = set(specifying["required"].get(spec, {})) | set(settled)
    return [
        Invocation(
            "Specifying",
            "require",
            {"spec": spec, "variable": variable, "option": chosen},
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
    chosen for a state that has gone — in the worst case the very requirement
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


def _the_canvas_is_shown_before_it_changes(
    c: Completion, _: States
) -> list[Invocation]:
    if c.output.get("tool") not in {"require", "prefer", "withdraw", "propose"}:
        return []
    return [
        Invocation("Moding", "focus", {"workspace": WORKSPACE, "surface": "canvas"})
    ]


rules = [
    Sync(
        "TheModelMayStateARequirement",
        ("Copiloting", "invoke"),
        _tool("require", "Specifying", "require", "spec", "variable", "option"),
    ),
    Sync(
        "TheModelMayPreferAnOption",
        ("Copiloting", "invoke"),
        _tool("prefer", "Specifying", "prefer", "spec", "variable", "option"),
    ),
    Sync(
        "TheModelMayWithdrawARequirement",
        ("Copiloting", "invoke"),
        _tool("withdraw", "Specifying", "withdraw", "spec", "variable"),
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
        "AnAdoptedCompletionBecomesRequirements",
        ("Deciding", "choose"),
        _an_adopted_completion_becomes_requirements,
    ),
    Sync(
        "AChangedSpecificationWithdrawsItsProposal",
        ("Specifying", "require"),
        _a_changed_specification_withdraws_its_proposal,
    ),
    Sync(
        "AChangedSpecificationWithdrawsItsProposal",
        ("Specifying", "withdraw"),
        _a_changed_specification_withdraws_its_proposal,
    ),
    Sync(
        "TheCanvasIsShownBeforeItChanges",
        ("Copiloting", "invoke"),
        _the_canvas_is_shown_before_it_changes,
    ),
]
