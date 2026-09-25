"""The read side.

WYSIWID §6.4 separates reads from writes strictly: "reads are handled by
client-driven querying capabilities […] and writes are handled directly by the
action API."  This module is the query side.  It composes concept state — and
the arithmetic each concept declares over its own — into the one shape the
canvas needs.  It invokes nothing and writes nothing.

It reads two things: concept state, and the action log.  The second is what
answers *how did this variable come to say that*, and the answer is a
provenance edge: every completion carries the name of the synchronization that
authorised it (WYSIWID §6.6), so the difference between a value you asked for,
one you adopted from a proposal, and one the assistant stated on your behalf is
already recorded and needs no extra field anywhere.
"""

from __future__ import annotations

import re
from datetime import date
from typing import Any

from engine import Engine
from wiring import BASIS, WORKSPACE
from syncs import readings

# Which rule put an assertion on record, in words.  Three sentences, three
# rules, and no field anywhere recording which: the difference between them is
# a provenance edge.  `Asserting.assertedBy` answers a different question —
# *whose value is this* — and `APersonAssertsAValue` and
# `AnAdoptedValueBecomesAnAssertion` both answer it with the same party.
HOW = {
    "APersonAssertsAValue": "you asked for this",
    "TheModelMayAssertAValue": "the assistant asked for this",
    "AnAdoptedValueBecomesAnAssertion": "adopted from a proposal",
    "AChoiceReachesTheAssertions": "answers a requirement",
    "ASubstituteReachesTheAssertions": "answers a requirement, in place of an earlier value",
    "APersonRequestsAQuote": "you asked for this",
    "TheModelMayRequestAQuote": "the assistant asked for this",
}

# The same edge under a second actor.  A browser agent's invocations fire the
# model's rules — the rules match on the tool, not on who called it — so the
# provenance edge alone reads "the assistant", and the actor on the record is
# what says otherwise.  See docs/syncs/conduct.md, "A browser agent, on the
# same terms".
BROWSER = "browser"
SAID = {
    ("TheModelMayAssertAValue", BROWSER): "a browser agent asked for this",
    ("TheModelMayRequestAQuote", BROWSER): "a browser agent asked for this",
}


def said(via: str | None, actor: str | None, default: str | None = None) -> str | None:
    """The sentence for a provenance edge, read with the actor beside it."""
    return SAID.get((via or "", actor or "")) or HOW.get(via or "", default)


def _provenance(engine: Engine, spec: str) -> dict[str, tuple[str, str]]:
    """The rule behind the most recent assertion recorded for each variable,
    and the actor that performed the root action it followed from.

    Scanned from the boot mark rather than from the start of the log: the
    catalogue's arrival is a thousand-odd records of `Cataloguing` and
    `Pricing`, and no assertion can precede it.
    """
    how: dict[str, tuple[str, str]] = {}
    for record in engine.log.records(since=engine.settled_at, limit=1_000_000):
        if record.kind != "completion" or record.concept != "Asserting":
            continue
        if record.action not in {"assert", "withdraw"}:
            continue
        output = record.output or {}
        if output.get("spec") != spec or "variable" not in output:
            continue
        if record.action == "withdraw":
            how.pop(output["variable"], None)
        else:
            how[output["variable"]] = (record.via or "recorded at boot", record.actor)
    return how


def canvas(engine: Engine, spec: str, grid: str = "today") -> dict[str, Any]:
    with engine.turn:
        return _canvas(engine, spec, grid)


def _canvas(engine: Engine, spec: str, grid: str) -> dict[str, Any]:
    catalogue = engine.state("Cataloguing")
    constraining = engine.state("Constraining")
    asserting = engine.state("Asserting")
    moding = engine.state("Moding")
    showing = engine.state("Showing")
    pricing = engine.concepts["Pricing"]
    footprinting = engine.concepts["Footprinting"]
    solver = engine.concepts["Constraining"]

    # Which facts the canvas shows at a glance — `Showing`, read for the
    # workspace's lens.  The list carries every facet offered, in words, so
    # the menu and the model's digest read the same thing.
    shown = set(showing["shown"].get(WORKSPACE, []))
    facets = [
        {"facet": facet, "about": showing["about"].get(facet, facet), "shown": facet in shown}
        for facet in showing["offered"].get(WORKSPACE, [])
    ]
    capital = pricing.state()["capital"]
    monthly = pricing.state()["monthly"]
    embodied = footprinting.state()["embodied"]

    asserted = asserting["asserted"].get(spec, {})
    assumed = constraining["assumed"].get(spec, {})
    inclined = constraining["inclined"].get(spec, {})
    possible = constraining["possible"].get(spec, {})
    settled = constraining["settled"].get(spec, {})
    owing = constraining["owing"].get(spec, {})
    following = constraining["following"].get(spec, {})
    refused = constraining["refused"].get(spec, {})
    heading = catalogue["heading"]

    # The frame, from `Framing`: which items the canvas shows.  One kind so
    # far — what followed from one assertion — and the membership test is
    # this read's, not the concept's.  See docs/concepts/framing.md.
    frame = engine.state("Framing")["framed"].get(WORKSPACE)
    framed_on = (
        frame.get("variable")
        if isinstance(frame, dict) and frame.get("by") == "assertion"
        else None
    )

    def in_frame(name: str, offered: list[str], allowed: set[str]) -> bool:
        if framed_on is None:
            return True
        if name == framed_on or framed_on in following.get(name, []):
            return True
        if name in asserted and settled.get(name) != asserted[name]:
            # Unmet or yielded: did the framing assertion take part in
            # refusing it, or in the inclination giving way?
            return framed_on in solver.narrowing(spec, name, asserted[name])
        if name not in asserted and name not in settled:
            # Open: did the framing assertion rule any of its options out?
            return any(
                framed_on in solver.narrowing(spec, name, option)
                for option in offered
                if option not in allowed
            )
        return False
    how = _provenance(engine, spec)
    clauses = ledger(engine, spec)
    # Which clauses each asserted option answers — the same choices, indexed
    # from the value's side, so a card can say what its value is for.
    answering: dict[str, list[dict[str, str]]] = {}
    for clause in clauses:
        for choice in clause["answers"]:
            answering.setdefault(choice["value"], []).append(
                {"clause": clause["clause"], "text": clause["text"]}
            )

    # What the assistant proposed for each variable still open, from the
    # `Deciding` requests that name a variable.  Each is a question of its own
    # beside its row; the completion as a whole is the question below.
    pending = [
        q
        for q in readings.pending(engine.state("Deciding"))
        if isinstance(q["request"], dict) and q["request"].get("spec") == spec
    ]
    proposed = {
        q["request"]["variable"]: {
            "option": q["options"][0]["option"],
            "label": catalogue["label"].get(q["options"][0]["option"], q["options"][0]["option"]),
            "request": q["request"],
        }
        for q in pending
        if q["request"].get("about") == "completion"
        and "variable" in q["request"]
        and q["options"]
    }

    variables = []
    for name, offered in catalogue["offers"].items():
        allowed = set(possible.get(name, offered))
        asked = asserted.get(name)
        value = settled.get(name)
        # The value reached the solver softly: it answers only negotiable
        # clauses, and `Constraining` inclines rather than assumes it.
        softly = asked is not None and inclined.get(name) == asked
        if asked is None:
            standing = "follows" if value is not None else "open"
        elif assumed.get(name) == asked:
            standing = "asked"
        elif softly and not refused.get(name):
            # Met softly.  Honoured where it could be, and yielded where it
            # could not: read from `settled` beside `inclined`, recorded by
            # nobody.  A refusal against an inclined value is a hardening
            # that failed, and that is unmet.
            standing = "asked" if value == asked else "yielded"
        else:
            standing = "unmet"
        variables.append(
            {
                "name": name,
                "heading": catalogue["heading"].get(name, name),
                "family": catalogue["family"].get(name, "other"),
                "standing": standing,
                "asked": asked,
                "softly": softly,
                "how": said(*how[name], default=how[name][0])
                if asked and name in how
                else None,
                "answers": answering.get(asked, []) if asked else [],
                "value": value,
                "owing": [
                    {"rule": rule, "because": constraining["because"].get(rule, rule)}
                    for rule in owing.get(name, [])
                ],
                # The assertions a settled value rests on — the other half of
                # the core that `owing` names the rules from.
                "following": [
                    {"variable": v, "heading": heading.get(v, v)}
                    for v in following.get(name, [])
                ],
                "framed": in_frame(name, offered, allowed),
                "proposed": proposed.get(name),
                "refused": [
                    {"rule": rule, "because": constraining["because"].get(rule, rule)}
                    for rule in refused.get(name, [])
                ],
                "options": [
                    {
                        "id": option,
                        "label": catalogue["label"].get(option, option),
                        "note": catalogue["note"].get(option),
                        "possible": option in allowed,
                        "capital": capital.get(option),
                        "monthly": monthly.get(option),
                        "embodied": embodied.get(option),
                        # The one facet that costs a solver check per option,
                        # asked only while it is shown.
                        "excluded": [
                            {"rule": rule, "because": constraining["because"].get(rule, rule)}
                            for rule in (
                                solver.excluding(spec, name, option)
                                if "excluded" in shown and option not in allowed
                                else []
                            )
                        ],
                    }
                    for option in offered
                ],
            }
        )

    chosen = list(settled.values())
    # Every open question, not one.  A conflict and a proposed completion are
    # two requests about the same specification and can be pending together;
    # they used to share a request key, so asking either erased the other.
    # A proposed value is a question too, and rides beside its variable
    # above rather than here.
    questions = [q for q in pending if "variable" not in q["request"]]
    for q in questions:
        q["about"] = q["request"].get("about")

    # What each answer to a conflict would cost — the ripple and both deltas,
    # per option, so the person chooses with the consequences in view rather
    # than by the assertion's name alone.  A read of `Constraining` against
    # assumptions nobody has made: give this one up, and try every unmet
    # assertion again, which is what the rules would do.
    price_now = pricing.total(chosen, BASIS)
    footprint_now = footprinting.footprint(chosen, grid, BASIS)

    def foresee(would: dict[str, str], softly_would: dict[str, str]) -> dict[str, Any]:
        """What the specification would settle under these assumptions in
        place of its own, and what that would cost against now."""
        seen = solver.foreseeing(spec, would, softly_would)
        after = seen["settled"]
        follows = [
            {
                "variable": v,
                "heading": heading.get(v, v),
                "option": o,
                "label": catalogue["label"].get(o, o),
            }
            for v, o in after.items()
            if v not in would and settled.get(v) != o
        ]
        # The other half of the ripple: what is settled now and would not
        # be — the values an assertion forced, no longer forced once it goes.
        # Without it a price drop stands with nothing said for it.
        reopens = [
            {
                "variable": v,
                "heading": heading.get(v, v),
                "option": o,
                "label": catalogue["label"].get(o, o),
            }
            for v, o in settled.items()
            # Not the assertion given up itself: it is the answer, not a
            # consequence of it.
            if v not in would and v not in after and v not in asserted
        ]
        price_then = pricing.total(after.values(), BASIS)
        footprint_then = footprinting.footprint(after.values(), grid, BASIS)
        return {
            "buildable": seen["buildable"],
            "follows": follows,
            "reopens": reopens,
            "instalment": round(price_then["instalment"] - price_now["instalment"], 2),
            "lifetime": round(price_then["lifetime"] - price_now["lifetime"], 2),
            "carbon": (
                footprint_then["total"] - footprint_now["total"]
                if footprint_then["complete"] and footprint_now["complete"]
                else None
            ),
        }

    for q in questions:
        if q["about"] != "conflict":
            continue
        foreseen = []
        for option in q["options"]:
            given_up = option.get("variable")
            would = {
                v: o
                for v, o in asserted.items()
                if v != given_up and inclined.get(v) != o
            }
            softly_would = {
                v: o
                for v, o in asserted.items()
                if v != given_up and inclined.get(v) == o
            }
            foreseen.append({**option, **foresee(would, softly_would)})
        q["foreseen"] = foreseen

    # What taking a proposed value would do — the same read, asked with the
    # value assumed on top of what holds.  One solver survey per proposed
    # value, so it is a facet, computed only while it is shown, as `excluded`
    # is.  `docs/syncs/conduct.md`, "What taking a value would do is a read".
    if "consequences" in shown:
        for v in variables:
            if v["proposed"]:
                v["proposed"]["foreseen"] = foresee(
                    {**assumed, v["name"]: v["proposed"]["option"]}, dict(inclined)
                )

    quotes = _quotes(engine, spec, grid, settled)
    profiling = engine.state("Profiling")
    customer = readings.profile(profiling, "person")
    seller = readings.profile(profiling, "seller")
    naming = engine.state("Naming")
    project = {"title": naming["title"].get(spec, ""), "site": naming["site"].get(spec, "")}

    # Why a quote cannot be requested yet, in words — the negation of the
    # `where` of `APersonRequestsAQuote`, condition by condition.  A reason
    # that lived only in a rule would be invisible, and the control would be a
    # button that goes nowhere.
    unmet = sum(1 for v in variables if v["standing"] == "unmet")
    still_open = sum(1 for v in variables if v["standing"] == "open")
    if unmet:
        quotable = {"ok": False, "because": f"{unmet} asserted and not buildable"}
    elif still_open:
        quotable = {"ok": False, "because": f"{still_open} still open"}
    elif not customer.get("name"):
        quotable = {"ok": False, "because": "no name to address the proposal to"}
    elif not project["site"]:
        quotable = {"ok": False, "because": "no site for the lift"}
    else:
        quotable = {"ok": True, "because": "everything is settled, priced and addressed"}

    return {
        "spec": spec,
        "grid": grid,
        "product": engine.catalogue.get("name", ""),
        "currency": engine.catalogue.get("currency", ""),
        "mode": moding["active"].get("workspace", "canvas"),
        "showing": facets,
        "frame": (
            {
                "by": "assertion",
                "variable": framed_on,
                "heading": heading.get(framed_on, framed_on),
                "asked": asserted.get(framed_on),
            }
            if framed_on is not None
            else None
        ),
        "variables": variables,
        "clauses": clauses,
        "price": pricing.total(chosen, BASIS),
        "footprint": footprinting.footprint(chosen, grid, BASIS),
        "questions": questions,
        "quotes": quotes,
        "quotable": quotable,
        "customer": customer,
        "seller": seller,
        "project": project,
        "counts": {
            "asked": sum(1 for v in variables if v["standing"] == "asked"),
            "follows": sum(1 for v in variables if v["standing"] == "follows"),
            "open": sum(1 for v in variables if v["standing"] == "open"),
            "unmet": sum(1 for v in variables if v["standing"] == "unmet"),
            "yielded": sum(1 for v in variables if v["standing"] == "yielded"),
            # The plan's two numbers for slice 1: clauses nobody has answered
            # (the ones left open on purpose excluded), and values asserted
            # with no clause behind them — the control, inside the same build.
            "unanswered": sum(
                1
                for c in clauses
                if not c["answers"] and c["negotiability"] != "open"
            ),
            "unbound": sum(
                1 for v in variables if v["asked"] and not v["answers"]
            ),
        },
        # Behaviour only: the catalogue's arrival is a thousand records of
        # Cataloguing and Pricing, and nobody wants to read it back.
        "log": [
            r.as_json()
            for r in engine.log.records(since=engine.settled_at, limit=24)
            if r.kind == "completion"
        ],
    }


def ledger(engine: Engine, spec: str) -> list[dict[str, Any]]:
    """The requirement ledger: `docs/syncs/binding.md`, "The ledger is a read".

    For each clause of the specification, in the order stated: its text,
    negotiability, who stated it and what it formerly said, and
    the choices currently answering it — each with its value, the variable
    the catalogue says offers it, who decided it, what it replaced and why,
    and a standing read against Asserting and Constraining.  Four concepts'
    exposed state, composed here and maintained by nobody.
    """
    specifying = engine.state("Specifying")
    binding = engine.state("Binding")
    catalogue = engine.state("Cataloguing")
    constraining = engine.state("Constraining")
    asserted = engine.state("Asserting")["asserted"].get(spec, {})
    assumed = constraining["assumed"].get(spec, {})
    inclined = constraining["inclined"].get(spec, {})
    refused = constraining["refused"].get(spec, {})
    settled = constraining["settled"].get(spec, {})
    variable_of = {
        option: variable
        for variable, offered in catalogue["offers"].items()
        for option in offered
    }
    selection = next((s for s, of in binding["for"].items() if of == spec), None)
    choices = binding["choices"].get(selection, []) if selection else []

    def standing(variable: str | None, option: str) -> str:
        if variable is None:
            return "unrealisable"
        if asserted.get(variable) != option:
            return "displaced"
        if assumed.get(variable) == option:
            return "asked"
        if inclined.get(variable) == option and not refused.get(variable):
            return "asked" if settled.get(variable) == option else "yielded"
        return "unmet"

    def describe(choice: str) -> dict[str, Any]:
        option = binding["value"][choice]
        variable = variable_of.get(option)
        replaced = binding["replaces"].get(choice)
        return {
            "choice": choice,
            "value": option,
            "variable": variable,
            "heading": catalogue["heading"].get(variable, variable) if variable else None,
            "label": catalogue["label"].get(option, option),
            "decidedBy": binding["decidedBy"][choice],
            "reason": binding["reason"].get(choice) or None,
            "replaced": (
                catalogue["label"].get(
                    binding["value"].get(replaced), binding["value"].get(replaced)
                )
                if replaced
                else None
            ),
            "standing": standing(variable, option),
        }

    return [
        {
            "clause": clause,
            "text": specifying["text"][clause],
            "negotiability": specifying["negotiability"][clause],
            "statedBy": specifying["statedBy"][clause],
            "formerly": specifying["formerly"].get(clause, []),
            "answers": [
                describe(choice)
                for choice in choices
                if binding["answers"][choice] == clause
            ],
        }
        for clause in specifying["clauses"].get(spec, [])
    ]


def _quotes(
    engine: Engine, spec: str, grid: str, settled: dict[str, str]
) -> list[dict[str, Any]]:
    """The three reads in `docs/concepts/quoting.md`: standing, differs, and
    the quotes themselves.

    A quote holds the assignment as it stood.  The amount and terms are what
    the offer *is* and come back as recorded; the footprint is an estimate,
    recomputed from the frozen item against whichever grid the person is
    looking at.  `differs` is the comparison between the frozen item and the
    live state, which nobody maintains.
    """
    quoting = engine.state("Quoting")
    catalogue = engine.state("Cataloguing")
    footprinting = engine.concepts["Footprinting"]
    now = date.today().isoformat()
    issued = _issued(engine)
    quotes = []
    for number, quote in enumerate(quoting["quotes"], start=1):
        item = quoting["from"][quote]
        if not isinstance(item, dict) or item.get("spec") != spec:
            continue
        holds: dict[str, str] = item.get("holds", {})
        terms = quoting["terms"][quote]
        if quote in quoting["committed"]:
            standing = "committed"
        elif quote in quoting["revoked"]:
            standing = "revoked"
        elif now > quoting["until"][quote]:
            standing = "lapsed"
        else:
            standing = "open"
        via, actor, on = issued.get(quote, ("", "", None))
        quotes.append(
            {
                "quote": quote,
                "number": number,
                "standing": standing,
                "amount": quoting["amount"][quote],
                "terms": terms,
                "issued": on,
                "until": quoting["until"][quote],
                "committed": quoting["committed"].get(quote),
                "issuedTo": quoting["issuedTo"][quote],
                "how": said(via, actor),
                "holds": [
                    {
                        "name": name,
                        "heading": catalogue["heading"].get(name, name),
                        "family": catalogue["family"].get(name, "other"),
                        "value": option,
                        "label": catalogue["label"].get(option, option),
                        "note": catalogue["note"].get(option),
                    }
                    for name, option in holds.items()
                ],
                # The clauses as they stood at issue, each with the option
                # that answered it then.  Frozen with the item; only the
                # catalogue's labels are read live.
                "requires": [
                    {
                        **clause,
                        "answeredBy": [
                            {
                                "value": option,
                                "label": catalogue["label"].get(option, option),
                            }
                            for option in clause.get("answeredBy", [])
                        ],
                    }
                    for clause in item.get("requires", [])
                ],
                "differs": sorted(
                    name for name, option in holds.items() if settled.get(name) != option
                ),
                "footprint": footprinting.footprint(holds.values(), grid, BASIS),
            }
        )
    return quotes


def _issued(engine: Engine) -> dict[str, tuple[str, str, str]]:
    """For each quote, the rule that issued it, the actor whose call it
    followed from, and the day it was issued.

    Both come off the log rather than the concept.  The rule is a provenance
    edge, as for assertions; the date is the completion's timestamp, which the
    concept does not hold because it holds no clock.
    """
    issued: dict[str, tuple[str, str, str]] = {}
    for record in engine.log.records(since=engine.settled_at, limit=1_000_000):
        if record.kind != "completion" or record.concept != "Quoting":
            continue
        if record.action != "quote":
            continue
        quote = (record.output or {}).get("quote")
        if quote:
            issued[quote] = (
                record.via or "",
                record.actor,
                date.fromtimestamp(record.at).isoformat(),
            )
    return issued


# A catalogue individual or value named inside a clause's words, as the
# document writes it: `[[id|label]]`, the id a variable's or an option's.
# `Specifying` holds the token as words; the readers that quote a clause show
# the label.  See docs/syncs/gestures.md, "A clause is stated in the person's
# words".
REFERENCE = re.compile(r"\[\[[a-z0-9_:]+\|([^\]]*)\]\]", re.I)


def plain(text: str) -> str:
    """A clause's words with each reference read as its label."""
    return REFERENCE.sub(r"\1", text)


def digest(engine: Engine, spec: str) -> dict[str, Any]:
    """The same reading, small enough to hand a language model."""
    view = canvas(engine, spec)
    label = {
        option["id"]: option["label"]
        for variable in view["variables"]
        for option in variable["options"]
    }

    def say(variable: dict[str, Any]) -> str:
        value = variable["value"]
        return f"{variable['heading']}: {label.get(value, value)}" if value else ""

    return {
        # What the person requires, in their own words, with what answers
        # each.  The model reads these; no tool lets it write one.
        "required": [
            {
                "clause": c["clause"],
                "text": plain(c["text"]),
                "negotiability": c["negotiability"],
                "answered_by": [
                    f"{a['heading']}: {a['label']}" for a in c["answers"]
                ],
            }
            for c in view["clauses"]
        ],
        "asked": [
            say(v)
            + (" (negotiable)" if v["softly"] else "")
            + (
                f" — answers: {'; '.join(plain(a['text']) for a in v['answers'])}"
                if v["answers"]
                else " — answers no stated requirement"
            )
            for v in view["variables"]
            if v["standing"] == "asked"
        ],
        # A value asked for softly that the rules could not honour: still
        # asserted, still answering its clause, and no question asked, because
        # a preference is by the person's own account the thing to give up.
        "yielded": [
            f"{v['heading']}: {label.get(v['asked'], v['asked'])} was negotiable and gave way"
            + (f"; settled on {label.get(v['value'], v['value'])}" if v["value"] else "")
            for v in view["variables"]
            if v["standing"] == "yielded"
        ],
        "follows": [
            f"{say(v)} — {', '.join(o['because'] for o in v['owing'])}"
            + (
                f" (from {', '.join(f['heading'] for f in v['following'])})"
                if v["following"]
                else ""
            )
            for v in view["variables"]
            if v["standing"] == "follows"
        ],
        "unmet": [
            f"{v['heading']}: {label.get(v['asked'], v['asked'])} cannot be met — "
            + "; ".join(r["because"] for r in v["refused"])
            for v in view["variables"]
            if v["standing"] == "unmet"
        ],
        "open": [
            {
                "variable": v["name"],
                "heading": v["heading"],
                "proposed": v["proposed"]["label"] if v["proposed"] else None,
                "options": [
                    {"id": o["id"], "label": o["label"]}
                    for o in v["options"]
                    if o["possible"]
                ],
            }
            for v in view["variables"]
            if v["standing"] == "open"
        ],
        "price": view["price"],
        "footprint": {
            k: view["footprint"][k] for k in ("made", "run", "total", "complete")
        },
        "questions": view["questions"],
        # What the canvas shows beside each item, and what else it could.
        # The model may change this with `show` and `hide`, and nothing else.
        "showing": view["showing"],
        # Which items the canvas is narrowed to, if any — `frame` and
        # `unframe` change it.  `framed` lists what the frame selects.
        "frame": view["frame"],
        "framed": (
            [f"{v['heading']} ({v['standing']})" for v in view["variables"] if v["framed"]]
            if view["frame"]
            else None
        ),
        "customer": view["customer"],
        "project": view["project"],
        "quotable": view["quotable"],
        "quotes": [
            {
                k: q[k]
                for k in ("quote", "standing", "amount", "until", "committed", "differs")
            }
            | {"monthly": q["terms"]["recurring"], "months": q["terms"]["months"]}
            for q in view["quotes"]
        ],
    }
