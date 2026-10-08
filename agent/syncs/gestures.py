"""Gestures — `docs/syncs/gestures.md`.

What a person may do. Every one of these is a permission, stated positively,
in exactly the form the model's permissions take in `conduct.py`. The list is
deliberately readable side by side with that one: the difference between them
is the whole of what the model may not do.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from engine import Completion, Invocation, States, Sync
from . import readings

WORKSPACE = "workspace"

# The party a gesture is made by.  It is stated in the `then` clause rather
# than read off the completion's actor, because `Asserting/assert` takes a
# party as an argument and a rule that says who is asserting is the readable
# form of that — the case's `ApplyMapping` names `interpreter` the same way.
PERSON = "person"

# The one basis the catalogue seeds; the terms a quote is reckoned on.
BASIS = "catalogue"

# The party whose profile is the letterhead.  Seeded at boot from the
# catalogue's `vendor` block; no gesture and no tool writes it.
SELLER = "seller"


def today() -> str:
    return date.today().isoformat()


# The two conditions of `APersonRequestsAQuote` that address the proposal, in
# the order `quotable` gives its reason in.
ADDRESSEE = ("name", "site")


def unaddressed(states: States, spec: str) -> list[str] | None:
    """`?s lacks only ?f for a quote` (`docs/syncs/conduct.md`), with `?f`
    possibly empty: every condition of `APersonRequestsAQuote` holds of the
    specification but the two that address it, and these of those two fail,
    in `ADDRESSEE`'s order.  None when another condition fails.  `offer` reads
    it too, so the two cannot drift apart."""
    constraining = states["Constraining"].state()
    asserting = states["Asserting"].state()
    settled = constraining["settled"].get(spec, {})
    if any(variable not in settled for variable in constraining["range"]):
        return None
    assumed = constraining["assumed"].get(spec, {})
    inclined = constraining["inclined"].get(spec, {})
    refused = constraining["refused"].get(spec, {})
    asserted = asserting["asserted"].get(spec, {})
    # `?v -> ?o is met in ?s`, as Propagation defines it: assumed, or inclined
    # with nothing refused.  A value held softly counts as met whether
    # honoured or yielded: a preference that gave way is not a requirement
    # the offer fails.
    if any(
        assumed.get(v) != o and not (inclined.get(v) == o and not refused.get(v))
        for v, o in asserted.items()
    ):
        return None
    if not states["Pricing"].total(settled.values(), BASIS)["complete"]:
        return None
    given = {
        "name": readings.profile(states["Profiling"].state(), PERSON).get("name"),
        "site": states["Naming"].state()["site"].get(spec, ""),
    }
    return [field for field in ADDRESSEE if not given[field]]


def offer(states: States, spec: str) -> dict[str, Any] | None:
    """The `where` of `APersonRequestsAQuote`, shared with the model's rule.

    The catalogue's `Quoting.quote` requires `valid` and `priced`, and this is
    what that means for the stand-in engine: every variable settled, nothing
    asserted left unmet, and Pricing's total complete — which it is exactly
    when a term has been chosen rather than presumed.  A proposal is also
    addressed, so the person must have a name and the job a site.  When any of
    that fails the rule declines to fire, which is the ordinary meaning of a
    `where`; the view says which condition failed.

    The item is a value, not a reference — the specification's identity, its
    settled assignment, the requirements as they stood and the grounds of
    every value, copied — so the quote holds what was true and cannot see the
    specification or the catalogue move.  The terms are likewise copied: the
    seller's stipulations, both parties' profiles and the job's name as they
    stood, so that the document renders from the offer alone and a change to
    any of them next month does not change a quote issued this month.  See
    `docs/concepts/quoting.md`.
    """
    if unaddressed(states, spec) != []:
        return None
    constraining = states["Constraining"].state()
    asserting = states["Asserting"].state()
    settled = constraining["settled"].get(spec, {})
    total = states["Pricing"].total(settled.values(), BASIS)
    customer = readings.profile(states["Profiling"].state(), PERSON)
    naming = states["Naming"].state()
    site = naming["site"].get(spec, "")
    # The clauses that hold for what is settled: an option's scope of supply
    # is printed only in an offer that carries the option.
    stipulated = readings.terms(
        states["Stipulating"].state(),
        BASIS,
        states["Stipulating"].terms(BASIS, settled.values())["clauses"],
    )
    return {
        "item": {
            "spec": spec,
            "holds": dict(settled),
            # The clauses as they stand, each with the option answering it,
            # frozen with the values: a proposal's basis of design is what
            # the customer asked for, in their words, beside what answers it.
            "requires": readings.requires(
                states["Specifying"].state(), states["Binding"].state(), spec
            ),
            # Why each value holds, and what it added to the price, frozen
            # too: the catalogue is read afresh at every boot, and an offer
            # read against what was asked must say what was true at issue.
            "grounds": readings.grounds(
                constraining, asserting, states["Pricing"].state(), spec, settled
            ),
        },
        "to": PERSON,
        # One sum, for the equipment supplied and installed.  The line
        # prices are in the grounds and sum to it; the proposal prints the
        # sum alone.
        "amount": total["capital"],
        "terms": {
            "basis": total["basis"],
            "months": total["term"],
            "recurring": total["recurring"],
            "seller": readings.profile(states["Profiling"].state(), SELLER),
            "customer": customer,
            "title": naming["title"].get(spec, ""),
            "site": site,
            # Where each milestone falls, as the seller reckoned it at issue:
            # the arithmetic is the seller's and may change, and the offer
            # must place dispatch where it was placed when it was made.
            "programme": states["Stipulating"].programme(
                BASIS, settled.values(), total["term"]
            ),
            **stipulated,
        },
        "until": (date.today() + timedelta(days=stipulated["validity"])).isoformat(),
    }


def _carry(act: str, concept: str, action: str, *arguments: str, **fixed: Any):
    def then(c: Completion, _: States) -> list[Invocation]:
        if c.output.get("act") != act:
            return []
        input: dict[str, Any] = {a: c.output[a] for a in arguments if a in c.output}
        input.update(fixed)
        return [Invocation(concept, action, input)]

    return then



DETAILS = ("name", "organisation", "address", "email", "phone")


def _a_person_introduces_themselves(c: Completion, _: States) -> list[Invocation]:
    if c.output.get("act") != "introduce":
        return []
    given = {d: c.output[d] for d in DETAILS if d in c.output}
    return [Invocation("Profiling", "introduce", {"party": PERSON, **given})]


def _a_person_entitles_the_job(c: Completion, _: States) -> list[Invocation]:
    if c.output.get("act") != "entitle":
        return []
    given = {k: c.output[k] for k in ("title", "site") if k in c.output}
    return [Invocation("Naming", "entitle", {"item": c.output["spec"], **given})]


def _a_person_requests_a_quote(c: Completion, states: States) -> list[Invocation]:
    if c.output.get("act") != "quote":
        return []
    input = offer(states, c.output["spec"])
    return [Invocation("Quoting", "quote", input)] if input else []


def _a_person_commits_to_a_quote(c: Completion, _: States) -> list[Invocation]:
    if c.output.get("act") != "commit":
        return []
    return [
        Invocation(
            "Quoting",
            "commit",
            {"quote": c.output["quote"], "party": PERSON, "on": today()},
        )
    ]


def _a_person_states_a_clause(c: Completion, _: States) -> list[Invocation]:
    """`bind a fresh identity as ?c`: the clause is an individual, and the
    rule that states it names it."""
    if c.output.get("act") != "require":
        return []
    return [
        Invocation(
            "Specifying",
            "require",
            {
                "spec": c.output.get("spec"),
                "party": PERSON,
                "text": c.output.get("text", ""),
                "clause": readings.fresh("c"),
            },
        )
    ]


rules = [
    Sync(
        "APersonStartsASpecification",
        ("Copiloting", "gesture"),
        _carry("start", "Asserting", "start", "spec"),
    ),
    Sync(
        "APersonSays",
        ("Copiloting", "gesture"),
        _carry("say", "Conversing", "say", "text", party=PERSON),
    ),
    Sync(
        "APersonAssertsAValue",
        ("Copiloting", "gesture"),
        _carry(
            "assert", "Asserting", "assert", "spec", "variable", "option", party=PERSON
        ),
    ),
    Sync(
        "APersonWithdrawsAnAssertion",
        ("Copiloting", "gesture"),
        _carry("withdraw", "Asserting", "withdraw", "spec", "variable"),
    ),
    Sync(
        "APersonDiscardsTheSpecification",
        ("Copiloting", "gesture"),
        _carry("discard", "Asserting", "discard", "spec"),
    ),
    Sync(
        "APersonAnswersAQuestion",
        ("Copiloting", "gesture"),
        _carry("choose", "Deciding", "choose", "request", "option"),
    ),
    Sync(
        "APersonDeclinesToAnswer",
        ("Copiloting", "gesture"),
        _carry("decline", "Deciding", "decline", "request"),
    ),
    # Which facts the canvas shows beside each item.  The lens is the
    # workspace, as the surface's workspace is; the choice changes no fact.
    Sync(
        "APersonShowsAFacet",
        ("Copiloting", "gesture"),
        _carry("show", "Showing", "show", "facet", lens=WORKSPACE),
    ),
    Sync(
        "APersonHidesAFacet",
        ("Copiloting", "gesture"),
        _carry("hide", "Showing", "hide", "facet", lens=WORKSPACE),
    ),
    # Which items the canvas shows: narrowed to what bears on one question,
    # or everything.  The frame is a value the read side interprets.
    Sync(
        "APersonFramesTheCanvas",
        ("Copiloting", "gesture"),
        _carry("frame", "Framing", "frame", "frame", lens=WORKSPACE),
    ),
    Sync(
        "APersonUnframesTheCanvas",
        ("Copiloting", "gesture"),
        _carry("unframe", "Framing", "unframe", lens=WORKSPACE),
    ),
    Sync(
        "APersonIntroducesThemselves",
        ("Copiloting", "gesture"),
        _a_person_introduces_themselves,
    ),
    Sync(
        "APersonEntitlesTheJob", ("Copiloting", "gesture"), _a_person_entitles_the_job
    ),
    Sync(
        "APersonRequestsAQuote", ("Copiloting", "gesture"), _a_person_requests_a_quote
    ),
    Sync(
        "APersonCommitsToAQuote", ("Copiloting", "gesture"), _a_person_commits_to_a_quote
    ),
    Sync(
        "APersonRevokesAQuote",
        ("Copiloting", "gesture"),
        _carry("revoke", "Quoting", "revoke", "quote"),
    ),
    # A clause in the person's words.  The act is `require`, not `state`,
    # for the reason `docs/concepts/specifying.md` gives; the rule keeps the
    # name of what it is for.
    Sync(
        "APersonStatesAClause",
        ("Copiloting", "gesture"),
        _a_person_states_a_clause,
    ),
    Sync(
        "APersonSettlesAClause",
        ("Copiloting", "gesture"),
        _carry("settle", "Specifying", "settle", "clause", "negotiability"),
    ),
    Sync(
        "APersonRelaxesAClause",
        ("Copiloting", "gesture"),
        _carry("relax", "Specifying", "relax", "clause", "text"),
    ),
    Sync(
        "APersonRewordsAClause",
        ("Copiloting", "gesture"),
        _carry("reword", "Specifying", "reword", "clause", "text"),
    ),
    Sync(
        "APersonMovesAClause",
        ("Copiloting", "gesture"),
        _carry("move", "Specifying", "move", "clause", "before"),
    ),
    Sync(
        "APersonStrikesAClause",
        ("Copiloting", "gesture"),
        _carry("strike", "Specifying", "strike", "clause"),
    ),
]
