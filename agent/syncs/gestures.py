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


def offer(states: States, spec: str) -> dict[str, Any] | None:
    """The `where` of `APersonRequestsAQuote`, shared with the model's rule.

    The catalogue's `Quoting.quote` requires `valid` and `priced`, and this is
    what that means for the stand-in engine: every variable settled, nothing
    asserted left unmet, and Pricing's total complete — which it is exactly
    when a term has been chosen rather than presumed.  A proposal is also
    addressed, so the person must have a name and the job a site.  When any of
    that fails the rule declines to fire, which is the ordinary meaning of a
    `where`; the view says which condition failed.

    The item is a value, not a reference — the specification's identity and
    its settled assignment, copied — so the quote holds what was true and
    cannot see the specification move.  The terms are likewise copied: the
    seller's stipulations, both parties' profiles and the job's name as they
    stood, so that the document renders from the offer alone and a change to
    any of them next month does not change a quote issued this month.  See
    `docs/concepts/quoting.md`.
    """
    constraining = states["Constraining"].state()
    asserting = states["Asserting"].state()
    settled = constraining["settled"].get(spec, {})
    if any(variable not in settled for variable in constraining["range"]):
        return None
    assumed = constraining["assumed"].get(spec, {})
    asserted = asserting["asserted"].get(spec, {})
    if any(assumed.get(v) != o for v, o in asserted.items()):
        return None
    total = states["Pricing"].total(settled.values(), BASIS)
    if not total["complete"]:
        return None
    customer = states["Profiling"].profile(PERSON)
    naming = states["Naming"].state()
    site = naming["site"].get(spec, "")
    if not customer.get("name") or not site:
        return None
    stipulated = states["Stipulating"].terms(BASIS)
    return {
        "item": {
            "spec": spec,
            "holds": dict(settled),
            # The clauses as they stand, each with the option answering it,
            # frozen with the values: a proposal's basis of design is what
            # the customer asked for, in their words, beside what answers it.
            "requires": _requires(states, spec),
        },
        "to": PERSON,
        # One sum, for the equipment supplied and installed.  Line prices are
        # the catalogue's business and do not appear on a proposal.
        "amount": total["capital"],
        "terms": {
            "basis": total["basis"],
            "months": total["term"],
            "recurring": total["recurring"],
            "seller": states["Profiling"].profile(SELLER),
            "customer": customer,
            "title": naming["title"].get(spec, ""),
            "site": site,
            **stipulated,
        },
        "until": (date.today() + timedelta(days=stipulated["validity"])).isoformat(),
    }


def _requires(states: States, spec: str) -> list[dict[str, Any]]:
    """`Specifying: { ?s clauses: ?c* }` with `Binding: { ?ch answers: ?c }`,
    read for copying into a quote's item."""
    specifying = states["Specifying"].state()
    binding = states["Binding"].state()
    selection = next((s for s, of in binding["for"].items() if of == spec), None)
    choices = binding["choices"].get(selection, []) if selection else []
    return [
        {
            "clause": clause,
            "text": specifying["text"][clause],
            "negotiability": specifying["negotiability"][clause],
            "answeredBy": [
                binding["value"][ch] for ch in choices if binding["answers"][ch] == clause
            ],
        }
        for clause in specifying["clauses"].get(spec, [])
    ]


def _carry(act: str, concept: str, action: str, *arguments: str, **fixed: Any):
    def then(c: Completion, _: States) -> list[Invocation]:
        if c.output.get("act") != act:
            return []
        input: dict[str, Any] = {a: c.output[a] for a in arguments if a in c.output}
        input.update(fixed)
        return [Invocation(concept, action, input)]

    return then


def _a_person_focuses_a_surface(c: Completion, _: States) -> list[Invocation]:
    if c.output.get("act") != "focus":
        return []
    return [
        Invocation(
            "Moding", "focus", {"workspace": WORKSPACE, "surface": c.output["surface"]}
        )
    ]


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
    Sync(
        "APersonFocusesASurface", ("Copiloting", "gesture"), _a_person_focuses_a_surface
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
        _carry("require", "Specifying", "require", "spec", "text", party=PERSON),
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
