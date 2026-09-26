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

The log also answers *from which words*.  A person's message opens a flow and
the model's tool calls in reply run in it (`hearing.py`), so an assertion
whose flow holds a `Conversing/say` was made in reply to those words, and the
canvas says so — *the assistant read "hospital, six storeys" as this* — from
the flow token alone.  No concept holds the reading; the trace does.
"""

from __future__ import annotations

import json
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


def _trace(engine: Engine, spec: str) -> dict[str, Any]:
    """What the log says that no concept holds, in one pass from the boot mark.

    `how` — for each variable, the rule behind its most recent assertion, the
    actor that performed the root action it followed from, and the words it
    was read from.  The words are the `Conversing/say` in the assertion's
    flow: a chat turn is one flow, opened by the message and shared by the
    tool calls made in reply (`hearing.py`).  An assertion that followed from
    a `Reading/read` in the same flow carries that reading's words and source
    instead, since the chain from `read` to `assert` runs inside one root
    action and the read most recently recorded in the flow is the one.  A
    gesture's flow and a browser agent's hold no utterance, and those
    assertions carry none.

    `origin` — for each clause the model stated, the reading it came from:
    the `require` carries the rule's name and the `read` in the same flow the
    source and the words (`docs/syncs/reading.md`).

    `displaced` — for each clause whose answer was retracted because a
    different value was asserted for its variable, what displaced it: the
    assertion in that flow, with its words.  Cleared when the clause is
    answered again.

    Scanned from the boot mark rather than from the start of the log: the
    catalogue's arrival is a thousand-odd records of `Cataloguing` and
    `Pricing`, and no assertion can precede it.
    """
    words: dict[str, str] = {}
    reads: dict[str, dict[str, Any]] = {}
    asserting: dict[str, dict[str, Any]] = {}
    how: dict[str, dict[str, Any]] = {}
    origin: dict[str, dict[str, Any]] = {}
    displaced: dict[str, dict[str, Any]] = {}
    for record in engine.log.records(since=engine.settled_at, limit=1_000_000):
        if record.kind != "completion":
            continue
        output = record.output or {}
        if "error" in output:
            continue
        if record.concept == "Conversing" and record.action == "say":
            if output.get("party") == "person" and output.get("text"):
                words[record.flow] = output["text"]
        elif record.concept == "Reading" and record.action == "read":
            reads[record.flow] = {
                "item": output["item"],
                "source": output["source"],
                "words": output["words"],
            }
        elif record.concept == "Specifying" and record.action == "require":
            if record.via == "AReadItemBecomesAClause" and record.flow in reads:
                origin[output["clause"]] = dict(reads[record.flow])
        elif record.concept == "Specifying" and record.action == "strike":
            displaced.pop(output["clause"], None)
        elif record.concept == "Binding" and record.action in {"propose", "substitute"}:
            displaced.pop(output["requirement"], None)
        elif record.concept == "Binding" and record.action == "retract":
            if record.via == "AnOverwrittenValueRetractsItsChoices":
                by = asserting.get(record.flow)
                if by:
                    displaced[output["requirement"]] = {"value": output["value"], **by}
        elif record.concept == "Asserting" and record.action in {"assert", "withdraw"}:
            if output.get("spec") != spec or "variable" not in output:
                continue
            if record.action == "withdraw":
                how.pop(output["variable"], None)
                continue
            read = reads.get(record.flow) if record.actor != "person" else None
            entry = {
                "via": record.via or "recorded at boot",
                "actor": record.actor,
                "words": read["words"] if read else words.get(record.flow),
                "source": read["source"] if read else None,
            }
            how[output["variable"]] = entry
            asserting[record.flow] = {
                "variable": output["variable"],
                "option": output["option"],
                **entry,
            }
    return {"how": how, "origin": origin, "displaced": displaced}


def _source_name(engine: Engine, source: Any) -> str | None:
    """A source, named the way the canvas names it: the file's name, or nothing
    for the person's own words."""
    if isinstance(source, dict) and source.get("file"):
        return engine.state("Filing")["name"].get(source["file"], source["file"])
    return None


def _how(engine: Engine, entry: dict[str, Any], cited: bool = False) -> str:
    """The sentence beside an asserted value.

    With words in the flow, the sentence says what they were: the reading is
    what the person corrects, so it stands where the value does.  When the
    value answers a clause the model stated from those same words, the clause
    already carries them beside the value (`cited`), and the sentence says
    only who read it and where; the words come back the moment the value
    stops answering the clause.
    """
    via, actor, words = entry["via"], entry["actor"], entry.get("words")
    if words and via == "TheModelMayAssertAValue":
        return f"the assistant read “{words}” as this"
    if words and via in {"AChoiceReachesTheAssertions", "ASubstituteReachesTheAssertions"}:
        who = "a browser agent" if actor == BROWSER else "the assistant"
        name = _source_name(engine, entry.get("source"))
        if cited:
            where = f"in {name}" if name else "from what you said"
            return f"{who} read this {where}"
        where = f" in {name}" if name else ""
        return f"{who} read “{words}”{where} as this"
    return said(via, actor, default=via) or via


def _touched(engine: Engine, spec: str) -> dict[str, Any] | None:
    """What the last turn changed, for the canvas to mark.

    The most recent flow that reached an assertion or a clause, and the
    variables and clauses its records name.  A flow the person opened by a
    gesture is theirs and marks nothing: they were looking.  A flow with the
    model or a browser agent among its root actors is what moved while they
    were not, and the marks stand until the person next changes the
    specification themselves.  Read off the log; held by nobody.
    """
    flows: dict[str, dict[str, Any]] = {}
    order: list[str] = []
    for record in engine.log.records(since=engine.settled_at, limit=1_000_000):
        if record.kind != "completion":
            continue
        flow = flows.get(record.flow)
        if flow is None:
            flow = flows[record.flow] = {"actors": set(), "variables": set(), "clauses": set()}
            order.append(record.flow)
        if record.via is None:
            flow["actors"].add(record.actor)
        output = record.output or {}
        if "error" in output:
            continue
        if record.concept == "Asserting" and record.action in {"assert", "withdraw"}:
            if output.get("spec") == spec and output.get("variable"):
                flow["variables"].add(output["variable"])
        elif record.concept == "Specifying" and output.get("clause"):
            flow["clauses"].add(output["clause"])
        elif record.concept == "Binding" and output.get("requirement"):
            flow["clauses"].add(output["requirement"])
    for token in reversed(order):
        flow = flows[token]
        if not (flow["variables"] or flow["clauses"]):
            continue
        others = flow["actors"] - {"person"}
        if not others:
            return None
        return {
            "by": "a browser agent" if BROWSER in others else "the assistant",
            "variables": sorted(flow["variables"]),
            "clauses": sorted(flow["clauses"]),
        }
    return None


def filed(engine: Engine, file: str) -> dict[str, Any]:
    """A document as it is on record, for the model to read from."""
    filing = engine.state("Filing")
    if file not in filing["name"]:
        return {"error": f"there is no file {file}; `review` lists the files under `files`"}
    return {"file": file, "name": filing["name"][file], "text": filing["text"][file]}


def _sources(
    engine: Engine, clauses: list[dict[str, Any]], origin: dict[str, dict[str, Any]]
) -> list[dict[str, Any]]:
    """Every source, with what was read from it and what became of each item.

    The files from `Filing` and the person's utterances from `Conversing`;
    the items from `Reading`; the clause each item became from the trace;
    and the clause's standing from the ledger.  A reading is checked against
    its source whole, which is what this list is for.
    """
    reading = engine.state("Reading")
    filing = engine.state("Filing")
    conversing = engine.state("Conversing")
    catalogue = engine.state("Cataloguing")
    became = {o["item"]: clause for clause, o in origin.items()}
    standing = {c["clause"]: c for c in clauses}

    def items(source: dict[str, Any]) -> list[dict[str, Any]]:
        key = json.dumps(source, sort_keys=True)
        out = []
        for item in reading["heard"].get(key, []):
            clause = became.get(item)
            line = standing.get(clause) if clause else None
            out.append(
                {
                    "item": item,
                    "words": reading["words"][item],
                    "answer": [
                        {"option": o, "label": catalogue["label"].get(o, o)}
                        for o in reading["answer"].get(item, [])
                    ],
                    "clause": clause,
                    # What became of it: answered, unanswered, or struck by
                    # the person, which is the disowning the case counts.
                    "became": (
                        "struck"
                        if clause and line is None
                        else "answered"
                        if line and line["answers"]
                        else "unanswered"
                        if line
                        else None
                    ),
                }
            )
        return out

    out = []
    for file in filing["files"]:
        text = filing["text"][file]
        out.append(
            {
                "kind": "file",
                "id": file,
                "name": filing["name"][file],
                "broughtBy": filing["broughtBy"][file],
                "text": text,
                "items": items({"file": file}),
            }
        )
    for utterance in conversing["utterances"]:
        if conversing["by"][utterance] != "person":
            continue
        read = items({"utterance": utterance})
        if not read:
            continue
        out.append(
            {
                "kind": "utterance",
                "id": utterance,
                "name": None,
                "broughtBy": "person",
                "text": conversing["text"][utterance],
                "items": read,
            }
        )
    return out


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

    # The frame, from `Framing`: which items the canvas shows.  Two kinds —
    # what followed from one assertion, and one requirement — and the
    # membership test is this read's, not the concept's.  See
    # docs/concepts/framing.md and docs/syncs/gestures.md, "The canvas is
    # narrowed to one requirement".
    frame = engine.state("Framing")["framed"].get(WORKSPACE)
    framed_on = (
        frame.get("variable")
        if isinstance(frame, dict) and frame.get("by") == "assertion"
        else None
    )
    framed_clause = (
        frame.get("clause")
        if isinstance(frame, dict) and frame.get("by") == "clause"
        else None
    )
    # The variables whose asserted value answers the framed clause, read
    # from the ledger below once it exists; filled before `variables` is built.
    answering_clause: set[str] = set()

    def in_frame(name: str, offered: list[str], allowed: set[str]) -> bool:
        if framed_clause is not None:
            # Its answers, what they forced, and anything still open.
            if name in answering_clause:
                return True
            if name not in asserted and name in settled:
                return bool(answering_clause & set(following.get(name, [])))
            return name not in asserted and name not in settled
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
    trace = _trace(engine, spec)
    how = trace["how"]
    clauses = ledger(engine, spec)
    # Where each clause came from, and what displaced its answer — both off
    # the trace, neither held by a concept.  See docs/syncs/reading.md.
    for clause in clauses:
        origin = trace["origin"].get(clause["clause"])
        clause["source"] = (
            {
                "item": origin["item"],
                "kind": "file" if origin["source"].get("file") else "utterance",
                "id": origin["source"].get("file") or origin["source"].get("utterance"),
                "name": _source_name(engine, origin["source"]),
                "words": origin["words"],
                # The model's claim that nothing in the catalogue answers it:
                # an empty answer on the item, read as such and not judged.
                "unanswerable": not engine.state("Reading")["answer"].get(origin["item"]),
            }
            if origin
            else None
        )
        gone = trace["displaced"].get(clause["clause"])
        clause["displaced"] = (
            {
                "value": gone["value"],
                "label": catalogue["label"].get(gone["value"], gone["value"]),
                "by": gone["option"],
                "byLabel": catalogue["label"].get(gone["option"], gone["option"]),
                "how": _how(engine, gone),
            }
            if gone and not clause["answers"]
            else None
        )
    # Which clauses each asserted option answers — the same choices, indexed
    # from the value's side, so a card can say what its value is for.
    answering: dict[str, list[dict[str, str]]] = {}
    for clause in clauses:
        for choice in clause["answers"]:
            answering.setdefault(choice["value"], []).append(
                {"clause": clause["clause"], "text": clause["text"]}
            )
            if clause["clause"] == framed_clause and choice["variable"]:
                answering_clause.add(choice["variable"])
    if framed_clause is not None and not any(c["clause"] == framed_clause for c in clauses):
        # A frame on a clause the ledger no longer has: read as no frame,
        # until the rule that takes it away has run.
        framed_clause = None

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
                "how": (
                    _how(engine, how[name], cited=bool(answering.get(asked)))
                    if asked and name in how
                    else None
                ),
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
            else {
                "by": "clause",
                "clause": framed_clause,
                "text": next(c["text"] for c in clauses if c["clause"] == framed_clause),
            }
            if framed_clause is not None
            else None
        ),
        "variables": variables,
        "clauses": clauses,
        # What was brought and said, with what was read from each.
        "sources": _sources(engine, clauses, trace["origin"]),
        # What the last turn changed while the person was not looking at the
        # canvas, for it to mark.  Null when the person's own gesture was the
        # last thing to move the specification.
        "touched": _touched(engine, spec),
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
            # The plan's number for slice 2: clauses the model read.  Those
            # the person struck are in `sources`, item by item.
            "read": sum(1 for c in clauses if c["source"]),
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
        # What is required, in the source's own words, with what answers
        # each: the person's clauses, and the ones the model read from their
        # words or a document, marked as such.  `read` is the one tool that
        # adds to this list.
        "required": [
            {
                "clause": c["clause"],
                "text": plain(c["text"]),
                "negotiability": c["negotiability"],
                "stated_by": c["statedBy"],
                "read_from": (
                    c["source"]["name"] or "the person's message"
                    if c["source"]
                    else None
                ),
                "answered_by": [
                    f"{a['heading']}: {a['label']}" for a in c["answers"]
                ],
                "displaced_by": (
                    f"{c['displaced']['byLabel']} ({c['displaced']['how']})"
                    if c.get("displaced")
                    else None
                ),
            }
            for c in view["clauses"]
        ],
        # The documents the person attached, to read with `open_file` and
        # cite in `read`.
        "files": [
            {"file": s["id"], "name": s["name"], "read": len(s["items"])}
            for s in view["sources"]
            if s["kind"] == "file"
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
