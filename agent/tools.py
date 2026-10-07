"""The model's tools.

A verb per thing the model may do, and the readings it answers from.  Each verb is a root action of the bootstrap concept
and nothing more: the tool records that the model called it, and the rules in
`syncs/conduct.py` decide what follows.  Each is performed in the flow the
person's message opened (`hearing.turn()`), so the log joins the words to the
call made in reply and the canvas can show which words a value was read from.  A tool body that changed state
directly would make the model a second initiator, which is the thing WYSIWID
§7.2's fourth design rule exists to prevent.

The names are ours, and so is the granularity: a log of those says what
happened, where a single `configure(spec)` taking the whole assignment would
say only that something did.

`read` is the one that carries a source.  A requirement the model perceives
in the person's words or in a document they attached is recorded with the
words it was read from and the options the model took to answer it, and the
rules in `syncs/reading.py` state it as a clause and assert the answer.  The
utterance it names is the turn's own, handed over by `hearing.py` as the
flow token is; a document is named by its id, and `open_file` returns its
text from the log, so what the model read is what is on record.

A verb returns what it did, never the specification: each result stays in
the conversation and goes back to the model at every later step, so a
digest in each would make a document of many requirements cost the square
of their number.  `read` takes every requirement a source states in one
call and performs one invocation per item, so the log is the same as for
separate calls.

`review`, `look_up`, `open_file` and `open_quote` are readings: each returns a
projection of state and records nothing, so the model asking what an offer
holds is not an action anybody performed.  `open_quote` is the offer as it
was frozen at issue, the record the quote surface lays out and the person's
own agent reads through `open_quote` in `delegate.py`.

`show`, `hide`, `frame` and `unframe` are the four that change no fact: they
choose which facts the canvas shows beside each item
(`docs/concepts/showing.md`) and which items it shows at all
(`docs/concepts/framing.md`), so that *show me the price next to each
option* and *what followed from the hospital?* are things the model does
rather than things it recites.

There is no `prefer`.  Strength is a fact of a clause in the buyer's words —
`Specifying.negotiability`, which the person sets on the canvas and no tool
reaches — and a value the person bound to a negotiable clause reaches the
solver softly by a rule that reads the tag (`docs/syncs/propagation.md`).
`assert_value` is always hard: a value the model asserts answers no clause.
The Python function is `assert_value` because Python reserves `assert`; the
tool string the rules match on is `assert`, which is the vocabulary.
"""

from __future__ import annotations

from collections import Counter
from typing import Annotated, Any, Literal, NotRequired, TypedDict

from langchain.tools import tool
from langchain_core.tools import InjectedToolCallId
from langgraph.types import interrupt

from engine import Record, States
from hearing import follow, heard, turn
from instance import SPEC, engine
from syncs import readings
from syncs.gestures import unaddressed
from views import detailed, digest, filed, put_addressee, put_question, quoted


def _did(completion: Record) -> list[dict[str, Any]]:
    """Read from the completion onward rather than from the start of the flow:
    a tool call made in reply to a message runs in the flow the message
    opened, alongside the words themselves and any earlier calls of the turn.
    """
    did = []
    for record in engine.log.flow(completion.flow):
        if record.seq <= completion.seq:
            continue
        if record.kind != "completion" or record.concept == "Copiloting":
            continue
        entry: dict[str, Any] = {"action": f"{record.concept}/{record.action}"}
        if record.via:
            entry["by rule"] = record.via
        error = (record.output or {}).get("error")
        if error:
            entry["refused"] = error
        did.append(entry)
    return did


def _outcome(completion: Record) -> dict[str, Any]:
    return _standing({"did": _did(completion)})


def _standing(outcome: dict[str, Any]) -> dict[str, Any]:
    """What the model must say before the turn ends: an assertion that cannot
    be met, a negotiable one that gave way, and a conflict not yet put."""
    state = digest(engine, SPEC)
    for key in ("unmet", "yielded"):
        if state[key]:
            outcome[key] = state[key]
    if _unasked():
        outcome["next"] = (
            "a conflict is open and has not been put to the person: once nothing "
            "else is left to do this turn, call `ask` with it instead of asking in "
            "the reply"
        )
        outcome["question"] = next(
            {"because": q["reason"], "options": [o["option"] for o in q["options"]]}
            for q in readings.pending(engine.state("Deciding"))
            if q["request"] == CONFLICT
        )
    return outcome


def _unasked() -> bool:
    """A conflict is pending and the model has not put it as it stands."""
    if not any(
        q["request"] == CONFLICT for q in readings.pending(engine.state("Deciding"))
    ):
        return False
    put = _asked()
    # The last question put was answered, or displaced, and a conflict is
    # still pending: it is a later one, not yet put.
    if put is None or put["status"] in {"overtaken", "chosen"}:
        return True
    if put["status"] not in {"replied", "passed"}:
        return False
    # Answered in words, or passed over: ask again only once the person has
    # spoken since about something else — a new turn, not the one the reply
    # resumed.
    conversing = engine.state("Conversing")
    last = next(
        (u for u in reversed(conversing["utterances"]) if conversing["by"].get(u) == "person"),
        None,
    )
    return last is not None and conversing["about"].get(last) != put["about"]


def _held(variable: str) -> list[str]:
    """The requirements the person stated that rest on this variable's value:
    `?v is held for a reason in ?s`, read from state as the rules read it, so
    the tool can say why a call on it did nothing."""
    specifying = engine.state("Specifying")
    clauses = readings.reasons(
        engine.state("Asserting"), engine.state("Binding"), specifying, SPEC
    ).get(variable, [])
    return [specifying["text"].get(c, c) for c in clauses]


def _not_done(
    outcome: dict[str, Any], held: list[str], already: bool = False
) -> dict[str, Any]:
    """A call on a held value records nothing; say why, so the model neither
    retries nor claims the change.  Asserting the value it already holds
    changes nothing either, and there is nothing to ask the person."""
    if held and not any(e["action"].startswith("Asserting/") for e in outcome["did"]):
        quoted = "; ".join(f"“{text}”" for text in held)
        if already:
            outcome["unchanged"] = (
                f"the value is already this, and answers a requirement the person stated ({quoted})"
            )
        else:
            outcome["refused"] = (
                f"not done: the value answers a requirement the person stated ({quoted}), "
                "so it is theirs to change; ask them to change it on the canvas"
            )
    return outcome


@tool
def assert_value(variable: str, option: str) -> dict[str, Any]:
    """Assert this option for this variable, on the person's behalf.

    `variable` is a variable name such as `building_type`; `option` is a full
    option id such as `building_type:hospital`. Read them from the `open` list
    that `review` returns. An assertion that cannot be met is still recorded,
    and comes back with the rules that refuse it. A value that answers a
    requirement the person stated is theirs: the call does nothing, and comes
    back under `refused` saying so, or under `unchanged` when it already is
    the option asked for.
    """
    held = _held(variable)
    already = engine.state("Asserting")["asserted"].get(SPEC, {}).get(variable) == option
    completion = engine.root(
        "Copiloting", "invoke", actor="model", flow=turn(), tool="assert",
        spec=SPEC, variable=variable, option=option,
    )
    return _not_done(_outcome(completion), held, already)


@tool
def withdraw(variable: str) -> dict[str, Any]:
    """Take back whatever was asserted of this variable.

    What follows from the remaining assertions is recomputed; a value that was
    only ever an entailment reverts to being open. A value that answers a
    requirement the person stated is theirs, as for `assert_value`.
    """
    held = _held(variable)
    completion = engine.root(
        "Copiloting", "invoke", actor="model", flow=turn(), tool="withdraw",
        spec=SPEC, variable=variable,
    )
    return _not_done(_outcome(completion), held)


class Requirement(TypedDict):
    """One requirement read from a source."""

    words: str
    answer: NotRequired[list[str]]
    file: NotRequired[str]


@tool
def read(items: list[Requirement]) -> dict[str, Any]:
    """Record the requirements you read, each with the words it was read
    from and the catalogue options you take to answer it.

    One item per requirement, for anything the person or their document
    requires of the lift: a load, a speed, a finish, a service term, a
    condition. Pass every requirement a message or a document states in one
    call, in the order the source states them. `words` is the requirement copied from the source as one
    unbroken passage: trim either end, never cut the middle, never
    paraphrase. `answer` is the option ids that answer it, exactly as
    `review` lists them, such as `rated_load:kg1250`, never a label: under
    `open`, or a value under `follows` or `asked` when the words ask for what
    already holds, which then answers this clause too. Several when one
    sentence settles several variables, one option per variable, only what
    the words themselves settle, and empty only when nothing in the
    catalogue answers it, since an empty answer tells the person the
    catalogue has nothing for it. An empty answer is still worth recording:
    the clause is kept with its source, and the person can answer it or take
    it further. Words asking for two things, one the catalogue answers and
    one it does not, are two items, each its own passage, so the miss is not
    hidden in an answered clause.
    `file` is the id of the document the words are from, as `review` lists
    it under `files`; leave it out when they are from the person's message.

    Each item is read in turn and comes back under `read`, in the same
    order, with what the rules did with it. Words the cited source does not
    contain read nothing, and come back under `refused`.

    The clause is stated on the canvas as your reading, cited to its source,
    and each option in `answer` is asserted as answering it. An id the
    catalogue does not offer answers nothing and comes back under
    `not_offered`; read that item again with the right ids rather than leaving
    the clause unanswered. An option whose variable answers a requirement the
    person stated is not asserted, and comes back under `not_asserted`: the
    clause stays unanswered, and answering it is the person's, even with the
    value it already has.
    A count is answered by the option whose range
    contains it: six stops is `stops:s2_6`. A value that cannot be met is
    still recorded and comes back under `unmet` with the rules that refuse it; keep reading
    the rest of the source before raising it. Use `assert_value` for context
    that is not a requirement, such as the region a city implies.
    """
    # Each item is its own invocation, in the turn's flow, so the rules and
    # the log see one reading per requirement; what an item did
    # is read before the next is performed, or it would claim the next's.
    outcome: dict[str, Any] = {"read": [_read(item) for item in items]}
    if any("refused" not in item for item in outcome["read"]):
        # Whose the clause is, said where the model learns it was stated.
        outcome["yours"] = (
            "each clause read is your reading of their words, not their "
            "requirement: call it that until they keep it on the canvas"
        )
    return _standing(outcome)


def _read(item: Requirement) -> dict[str, Any]:
    words, answer, file = item["words"], list(item.get("answer") or []), item.get("file")
    offers = engine.state("Cataloguing")["offers"]
    variable_of = {o: v for v, options in offers.items() for o in options}
    asserted = engine.state("Asserting")["asserted"].get(SPEC, {})
    held = {o: _held(variable_of[o]) for o in answer if o in variable_of}
    utterance = None if file else heard()
    completion = engine.root(
        "Copiloting", "invoke", actor="model", flow=turn(), tool="read",
        spec=SPEC, words=words, answer=answer, file=file,
        utterance=utterance,
    )
    outcome: dict[str, Any] = {"words": words, "did": _did(completion)}
    named = Counter(variable_of[o] for o in dict.fromkeys(answer) if o in variable_of)
    twice = sorted(v for v, times in named.items() if times > 1)
    if not any(entry["action"] == "Reading/read" for entry in outcome["did"]):
        # The rule declined: an answer naming two options on one variable,
        # words that are a reply to a question, or words the cited source does
        # not bear out, which includes there being no source to check.
        reply = utterance is not None and utterance in engine.state("Conversing")["about"]
        outcome["refused"] = (
            "nothing was read: the answer names more than one option for "
            + ", ".join(twice)
            + "; read the item again with the one option the words ask for"
            if twice
            else "nothing was read: these words are a reply to your question, "
            "and a reply is not a requirement. If it says which assertion gives "
            "way, withdraw that one; otherwise answer it in words"
            if reply
            else "nothing was read: the words are not in the cited source; "
            "copy them as one passage, and pass `file` if they are from the document"
        )
    else:
        kept = {o: texts for o, texts in held.items() if texts}
        if kept:
            outcome["not_asserted"] = [
                (
                    f"{o}: already the value, for "
                    + "; ".join(f"“{t}”" for t in texts)
                    + ", which the person stated; this clause stays unanswered "
                    "until they answer it on the canvas"
                    if asserted.get(variable_of[o]) == o
                    else f"{o}: its variable answers "
                    + "; ".join(f"“{t}”" for t in texts)
                    + ", which the person stated; tell them, and leave the choice to them"
                )
                for o, texts in kept.items()
            ]
    not_offered = [o for o in answer if o not in variable_of]
    if not_offered:
        outcome["not_offered"] = not_offered
    return outcome


@tool
def open_file(file: str) -> dict[str, Any]:
    """Read a document the person attached, as it is on record.

    `file` is an id from the `files` list `review` returns. Returns the
    document's name and its text, which is what you read requirements from
    with `read`. A projection, like `review`; it changes nothing.
    """
    return filed(engine, file)


@tool
def open_quote(quote: str) -> dict[str, Any]:
    """Read an issued quote, as the offer was frozen when it was made.

    `quote` is an id from the `quotes` list `review` returns, where each
    quote's `number` is what the person calls it ("No. 2"). Returns what the
    offer holds: each requirement as it stood with what answered it, or that
    nothing did; each value with its standing, why it holds — who asked for
    it, in the canvas's words to the person, or the rules that force it —
    and what it adds to the sum and the monthly charge; the programme's
    milestones by week, the payments due at each, the warranty, and what
    the customer provides. `differs` lists the values that have moved in the
    specification since. A projection, like `review`; it changes nothing.

    Every line carries its address under `at`: link it when you explain the
    line, rather than reciting the offer. You cannot accept or revoke a
    quote; the person does, on the quote surface.
    """
    return quoted(engine, SPEC, quote)


@tool
def look_up(variable: str | None = None) -> dict[str, Any]:
    """Read what the seller publishes about one variable and its options,
    or, with no variable, the seller's terms.

    `variable` is a bare name like `access_control`, as `review` lists it.
    Returns, for the variable and for each option, the particulars of what
    it is and does, under the topic each answers (`particulars`) — the
    systems it works with, the interfaces it speaks, what it covers — and,
    where the seller has stated them, what the price of the option includes,
    excludes and asks the customer to provide (`scope`), which an offer
    carrying the option prints among its terms; the price of each option;
    which option the specification has settled; and the rules that mention
    the variable, in their own sentences. Link `at` when you answer from it.

    With no variable, returns the terms an offer issued now would carry:
    how long it stands, the warranty, the weeks to drawings and on site, the
    payment stages, what is left to others, and the clauses — `included`,
    `excluded`, what the customer has `provided`, and the `conditions` — that
    hold for the options settled. A projection, like `review`; it changes
    nothing.
    """
    return detailed(engine, SPEC, variable)


@tool
def propose(measure: Literal["cost", "carbon"] = "cost") -> dict[str, Any]:
    """Work out the cheapest or lowest-carbon way to finish the specification.

    Every assertion already on record is kept. Each value proposed for a
    still-open variable is put to the person beside that variable, to take
    one at a time or all at once — you cannot adopt any of it yourself, and
    saying that you have would be false.
    """
    completion = engine.root(
        "Copiloting", "invoke", actor="model", flow=turn(), tool="propose",
        spec=SPEC, measure=measure,
    )
    return _outcome(completion)


@tool
def quote() -> dict[str, Any]:
    """Ask for a quote on the specification as it stands.

    One is issued to the person only when every variable is settled, nothing
    asserted is unmet, and the person's name and the site are on record;
    otherwise nothing happens, and `quotable` in the result says why. The
    quote freezes the values and the price as they are now. You cannot accept
    it — only the person can, on the canvas — and saying that the lift has
    been ordered would be false.
    """
    completion = engine.root(
        "Copiloting", "invoke", actor="model", flow=turn(), tool="quote", spec=SPEC,
    )
    outcome = _outcome(completion)
    if not any(e["action"] == "Quoting/quote" for e in outcome["did"]):
        outcome["quotable"] = digest(engine, SPEC)["quotable"]
        lacking = _lacking()
        if lacking:
            outcome["next"] = (
                f"only the {' and the '.join(lacking)} stand in the way: call `ask` "
                f"with missing={lacking}, rather than asking in the reply, and the "
                "turn waits for them"
            )
    return outcome


def _lacking() -> list[str] | None:
    """What the specification lacks for a quote, when it lacks only who the
    quote is for: `?s lacks only ?f for a quote`, as the rule reads it."""
    return unaddressed(States(engine.concepts), SPEC)


@tool
def introduce(
    name: str | None = None,
    organisation: str | None = None,
    address: str | None = None,
    email: str | None = None,
    phone: str | None = None,
) -> dict[str, Any]:
    """Record who the person is, for the quotation's letterhead.

    Only what the person actually said: pass a detail when they gave it and
    leave the rest out. Each call adds to what is recorded; nothing is erased.
    A quote cannot be issued until at least a name is on record.
    """
    completion = engine.root(
        "Copiloting", "invoke", actor="model", flow=turn(), tool="introduce",
        name=name, organisation=organisation, address=address, email=email, phone=phone,
    )
    return _outcome(completion)


@tool
def entitle(title: str | None = None, site: str | None = None) -> dict[str, Any]:
    """Record what the job is called and where the lift is going.

    `site` is the building's address, and a quote cannot be issued without
    one. `title` is a short name for the job, such as "Riverside clinic, bed
    lift". Pass only what the person said.
    """
    completion = engine.root(
        "Copiloting", "invoke", actor="model", flow=turn(), tool="entitle",
        spec=SPEC, title=title, site=site,
    )
    return _outcome(completion)


@tool
def show(facet: str) -> dict[str, Any]:
    """Show a kind of fact on the canvas, beside every item it concerns.

    `facet` is one of the names `review` lists under `showing`, each with
    what it shows and whether it is shown now: `price` and `carbon` (what
    each option adds), `excluded` (which rule rules an option out), `rules`
    (the rule behind a value that follows), `answers` (the requirement an
    asserted value answers), `how` (who asserted a value, and the words it
    was read from). Changes what the person sees and nothing else; use it when they ask to see something at a glance rather
    than reciting the figures.
    """
    completion = engine.root(
        "Copiloting", "invoke", actor="model", flow=turn(), tool="show", facet=facet,
    )
    return _outcome(completion)


@tool
def hide(facet: str) -> dict[str, Any]:
    """Stop showing a kind of fact on the canvas. The inverse of `show`, over
    the same names; use it when the person says the canvas is too busy or
    asks to hide something.
    """
    completion = engine.root(
        "Copiloting", "invoke", actor="model", flow=turn(), tool="hide", facet=facet,
    )
    return _outcome(completion)


@tool
def frame(
    variable: str | None = None, clause: str | None = None, gap: str | None = None
) -> dict[str, Any]:
    """Narrow the canvas to one assertion, one requirement, or one gap.

    With `variable`, an asserted variable's name from the `asked` list
    `review` returns: the canvas shows that assertion, every value that
    follows from it and the rule, every open variable whose options it ruled
    out, and any assertion it made unmet. Use
    it when the person asks what one choice cost them or what it changed,
    rather than listing the consequences in the chat.

    With `clause`, a clause's id from the `required` list: the canvas shows
    the values answering that requirement, what those forced, and everything
    still open that could answer it. Use it when the conversation is about
    one requirement. You cannot answer the clause; the person picks.

    With `gap`, one of `open` (the variables nothing has settled),
    `unanswered` (the requirements nothing answers) or `unbound` (the values
    answering no requirement, with what they forced): the canvas shows only
    that. Use it when the person asks what is left to do.

    Exactly one of the three. `review` reports the frame under `frame` and
    the items in it under `framed`. The canvas narrows only when this is
    called; saying it has been narrowed without calling it would be false.
    """
    given = [k for k, v in (("variable", variable), ("clause", clause), ("gap", gap)) if v]
    if given == ["clause"]:
        value: dict[str, Any] = {"by": "clause", "clause": clause}
    elif given == ["variable"]:
        value = {"by": "assertion", "variable": variable}
    elif given == ["gap"] and gap in ("open", "unanswered", "unbound"):
        value = {"by": "gap", "gap": gap}
    else:
        return {"did": [{"action": "frame", "refused": "give exactly one of a variable, a clause or a gap (open, unanswered, unbound)"}]}
    completion = engine.root(
        "Copiloting", "invoke", actor="model", flow=turn(), tool="frame", frame=value,
    )
    return _outcome(completion)


@tool
def unframe() -> dict[str, Any]:
    """Show the whole canvas again. The inverse of `frame`."""
    completion = engine.root(
        "Copiloting", "invoke", actor="model", flow=turn(), tool="unframe"
    )
    return _outcome(completion)


# The request a conflict on the specification is asked as.
CONFLICT = {"spec": SPEC, "about": "conflict"}


def _asked() -> dict[str, Any] | None:
    return put_question(engine, CONFLICT)


def _already_asked(call: str) -> bool:
    """LangGraph runs a tool's body again from the top when its run resumes, so the question is
    recorded only once per call; read from the log, so a run resumed after
    a restart asks nothing twice either."""
    return any(
        record.kind == "completion"
        and record.concept == "Copiloting"
        and record.action == "invoke"
        and (record.output or {}).get("tool") == "ask"
        and (record.output or {}).get("call") == call
        for record in engine.log.records(since=engine.settled_at, limit=1_000_000)
    )


def _reply(utterance: str) -> tuple[str, str] | None:
    for record in engine.log.records(since=engine.settled_at, limit=1_000_000):
        if (
            record.kind == "completion"
            and record.concept == "Conversing"
            and (record.output or {}).get("utterance") == utterance
        ):
            return record.flow, record.actor
    return None


def _answered(put: dict[str, Any]) -> dict[str, Any]:
    """What ended the wait, in words the model can act on."""
    status = put["status"]
    if status == "chosen":
        given = put["chosen"] or {}
        return {
            "answered": f"the person gave up {given.get('variable')} = "
            f"{given.get('option')}; say in one sentence what followed"
        }
    if status == "declined":
        return {"answered": "the person left it for now; do not ask it again"}
    if status == "withdrawn":
        return {"answered": "the conflict went another way and its question with it"}
    if status == "passed":
        return {
            "answered": "the person talked about something else; the question is "
            "still on the canvas, unanswered — do not press it"
        }
    if status == "overtaken":
        return {
            "answered": "a later conflict changed the question; `review` shows it, "
            "and you may ask that one"
        }
    reply = put["replies"][-1]
    source = _reply(reply["utterance"])
    by = "the person"
    if source is not None:
        flow, actor = source
        follow(flow, reply["utterance"])
        if actor == "browser":
            by = "the person's own agent"
    # Whose each offered value is, by who stated the clause it answers, not
    # by how firmly that clause is meant.
    yours, theirs = [], []
    for offered in (put.get("about") or {}).get("offered") or []:
        (theirs if _held(offered["variable"]) else yours).append(offered["option"])
    return {
        "replied": reply["text"],
        "by": by,
        "answered": f"{by} replied in words and the question is still open, on the "
        "canvas beside the reply. Answer the reply in words first: if it asks what "
        "else is in the way, name the values under `unmet`. If it says which "
        "assertion gives way and that one is under `yours_to_withdraw`, withdraw it, "
        "whether or not its clause is fixed; if it is under `theirs`, point them to "
        "the question. If it hands the decision to someone else, say you leave it "
        "with them. Do not ask the question again in this turn",
        "yours_to_withdraw": yours,
        "theirs": theirs,
    }


def _quoted_since(utterance: str) -> bool:
    """The person may have requested a quote themselves once the name and
    the site were in."""
    said = None
    for record in engine.log.records(since=engine.settled_at, limit=1_000_000):
        if record.kind != "completion" or "error" in (record.output or {}):
            continue
        if record.concept == "Conversing" and (record.output or {}).get("utterance") == utterance:
            said = record.seq
        elif said is not None and record.concept == "Quoting" and record.action == "quote":
            return True
    return False


def _addressed(put: dict[str, Any]) -> dict[str, Any]:
    """What ended the wait for the addressee, in words the model can act on."""
    status = put["status"]
    if status == "recorded":
        if _quoted_since(put["utterance"]):
            return {"answered": "the name and the site are on record and a quote has "
                    "been issued since; say so, and do not request another"}
        return {"answered": "the name and the site are on record: call `quote` now, "
                "which is what the person asked for"}
    if status == "withdrawn":
        return {"answered": "the specification now lacks more than who the quote is "
                "for; `quotable` in `review` says what"}
    if status == "passed":
        return {"answered": "the person talked about something else; the quote still "
                "lacks who it is for — do not press it"}
    reply = put["replies"][-1]
    source = _reply(reply["utterance"])
    by = "the person"
    if source is not None:
        flow, actor = source
        follow(flow, reply["utterance"])
        if actor == "browser":
            by = "the person's own agent"
    return {
        "replied": reply["text"],
        "by": by,
        "still_missing": put["lacking"],
        "answered": f"{by} replied in words. If the reply gives the name, record it "
        "with `introduce`; if it gives the site, record it with `entitle`; then call "
        "`quote`. Record only what they said. If it gives neither, answer what they "
        "said, and do not ask again in this turn",
    }


def _ask_who_the_quote_is_for(
    question: str, missing: list[str], tool_call_id: str
) -> dict[str, Any]:
    if not _already_asked(tool_call_id):
        lacking = _lacking()
        if lacking is None:
            return {
                "refused": "the specification lacks more than who the quote is for, "
                "and that comes first: `quotable` in `review` says what",
            }
        if not lacking:
            return {"refused": "the name and the site are on record: call `quote`"}
        before = put_addressee(engine, SPEC)
        if before is not None and before["status"] == "awaiting":
            return {"refused": "already asked, and still waiting on the person"}
        if before is not None and before["status"] in {"replied", "passed"}:
            conversing = engine.state("Conversing")
            last = next(
                (u for u in reversed(conversing["utterances"])
                 if conversing["by"].get(u) == "person"),
                None,
            )
            if last is not None and conversing["about"].get(last) == before["about"]:
                return {
                    "refused": "the person answered this question in words in this "
                    "turn: answer what they said instead of asking again",
                }
        completion = engine.root(
            "Copiloting", "invoke", actor="model", flow=turn(), tool="ask",
            spec=SPEC, missing=list(dict.fromkeys(missing)), text=question,
            call=tool_call_id,
        )
        if not any(entry["action"] == "Conversing/say" for entry in _did(completion)):
            return {
                "refused": f"the quote lacks the {' and the '.join(lacking)}: ask "
                f"with missing={lacking}",
            }
    put = put_addressee(engine, SPEC)
    if put is None:
        return {"refused": "not asked"}
    if put["status"] == "awaiting":
        # As for a conflict: the chat resumes the run once the view shows the
        # question no longer awaits an answer.
        interrupt(
            {
                "reason": "addressee",
                "message": put["text"],
                "toolCallId": tool_call_id,
                "question": put["about"],
            }
        )
        put = put_addressee(engine, SPEC) or put
    return {"status": put["status"], **_addressed(put), "state": digest(engine, SPEC)}


@tool
def ask(
    question: str,
    tool_call_id: Annotated[str, InjectedToolCallId],
    options: list[str] | None = None,
    missing: list[Literal["name", "site"]] | None = None,
) -> dict[str, Any]:
    """Put a question the turn cannot go past to the person, and wait for the answer.

    Two questions can be put, each naming its matter. Give exactly one of
    `options` or `missing`.

    The open conflict: `options` is the option ids the question offers to
    give up, exactly as `review` lists them under the open conflict in
    `questions`, such as `door_finish:glass`. Only that conflict can be
    asked: other values that cannot be met wait under `unmet`, and come back
    as the question once it is settled. `question` says, in one or two
    sentences, which rule refuses what, and which assertion gives way.

    Who the quote is for: `missing` is what a quote the person asked for
    lacks and nothing else does, `name` (the person's), `site` (where the
    lift goes), or both. `question` asks for them in a sentence. The chat
    links to where they fill them in, and they may answer in words instead.

    Your turn waits until the person answers, by a gesture or in words; then
    this returns what happened. Call it last in a turn, once there is
    nothing else to do before the answer. You cannot answer it yourself.
    """
    if (options is None) == (missing is None):
        return {"refused": "give exactly one of `options` (a conflict) or `missing` "
                "(who the quote is for)"}
    if missing is not None:
        return _ask_who_the_quote_is_for(question, missing, tool_call_id)
    if not _already_asked(tool_call_id):
        open_ = next(
            (
                q
                for q in readings.pending(engine.state("Deciding"))
                if q["request"] == CONFLICT
            ),
            None,
        )
        if open_ is None:
            return {"refused": "there is no open conflict to ask about"}
        before = _asked()
        if before is not None and before["status"] == "awaiting":
            return {"refused": "already asked, and still waiting on the person"}
        if before is not None and before["status"] in {"replied", "passed"} and not _unasked():
            # The question is on the canvas with the reply beside it; it is
            # put again in a turn the person opens, not in the one the reply
            # resumed.  See `docs/syncs/conduct.md`, "Asking, and waiting for
            # the answer".
            return {
                "refused": "the person answered this question in words in this "
                "turn, and it stays on the canvas beside their reply: answer what "
                "they said in words instead of asking again",
            }
        offers = engine.state("Cataloguing")["offers"]
        variable_of = {o: v for v, options_ in offers.items() for o in options_}
        named = [
            {"variable": variable_of.get(o), "option": o} for o in dict.fromkeys(options)
        ]
        completion = engine.root(
            "Copiloting", "invoke", actor="model", flow=turn(), tool="ask",
            spec=SPEC, request=CONFLICT, offered=named, text=question,
            call=tool_call_id,
        )
        if not any(entry["action"] == "Conversing/say" for entry in _did(completion)):
            # The rule declined: the options named are not the open conflict's.
            return {
                "refused": "the open conflict offers other options; ask about "
                "it, with these ids, and the rest come back once it is settled",
                "open": {
                    "because": open_["reason"],
                    "options": [o["option"] for o in open_["options"]],
                },
            }
    put = _asked()
    if put is None:
        return {"refused": "not asked"}
    if put["status"] == "awaiting":
        # The floor passes to the person.  The run pauses here and the chat
        # resumes it once the view shows the question no longer awaits an
        # answer; the resume carries nothing, and what happened is read
        # from state below.
        deciding = engine.state("Deciding")
        reason = next(
            (q["reason"] for q in readings.pending(deciding) if q["request"] == CONFLICT),
            "",
        )
        interrupt(
            {
                "reason": "conflict",
                "message": put["text"],
                "toolCallId": tool_call_id,
                "because": reason,
                "question": put["about"],
            }
        )
        put = _asked() or put
    return {
        "status": put["status"],
        "given": (put["chosen"] or {}).get("option"),
        **_answered(put),
        "state": digest(engine, SPEC),
    }


@tool
def review() -> dict[str, Any]:
    """Read the specification: what the person requires in their own words,
    what is asserted and which requirement each value answers, what follows,
    and what is open.

    `required` lists the person's clauses. You cannot state or answer one —
    the person does both on the canvas — but an assertion you make should
    respect them, and when a value you assert meets a clause, say so.

    `quotes` lists every quote issued, with its number, where it stands and
    which values have moved since; `open_quote` reads what one offers.

    Every item comes with its address on the canvas under `at`: link it in
    the reply rather than reciting it.  `struck` lists the items read from a
    source that the person struck, which no clause carries any more.

    A projection rather than the state itself. It is accurate as of this call
    and says nothing about what the person has done since.
    """
    state = digest(engine, SPEC)
    if _unasked():
        state["next"] = (
            "a conflict is open and has not been put to the person: once you have "
            "done what this turn needs, call `ask` with it instead of asking in "
            "the reply"
        )
    return state


configurator_tools = [
    assert_value, withdraw, read, propose, introduce, entitle, quote,
    show, hide, frame, unframe, review, look_up, open_file, open_quote, ask,
]
