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
from wiring import BASIS, FACETS, WORKSPACE
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

# The same edge under a second actor.  The person's own agent performs the
# person's gestures — the rules match on the act, not on who performed it — so
# the provenance edge alone reads "you", and the actor on the record is what
# says otherwise.  See docs/syncs/conduct.md, "The person's own agent, acting
# as the person".
BROWSER = "browser"
SAID = {
    ("APersonAssertsAValue", BROWSER): "your agent asked for this",
    ("AnAdoptedValueBecomesAnAssertion", BROWSER): "adopted from a proposal by your agent",
    ("APersonRequestsAQuote", BROWSER): "your agent asked for this",
}


def said(via: str | None, actor: str | None, default: str | None = None) -> str | None:
    """The sentence for a provenance edge, read with the actor beside it."""
    return SAID.get((via or "", actor or "")) or HOW.get(via or "", default)


def _trace(engine: Engine, spec: str, at: tuple[int, ...] = ()) -> dict[str, Any]:
    """What the log says that no concept holds, in one pass from the boot mark.

    `how` — for each variable, the rule behind its most recent assertion, the
    actor that performed the root action it followed from, and the words it
    was read from.  The words are the `Conversing/say` in the assertion's
    flow: a chat turn is one flow, opened by the message and shared by the
    tool calls made in reply (`hearing.py`).  An assertion that followed from
    a `Reading/read` in the same flow carries that reading's words and source
    instead, since the chain from `read` to `assert` runs inside one root
    action and the read most recently recorded in the flow is the one.  A
    gesture's flow and the person's own agent's hold no utterance, and those
    assertions carry none.

    `stated` — every clause ever stated, struck ones included, so that a
    reading can say it became a clause that is gone.  Which reading a clause
    came from needs no trace: the clause is the item (`docs/syncs/reading.md`).

    `displaced` — for each clause whose answer was retracted because a
    different value was asserted for its variable, what displaced it: the
    assertion in that flow, with its words.  Cleared when the clause is
    answered again.

    `asOf` — `how` as it stood at each sequence number in `at`, the records
    that issued quotes, so that an offer can say who asserted each of its
    values in the same pass that reads the canvas's.

    Scanned from the boot mark rather than from the start of the log: the
    catalogue's arrival is a thousand-odd records of `Cataloguing` and
    `Pricing`, and no assertion can precede it.
    """
    marks = sorted(at)
    as_of: dict[int, dict[str, dict[str, Any]]] = {}
    words: dict[str, str] = {}
    # Who said the flow's words: the person, or their own agent as them.
    spoke: dict[str, str] = {}
    # The chat message each utterance was said in: the id a typed message's
    # `say` carries, or the flow itself for words said by gesture first.
    message: dict[str, str] = {}
    said: dict[str, str] = {}
    # The conversation each utterance was said in, where the `say` says.
    thread: dict[str, str] = {}
    said_in: dict[str, str] = {}
    reads: dict[str, dict[str, Any]] = {}
    asserting: dict[str, dict[str, Any]] = {}
    how: dict[str, dict[str, Any]] = {}
    stated: set[str] = set()
    displaced: dict[str, dict[str, Any]] = {}
    for record in engine.log.records(since=engine.settled_at, limit=1_000_000):
        while marks and marks[0] < record.seq:
            as_of[marks.pop(0)] = dict(how)
        if record.kind != "completion":
            continue
        output = record.output or {}
        if "error" in output:
            continue
        if record.concept == "Copiloting" and record.action == "gesture":
            if output.get("act") == "say" and output.get("message"):
                message[record.flow] = output["message"]
            if output.get("act") == "say" and output.get("thread"):
                thread[record.flow] = output["thread"]
        elif record.concept == "Conversing" and record.action == "say":
            if output.get("party") == "person" and output.get("text"):
                words[record.flow] = output["text"]
                spoke[record.flow] = record.actor
                said[message.get(record.flow, record.flow)] = output["utterance"]
                if record.flow in thread:
                    said_in[output["utterance"]] = thread[record.flow]
        elif record.concept == "Reading" and record.action == "read":
            reads[record.flow] = {
                "item": output["item"],
                "source": output["source"],
                "words": output["words"],
            }
        elif record.concept == "Specifying" and record.action == "require":
            stated.add(output["clause"])
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
                "speaker": spoke.get(record.flow),
            }
            how[output["variable"]] = entry
            asserting[record.flow] = {
                "variable": output["variable"],
                "option": output["option"],
                **entry,
            }
    for mark in marks:
        as_of[mark] = dict(how)
    return {
        "how": how,
        "asOf": as_of,
        "stated": stated,
        "displaced": displaced,
        "agentSaid": sorted(f for f, actor in spoke.items() if actor == BROWSER),
        "said": said,
        "saidIn": said_in,
    }


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
    agent_said = entry.get("speaker") == BROWSER
    if words and via == "TheModelMayAssertAValue":
        whose = "your agent's " if agent_said else ""
        return f"the assistant read {whose}“{words}” as this"
    if words and via in {"AChoiceReachesTheAssertions", "ASubstituteReachesTheAssertions"}:
        who = "your agent" if actor == BROWSER else "the assistant"
        name = _source_name(engine, entry.get("source"))
        if cited:
            where = (
                f"in {name}"
                if name
                else "from what your agent said"
                if agent_said
                else "from what you said"
            )
            return f"{who} read this {where}"
        where = f" in {name}" if name else ""
        return f"{who} read “{words}”{where} as this"
    return said(via, actor, default=via) or via


def put_question(engine: Engine, request: Any) -> dict[str, Any] | None:
    """The question the model last put about a request, and where it stands:
    Conduct's *awaits an answer*, with the clause it reads from the log —
    whether `Deciding` was asked the request again after the question was
    put.  Shared by the canvas and the model's `ask` tool."""
    conversing = engine.state("Conversing")
    said_at: dict[str, int] = {}
    last_ask = -1
    for record in engine.log.records(since=engine.settled_at, limit=1_000_000):
        if record.kind != "completion":
            continue
        output = record.output or {}
        if record.concept == "Conversing" and output.get("utterance"):
            said_at[output["utterance"]] = record.seq
        elif (
            record.concept == "Deciding"
            and record.action == "ask"
            and output.get("request") == request
        ):
            last_ask = record.seq
    again = {u for u, seq in said_at.items() if seq < last_ask}
    return readings.asked(conversing, engine.state("Deciding"), request, again)


def _speakers(engine: Engine, utterances: set[str]) -> dict[str, str]:
    """The actor behind each utterance, read off the log."""
    if not utterances:
        return {}
    out: dict[str, str] = {}
    for record in engine.log.records(since=engine.settled_at, limit=1_000_000):
        if (
            record.kind == "completion"
            and record.concept == "Conversing"
            and (record.output or {}).get("utterance") in utterances
        ):
            out[record.output["utterance"]] = record.actor
    return out


def filed(engine: Engine, file: str) -> dict[str, Any]:
    """A document as it is on record, for the model to read from."""
    filing = engine.state("Filing")
    if file not in filing["name"]:
        return {"error": f"there is no file {file}; `review` lists the files under `files`"}
    return {"file": file, "name": filing["name"][file], "text": filing["text"][file]}


def _sources(
    engine: Engine, clauses: list[dict[str, Any]], stated: set[str]
) -> list[dict[str, Any]]:
    """Every source, with what was read from it and what became of each item.

    The files from `Filing` and the person's utterances from `Conversing`;
    the items from `Reading`; the clause each item became, which is the item
    itself where it was ever stated; and the clause's standing from the
    ledger.  A reading is checked against its source whole, which is what this
    list is for.
    """
    reading = engine.state("Reading")
    filing = engine.state("Filing")
    conversing = engine.state("Conversing")
    catalogue = engine.state("Cataloguing")
    standing = {c["clause"]: c for c in clauses}

    def items(source: dict[str, Any]) -> list[dict[str, Any]]:
        key = json.dumps(source, sort_keys=True)
        out = []
        for item in reading["heard"].get(key, []):
            clause = item if item in stated else None
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
                    "statedBy": line["statedBy"] if line else None,
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

    speakers = _speakers(engine, set(conversing["utterances"]))
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
                # The person, or their own agent speaking as them.
                "broughtBy": speakers.get(utterance, "person"),
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
    # the menu and the model's digest read the same thing.  `usual` is
    # whether the facet is shown before anybody has touched the menu, so the
    # page's URL can leave the usual out (docs/ui.md, "Links").
    shown = set(showing["shown"].get(WORKSPACE, []))
    usual = {facet for facet, _, seeded in FACETS if seeded}
    facets = [
        {
            "facet": facet,
            "about": showing["about"].get(facet, facet),
            "shown": facet in shown,
            "usual": facet in usual,
        }
        for facet in showing["offered"].get(WORKSPACE, [])
    ]
    capital = pricing.state()["capital"]
    monthly = pricing.state()["monthly"]

    def carbon(option: str) -> float | None:
        """What the option adds over the lift's life, every stage it has a
        figure for: the footprint of the option alone, which draws no energy,
        so its run is nothing."""
        state = footprinting.state()
        if not any(option in state[k] for k in ("embodied", "installed", "upkeep", "ended")):
            return None
        return footprinting.footprint([option], grid, BASIS)["total"]

    asserted = asserting["asserted"].get(spec, {})
    assumed = constraining["assumed"].get(spec, {})
    inclined = constraining["inclined"].get(spec, {})
    possible = constraining["possible"].get(spec, {})
    settled = constraining["settled"].get(spec, {})
    owing = constraining["owing"].get(spec, {})
    following = constraining["following"].get(spec, {})
    refused = constraining["refused"].get(spec, {})
    heading = catalogue["heading"]

    # The frame, from `Framing`: which items the canvas shows.  Three kinds —
    # what followed from one assertion, one requirement, and one gap — and
    # the membership test is this read's, not the concept's.  See
    # docs/concepts/framing.md and docs/syncs/gestures.md, "The canvas is
    # narrowed to one requirement" and "… to one gap".
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
    framed_gap = (
        frame.get("gap")
        if isinstance(frame, dict)
        and frame.get("by") == "gap"
        and frame.get("gap") in ("open", "unanswered", "unbound")
        else None
    )
    # The variables whose asserted value answers the framed clause, read
    # from the ledger below once it exists; filled before `variables` is built.
    answering_clause: set[str] = set()

    def unbound(name: str) -> bool:
        return name in asserted and not answering.get(asserted[name])

    def in_frame(name: str, offered: list[str], allowed: set[str]) -> bool:
        if framed_gap == "open":
            return name not in asserted and name not in settled
        if framed_gap == "unanswered":
            # The gap is clauses; no variable is in it.
            return False
        if framed_gap == "unbound":
            # The values answering no clause, and what they forced.
            if unbound(name):
                return True
            return name not in asserted and any(
                unbound(v) for v in following.get(name, [])
            )
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
    issued = _issued(engine)
    trace = _trace(engine, spec, at=tuple(seq for _, _, _, seq in issued.values()))
    how = trace["how"]
    reading = engine.state("Reading")
    clauses = ledger(engine, spec)
    # Where each clause came from, and what displaced its answer — both off
    # the trace, neither held by a concept.  See docs/syncs/reading.md.
    speakers = _speakers(engine, set(engine.state("Conversing")["utterances"]))
    for clause in clauses:
        origin = (
            {
                "item": clause["clause"],
                "source": reading["source"][clause["clause"]],
                "words": reading["words"][clause["clause"]],
            }
            if clause["clause"] in reading["words"]
            else None
        )
        clause["source"] = (
            {
                "item": origin["item"],
                "kind": "file" if origin["source"].get("file") else "utterance",
                "id": origin["source"].get("file") or origin["source"].get("utterance"),
                "name": _source_name(engine, origin["source"]),
                # Who said the words read, when they were said in the chat.
                "broughtBy": (
                    speakers.get(origin["source"]["utterance"], "person")
                    if origin["source"].get("utterance")
                    else None
                ),
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
    # Held for a reason: the requirements the person stated that rest on each
    # value, which the model cannot change (docs/syncs/conduct.md).
    held = readings.reasons(
        asserting, engine.state("Binding"), engine.state("Specifying"), spec
    )

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
                # Who performed the root action the assertion followed from,
                # when it is a party: the same fact `how` puts in words, for
                # the mark beside the value.
                "by": (
                    how[name]["actor"]
                    if asked and name in how and how[name]["actor"] in PARTIES
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
                # Held for a reason: the requirements the person stated that
                # rest on this value, which the model cannot change.
                "held": held.get(name, []),
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
                        "carbon": carbon(option),
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
    # Who put each question to the person, in what words, and what they
    # replied — `Conversing`, read beside `Deciding` as Conduct's *awaits an
    # answer* reads it.  Whose reply it was is the log's: the person's own
    # agent replies as the person, under its own actor.
    for q in questions:
        q["about"] = q["request"].get("about")
        put = put_question(engine, q["request"])
        # An overtaken question was about an earlier conflict; this one has
        # not been put to anybody.
        if put is not None and put["status"] == "overtaken":
            put = None
        if put is not None:
            actors = _speakers(engine, {r["utterance"] for r in put["replies"]})
            put["replies"] = [
                {**r, "by": "your agent" if actors.get(r["utterance"]) == BROWSER else "you"}
                for r in put["replies"]
            ]
        q["asked"] = put

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

    quotes = _quotes(engine, spec, grid, settled, issued, trace["asOf"])
    price = pricing.total(chosen, BASIS)
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
        quotable = {"ok": False, "because": f"{still_open} open"}
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
            else {"by": "gap", "gap": framed_gap}
            if framed_gap is not None
            else None
        ),
        "variables": variables,
        "clauses": clauses,
        # What was brought and said, with what was read from each.
        "sources": _sources(engine, clauses, trace["stated"]),
        # The flows the person's own agent opened by speaking in the chat;
        # its message there carries the flow as its id, so the chat can say
        # whose words they were.
        "agentSaid": trace["agentSaid"],
        # The utterance each chat message became, by the message's id, so
        # the words in the chat carry the utterance's address.
        "said": trace["said"],
        # The conversation each utterance was said in, when it was recorded.
        "saidIn": trace["saidIn"],
        "price": price,
        "footprint": footprinting.footprint(chosen, grid, BASIS),
        # What falls at each stage of the lift's life, by the catalogue's
        # family: the one-off and the monthly sums of the settled values.
        "stages": _stages(catalogue, pricing, chosen),
        "questions": questions,
        "quotes": quotes,
        # The specification read as a quote would freeze it, for comparing an
        # issued offer with where things stand.
        "now": _now(
            engine,
            spec,
            settled,
            how,
            price,
            {v["name"] for v in variables if v["standing"] == "unmet"},
        ),
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
        # The log, read by turn, latest activity first.  Behaviour only: the
        # catalogue's arrival is a thousand records of Cataloguing and
        # Pricing, and nobody wants to read it back.
        "turns": (log := turns(engine, spec)),
        "kinds": [{"kind": k, "label": label} for k, label in KINDS],
        # Who has taken a turn, so a party that never acts is never offered.
        "parties": _parties(log),
        # Where the log stood when this was read, so a response from
        # further back than what is shown can be told apart.
        "at": engine.log.last_seq,
    }


def _stages(
    catalogue: dict[str, Any], pricing: Any, chosen: list[str]
) -> list[dict[str, Any]]:
    """The settled values' prices, summed by the catalogue's family, in the
    catalogue's order.  A join of two concepts' exposed state, as a `where`
    would make it: Pricing knows amounts, Cataloguing knows families, and
    neither knows the other."""
    state = pricing.state()
    family_of = catalogue["family"]
    sums: dict[str, dict[str, Any]] = {}
    for family in family_of.values():
        sums.setdefault(family, {"family": family, "capital": 0.0, "monthly": 0.0})
    for option in chosen:
        variable = option.split(":", 1)[0]
        family = family_of.get(variable, "other")
        line = sums.setdefault(family, {"family": family, "capital": 0.0, "monthly": 0.0})
        line["capital"] += state["capital"].get(option, 0.0)
        line["monthly"] += state["monthly"].get(option, 0.0)
    return list(sums.values())


# What a turn did, by the concepts its records were written in.  A turn is
# usually several of these at once, so each is a filter over the log rather
# than a section of it.  Constraining is left out: it follows from what was
# asserted, and is never all a turn did.  A turn whose every record was
# refused, or that reached no concept here, did nothing.
KINDS = [
    ("specification", "The specification"),
    ("questions", "Questions"),
    ("reading", "Words and documents"),
    ("quotes", "Quotes"),
    ("party", "Who and where"),
    ("view", "The view"),
    ("nothing", "Nothing"),
]
# What opened a turn, as the log says it when the turn stated, answered or
# withdrew nothing: a person's gesture or the tool the model called.  An act
# not named here is shown by its name.
ACTS = {
    "start": "Started the specification",
    "discard": "Discarded the specification",
    "say": "Said something",
    "file": "Attached a document",
    "keep": "Kept a reading",
    "choose": "Answered a question",
    "decline": "Left a question",
    "reply": "Replied to a question",
    "answer": "Answered a question",
    "settle": "Settled how firm a requirement is",
    "move": "Moved a requirement",
    "introduce": "Said who the buyer is",
    "entitle": "Named the job and the site",
    "quote": "Requested a quote",
    "commit": "Accepted a quote",
    "revoke": "Revoked a quote",
    "focus": "Switched surface",
    "show": "Showed a fact beside each item",
    "hide": "Hid a fact beside each item",
    "frame": "Narrowed the canvas",
    "unframe": "Showed the whole canvas",
    "read": "Read a requirement",
    "open_file": "Opened a document",
    "open_quote": "Opened a quote",
    "propose": "Proposed a completion",
    "ask": "Put a question",
    "review": "Reviewed the specification",
    # Seen only when nothing changed, so said as what was asked for.
    "assert": "Asked to assert a value",
    "assert_value": "Asked to assert a value",
    "withdraw": "Asked to withdraw a value",
    "require": "Asked to state a requirement",
    "reword": "Asked to reword a requirement",
    "relax": "Asked to relax a requirement",
    "strike": "Asked to strike a requirement",
}
# Who takes a turn, by the side of the sale they act for.  `person` is
# whoever is looking; an actor not named here is listed by its name.
PARTIES = {
    "person": ("You", "buyer"),
    "browser": ("Your agent", "buyer"),
    "model": ("The assistant", "seller"),
}

_KIND_OF = {
    "Specifying": "specification",
    "Asserting": "specification",
    "Binding": "specification",
    "Deciding": "questions",
    "Conversing": "reading",
    "Filing": "reading",
    "Reading": "reading",
    "Quoting": "quotes",
    "Profiling": "party",
    "Naming": "party",
    "Moding": "view",
    "Showing": "view",
    "Framing": "view",
}


def turns(engine: Engine, spec: str, latest: int = 200) -> list[dict[str, Any]]:
    """The log read by turn: `docs/ui.md`, "What a view is".

    A flow is one occasion — the person's words and the calls the model made
    in reply, or one gesture and what the rules did with it — so the turn is
    the unit, latest activity first.  Each says who opened it, what opened
    it in a phrase (`did`), who took part, what it did (`kinds`), what it
    changed in the specification's words — the clauses stated, reworded and
    struck, the values answered and withdrawn, each as it was then — and
    every completion it wrote, with the rule that authorised it.  A refused
    record is listed and changes nothing.  A turn is `fresh` when it came
    after the person last changed the specification themselves, whoever took
    it; a turn that only brought a surface forward is marked `moved`.  Read
    off the log; held by nobody.
    """
    flows: dict[str, dict[str, Any]] = {}
    order: list[str] = []
    text: dict[str, str] = {}
    for record in engine.log.records(since=engine.settled_at, limit=1_000_000):
        if record.kind != "completion":
            continue
        flow = flows.get(record.flow)
        if flow is None:
            output = record.output or {}
            flow = flows[record.flow] = {
                "flow": record.flow,
                "actor": record.actor,
                "at": record.at,
                # What started it: a gesture's act, the tool the model
                # called, or the action itself.
                "opened": output.get("act") or output.get("tool") or record.action,
                "parties": set(),
                "kinds": set(),
                "said": None,
                "files": [],
                "stated": [],
                "reworded": [],
                "struck": [],
                "asserted": [],
                "withdrawn": [],
                "records": [],
            }
        # Latest activity: a run resumed after a question moves its turn up.
        if not order or order[-1] != record.flow:
            if record.flow in order:
                order.remove(record.flow)
            order.append(record.flow)
        output = record.output or {}
        refused = "error" in output
        flow["records"].append(
            {
                "seq": record.seq,
                "concept": record.concept,
                "action": record.action,
                "actor": record.actor,
                "via": record.via,
                "refused": refused,
            }
        )
        if record.via is None:
            flow["parties"].add(record.actor)
        if refused:
            continue
        if record.concept in _KIND_OF:
            flow["kinds"].add(_KIND_OF[record.concept])
        if record.concept == "Conversing" and record.action == "say":
            if flow["said"] is None and output.get("text"):
                flow["said"] = {"utterance": output.get("utterance"), "text": output["text"]}
        elif record.concept == "Reading" and record.action == "read":
            name = _source_name(engine, output.get("source"))
            if name and name not in flow["files"]:
                flow["files"].append(name)
        elif record.concept == "Specifying" and output.get("spec") == spec:
            clause = output.get("clause")
            if record.action == "require":
                text[clause] = record.input.get("text", "")
                flow["stated"].append({"clause": clause, "text": text[clause]})
            elif record.action in {"reword", "relax"}:
                text[clause] = record.input.get("text", "")
                flow["reworded"].append({"clause": clause, "text": text[clause]})
            elif record.action == "strike":
                flow["struck"].append({"clause": clause, "text": text.get(clause, "")})
        elif record.concept == "Asserting" and output.get("spec") == spec:
            variable = output.get("variable")
            if not variable:
                continue
            if record.action == "assert":
                flow["asserted"].append({"variable": variable, "option": output.get("option")})
            elif record.action == "withdraw":
                flow["withdrawn"].append(variable)
    out: list[dict[str, Any]] = []
    fresh = True
    for token in reversed(order[-latest:]):
        flow = flows[token]
        parties = flow["parties"]
        if parties == {"person"} and "specification" in flow["kinds"]:
            # The person changed the specification: this, and what came
            # before, they have seen.
            fresh = False
        flow["fresh"] = fresh
        # A turn that only brought a surface forward: true, and about no
        # fact of the specification.
        flow["moved"] = flow["kinds"] == {"view"} and all(
            r["concept"] in {"Copiloting", "Moding"} for r in flow["records"]
        )
        out.append(
            {
                **flow,
                "did": ACTS.get(flow["opened"], flow["opened"]),
                "parties": sorted(parties),
                "kinds": [k for k, _ in KINDS if k in flow["kinds"]] or ["nothing"],
            }
        )
    return out


def _parties(log: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Every actor with a root action among the turns, the named ones first,
    each with its name and the side of the sale it acts for."""
    present = {p for turn in log for p in turn["parties"]}
    actors = [a for a in PARTIES if a in present] + sorted(present - PARTIES.keys())
    return [
        {
            "actor": a,
            "label": PARTIES.get(a, (a, None))[0],
            "side": PARTIES.get(a, (a, None))[1],
        }
        for a in actors
    ]


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
    engine: Engine,
    spec: str,
    grid: str,
    settled: dict[str, str],
    issued: dict[str, tuple[str, str, str, int]],
    as_of: dict[int, dict[str, dict[str, Any]]],
) -> list[dict[str, Any]]:
    """The three reads in `docs/concepts/quoting.md`: standing, differs, and
    the quotes themselves.

    A quote holds the assignment as it stood.  The amount and terms are what
    the offer *is* and come back as recorded; the footprint is an estimate,
    recomputed from the frozen item against whichever grid the person is
    looking at.  `differs` is the comparison between the frozen item and the
    live state, which nobody maintains.

    `grounds` is the item's, frozen at issue: whether each value was
    asserted, gave way or follows, and why.  Who asserted it is the log's,
    read as it stood at the record that issued the quote (`as_of`), so the
    sentence beside a frozen value is the one the canvas showed then.  A
    quote issued before the item carried grounds has none, and says so.
    """
    quoting = engine.state("Quoting")
    footprinting = engine.concepts["Footprinting"]
    now = date.today().isoformat()
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
        via, actor, on, seq = issued.get(quote, ("", "", None, 0))
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
                # The clauses as they stood at issue, each with the option
                # that answered it then, and the grounds of every value:
                # frozen with the item; only the catalogue's labels are read
                # live.
                **_side(
                    engine,
                    holds,
                    item.get("requires", []),
                    item.get("grounds"),
                    as_of.get(seq, {}),
                ),
                "differs": sorted(
                    name for name, option in holds.items() if settled.get(name) != option
                ),
                "footprint": footprinting.footprint(holds.values(), grid, BASIS),
            }
        )
    return quotes


def _side(
    engine: Engine,
    holds: dict[str, str],
    requires: list[dict[str, Any]],
    grounds: dict[str, dict[str, Any]] | None,
    how: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """An assignment with its requirements and grounds, labelled for reading:
    one side of a comparison, a quote's as frozen or the specification's as
    it stands.  Who asserted each value is `how`, the trace as it stood when
    the assignment was read; the sentence leaves out the words when the
    value's clause already carries them."""
    catalogue = engine.state("Cataloguing")
    cited = {o for c in requires for o in c.get("answeredBy", [])}
    return {
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
        "requires": [
            {
                **clause,
                "answeredBy": [
                    {"value": option, "label": catalogue["label"].get(option, option)}
                    for option in clause.get("answeredBy", [])
                ],
            }
            for clause in requires
        ],
        "grounds": (
            None
            if grounds is None
            else {
                name: {
                    **ground,
                    "askedLabel": (
                        catalogue["label"].get(ground["asked"], ground["asked"])
                        if ground.get("asked")
                        else None
                    ),
                    "how": (
                        _how(engine, how[name], cited=holds.get(name) in cited)
                        if ground["standing"] != "follows" and name in how
                        else None
                    ),
                    "following": [
                        {"variable": v, "heading": catalogue["heading"].get(v, v)}
                        for v in ground.get("following", [])
                    ],
                }
                for name, ground in grounds.items()
            }
        ),
    }


def _now(
    engine: Engine,
    spec: str,
    settled: dict[str, str],
    how: dict[str, dict[str, Any]],
    price: dict[str, Any],
    unmet: set[str],
) -> dict[str, Any]:
    """The specification as it stands, read the way a quote is: what an offer
    requested now would freeze, so the quote surface can compare an issued
    offer with it.  The same readings the rule that issues a quote copies,
    read live and recorded nowhere.  The specification may be unfinished:
    a variable still open has no line, and the sum is incomplete until every
    value is settled and the term chosen.  A value asserted and not met is
    `unmet` here, which no issued quote can hold."""
    side = _side(
        engine,
        settled,
        readings.requires(
            engine.state("Specifying"), engine.state("Binding"), spec
        ),
        readings.grounds(
            engine.state("Constraining"),
            engine.state("Asserting"),
            engine.state("Pricing"),
            spec,
            settled,
        ),
        how,
    )
    for name in unmet & set(side["grounds"] or {}):
        side["grounds"][name]["standing"] = "unmet"
    return {
        **side,
        "amount": price["capital"],
        "terms": {"months": price["term"], "recurring": price["recurring"]},
        "complete": price["complete"]
        and all(v in settled for v in engine.state("Constraining")["range"]),
    }


def _issued(engine: Engine) -> dict[str, tuple[str, str, str, int]]:
    """For each quote, the rule that issued it, the actor whose call it
    followed from, the day it was issued, and the record's place in the log.

    Both come off the log rather than the concept.  The rule is a provenance
    edge, as for assertions; the date is the completion's timestamp, which the
    concept does not hold because it holds no clock.
    """
    issued: dict[str, tuple[str, str, str, int]] = {}
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
                record.seq,
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


def _item_at(kind: str, source: str, item: str) -> str:
    """The address of an item read from a source, on the requirements."""
    return f"#source:{kind}:{source}:item:{item}"


def digest(engine: Engine, spec: str, actor: str = "model") -> dict[str, Any]:
    """The same reading, small enough to hand a language model.

    `actor` is who reads it.  The person's own agent (`browser`) acts as the
    person, so a value their requirement holds is not out of its reach, and
    a proposed value comes with the question that adopts it.
    """
    agent = actor == BROWSER
    view = canvas(engine, spec)
    label = {
        option["id"]: option["label"]
        for variable in view["variables"]
        for option in variable["options"]
    }

    def say(variable: dict[str, Any]) -> str:
        value = variable["value"]
        return f"{variable['heading']}: {label.get(value, value)}" if value else ""

    def at(variable: dict[str, Any]) -> dict[str, Any]:
        return {"at": f"#variable:{variable['name']}"}

    return {
        # What is required, in the source's own words, with what answers
        # each: the person's clauses, and the ones the model read from their
        # words or a document, marked as such.  `read` is the one tool that
        # adds to this list.
        "required": [
            {
                "clause": c["clause"],
                "at": f"#clause:{c['clause']}",
                "text": plain(c["text"]),
                "negotiability": c["negotiability"],
                "stated_by": c["statedBy"],
                "read_from": (
                    c["source"]["name"] or "the person's message"
                    if c["source"]
                    else None
                ),
                # The item it was read as, under its source.
                "read_at": (
                    _item_at(c["source"]["kind"], c["source"]["id"], c["source"]["item"])
                    if c["source"]
                    else None
                ),
                # Each answer is a choice, with its address on the
                # configuration's ledger line: the value, and what it forced.
                "answered_by": [
                    {"says": f"{a['heading']}: {a['label']}", "at": f"#choice:{a['choice']}"}
                    for a in c["answers"]
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
            {
                "file": s["id"],
                "at": f"#source:file:{s['id']}",
                "name": s["name"],
                "read": len(s["items"]),
            }
            for s in view["sources"]
            if s["kind"] == "file"
        ],
        # Items the person struck: no clause is left to carry them, so their
        # source is the only place they are.  Read from a document or from
        # the person's words, each with its address there.
        "struck": [
            {
                "words": i["words"],
                "read_from": s["name"] or "the person's message",
                "at": _item_at(s["kind"], s["id"], i["item"]),
            }
            for s in view["sources"]
            for i in s["items"]
            if i["became"] == "struck"
        ],
        "asked": [
            {
                **at(v),
                "says": say(v)
                + (" (negotiable)" if v["softly"] else "")
                + (
                    f" — answers: {'; '.join(plain(a['text']) for a in v['answers'])}"
                    if v["answers"]
                    else " — answers no stated requirement"
                )
                + (
                    " — the person's requirement rests on it: you cannot change it; ask them"
                    if v["held"] and not agent
                    else ""
                ),
            }
            for v in view["variables"]
            if v["standing"] == "asked"
        ],
        # A value asked for softly that the rules could not honour: still
        # asserted, still answering its clause, and no question asked, because
        # a preference is by the person's own account the thing to give up.
        "yielded": [
            {
                **at(v),
                "says": f"{v['heading']}: {label.get(v['asked'], v['asked'])} was negotiable and gave way"
                + (f"; settled on {label.get(v['value'], v['value'])}" if v["value"] else ""),
            }
            for v in view["variables"]
            if v["standing"] == "yielded"
        ],
        "follows": [
            {
                **at(v),
                "says": f"{say(v)} — {', '.join(o['because'] for o in v['owing'])}"
                + (
                    f" (from {', '.join(f['heading'] for f in v['following'])})"
                    if v["following"]
                    else ""
                ),
            }
            for v in view["variables"]
            if v["standing"] == "follows"
        ],
        "unmet": [
            {
                **at(v),
                "says": f"{v['heading']}: {label.get(v['asked'], v['asked'])} cannot be met — "
                + "; ".join(r["because"] for r in v["refused"]),
            }
            for v in view["variables"]
            if v["standing"] == "unmet"
        ],
        "open": [
            {
                "variable": v["name"],
                **at(v),
                "heading": v["heading"],
                "proposed": (
                    (
                        {
                            "label": v["proposed"]["label"],
                            "request": v["proposed"]["request"],
                            "option": v["proposed"]["option"],
                        }
                        if agent
                        else v["proposed"]["label"]
                    )
                    if v["proposed"]
                    else None
                ),
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
            k: view["footprint"][k]
            for k in (
                "made", "installed", "maintained", "run", "ended", "total", "complete",
            )
        },
        # A completion with nothing left proposed has no card on the canvas,
        # and so no address.
        "questions": [
            q
            | (
                {"at": f"#question:{q['about']}"}
                if q["about"] != "completion"
                or any(v["proposed"] for v in view["variables"])
                else {}
            )
            for q in view["questions"]
        ],
        # What the canvas shows beside each item, and what else it could.
        # The model may change this with `show` and `hide`, and nothing else.
        "showing": view["showing"],
        # Which items the canvas is narrowed to, if any — `frame` and
        # `unframe` change it.  `framed` lists what the frame selects.
        "frame": view["frame"],
        "framed": (
            # The unanswered gap selects clauses, not variables.
            [
                f"{c['clause']}: {c['text']} (unanswered)"
                for c in view["clauses"]
                if not c["answers"] and c["negotiability"] != "open"
            ]
            if view["frame"] and view["frame"].get("gap") == "unanswered"
            else [f"{v['heading']} ({v['standing']})" for v in view["variables"] if v["framed"]]
            if view["frame"]
            else None
        ),
        "customer": view["customer"],
        "project": view["project"],
        "quotable": view["quotable"],
        # Each quote issued, with where it stands and which values have moved
        # since; `open_quote` reads the offer itself.
        "quotes": [
            {
                k: q[k]
                for k in (
                    "quote", "number", "standing", "issued", "amount", "until",
                    "committed", "differs",
                )
            }
            | {
                "at": f"#quote:{q['quote']}",
                "page": f"/quotes/{q['quote']}",
                "monthly": q["terms"]["recurring"],
                "months": q["terms"]["months"],
            }
            for q in view["quotes"]
        ],
    }


def quoted(engine: Engine, spec: str, quote: str) -> dict[str, Any]:
    """An issued offer's contents, small enough to hand a language model:
    the quote the canvas lays out as a proposal, read the way `digest` reads
    the specification.  Both the model and the person's own agent read it,
    and nothing here depends on which.

    Everything is as the offer froze it, except the catalogue's labels and
    `differs`, which compares the offer with the specification now.  The
    sentence beside a value is the canvas's, addressed to the person.  Each
    line carries its address on the quote surface under `at`, for a reply to
    link rather than recite.
    """
    q = next((q for q in canvas(engine, spec)["quotes"] if q["quote"] == quote), None)
    if q is None:
        return {"error": f"there is no quote {quote}; `review` lists them under `quotes`"}
    terms = q["terms"]
    at = f"#quote:{quote}"
    heading = {h["name"]: h["heading"] for h in q["holds"]}
    label = {h["name"]: h["label"] for h in q["holds"]}
    grounds = q["grounds"]
    by_others = set(terms.get("byOthers", []))
    # An offer issued before the programme was frozen with it places nothing
    # but the order, and the surface lays out no milestone for it.
    milestones = (terms.get("programme") or {}).get("milestones", [])
    placed = len(milestones) > 1
    week = {m["event"]: m["week"] for m in milestones} if placed else {}

    def value(name: str) -> dict[str, Any]:
        line: dict[str, Any] = {
            "variable": name,
            "value": f"{heading[name]}: {label[name]}",
        }
        # The surface lays out a value's line only with its grounds.
        ground = (grounds or {}).get(name)
        if ground is None:
            return line
        return line | {
            "at": f"{at}:variable:{name}",
            "standing": ground["standing"],
            **(
                {"asked": f"{ground['askedLabel']}, which gave way"}
                if ground.get("askedLabel")
                else {}
            ),
            **({"how": ground["how"]} if ground.get("how") else {}),
            **(
                {"because": [o["because"] for o in ground["owing"]]}
                if ground["owing"]
                else {}
            ),
            # The assertions the rules forced it from, each a line of the
            # offer in its own right.
            **(
                {
                    "from": [
                        {"variable": f["variable"], "heading": f["heading"], "at": f"{at}:variable:{f['variable']}"}
                        for f in ground["following"]
                    ]
                }
                if ground["following"]
                else {}
            ),
            "capital": ground["capital"],
            "monthly": ground["monthly"],
        }

    return {
        "quote": quote,
        "number": q["number"],
        "at": at,
        "page": f"/quotes/{quote}",
        "standing": q["standing"],
        "issued": q["issued"],
        "how": q["how"],
        "until": q["until"],
        "committed": q["committed"],
        "title": terms.get("title"),
        "site": terms.get("site"),
        "amount": q["amount"],
        "monthly": terms["recurring"],
        "months": terms["months"],
        # The sum and the maintenance over the term, before financing, as the
        # quote surface shows it.
        "over_term": q["amount"] + terms["recurring"] * terms["months"],
        "currency": engine.catalogue.get("currency", ""),
        # The values the offer holds that have moved in the specification since.
        "differs": q["differs"],
        # The requirements as they stood at issue, with what answered each.
        "required": (
            [
                {
                    "clause": c["clause"],
                    "at": f"{at}:clause:{c['clause']}",
                    "text": plain(c["text"]),
                    "negotiability": c["negotiability"],
                    "answered_by": [a["label"] for a in c["answeredBy"]]
                    or "nothing in the offer answers it",
                }
                for c in q["requires"]
            ]
            if "requires" in engine.state("Quoting")["from"][quote]
            else "not recorded: the offer was issued before requirements were frozen with it"
        ),
        # Every value supplied, why it holds and what it adds.  An offer
        # issued before grounds were frozen with it carries the values alone.
        "values": [
            value(h["name"]) for h in q["holds"] if h["name"] not in by_others
        ],
        "grounds": (
            "frozen with the offer"
            if grounds is not None
            else "not recorded: the offer was issued before grounds were frozen with it"
        ),
        "programme": (
            [
                {"event": m["event"], "at": f"{at}:event:{m['event']}", "week": m["week"]}
                for m in milestones
            ]
            if placed
            else "not recorded: the offer places no milestone after the order"
        ),
        "warranty_months": terms.get("warranty"),
        # Each payment as a share of the sum, due at its milestone.  A
        # milestone the programme does not place has no week.
        "payments": [
            {
                "upon": stage["upon"],
                "share": stage["share"],
                "amount": round(q["amount"] * stage["share"], 2),
                **(
                    {"event": stage["event"], "week": week.get(stage["event"])}
                    if stage.get("event")
                    else {}
                ),
            }
            for stage in terms.get("stages", [])
        ],
        # What the customer provides: the values the price assumes, and the
        # seller's terms on what is provided.
        "by_others": {
            "values": [value(name) for name in heading if name in by_others],
            "terms": terms.get("clauses", {}).get("provided", []),
        },
    }
