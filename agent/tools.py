"""The model's tools.

A verb per thing the model may do, and two readings.  Each verb is a root action of the bootstrap concept
and nothing more: the tool records that the model called it, and the rules in
`syncs/conduct.py` decide what follows.  Each is performed in the flow the
person's message opened (`hearing.turn()`), so the log joins the words to the
call made in reply and the canvas can show which words a value was read from.  A tool body that changed state
directly would make the model a second initiator, which is the thing WYSIWID
§7.2's fourth design rule exists to prevent and the thing the starter this
replaces did in every frontend tool it defined.

The names are ours, and so is the granularity: `assert_value`, `withdraw`,
`read`, `propose`, `introduce`, `entitle`, `quote`, `show`, `hide`, `frame`,
`unframe`.  A log of those says what happened.

`read` is the one that carries a source.  A requirement the model perceives
in the person's words or in a document they attached is recorded with the
words it was read from and the options the model took to answer it, and the
rules in `syncs/reading.py` state it as a clause and assert the answer.  The
utterance it names is the turn's own, handed over by `hearing.py` as the
flow token is; a document is named by its id, and `open_file` returns its
text from the log, so what the model read is what is on record.  A single `configure(spec)`
taking the whole assignment — the shape this repository used to have — says
only that something did.

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

from typing import Any, Literal

from langchain.tools import tool

from engine import Record
from hearing import heard, turn
from instance import SPEC, engine
from syncs import readings
from views import digest, filed


def _outcome(completion: Record) -> dict[str, Any]:
    """What the rules did with the stimulus, in the vocabulary they did it in.

    Read from the completion onward rather than from the start of the flow:
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
    return {"did": did, "state": digest(engine, SPEC)}


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
    that every tool returns. An assertion that cannot be met is still recorded,
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


@tool
def read(
    words: str, answer: list[str] | None = None, file: str | None = None
) -> dict[str, Any]:
    """Record a requirement you read, with the words it was read from and the
    catalogue options you take to answer it.

    Call this once per requirement, for anything the person or their document
    requires of the lift: a load, a speed, a finish, a service term, a
    condition. `words` is the requirement copied from the source as one
    unbroken passage: trim either end, never cut the middle, never
    paraphrase. `answer` is the option ids that answer it,
    exactly as `review` lists them under `open`, such as `rated_load:kg1250`,
    never a label; several when one sentence settles several variables, only
    what the words themselves settle, and empty when nothing in the catalogue
    answers it. An empty answer is still worth recording: the clause is kept
    with its source, and the person can answer it or take it further.
    `file` is the id of the document the words are from, as `review` lists
    it under `files`; leave it out when they are from the person's message.
    Words the cited source does not contain read nothing, and come back
    under `refused`.

    The clause is stated on the canvas as your reading, cited to its source,
    and each option in `answer` is asserted as answering it. An id the
    catalogue does not offer answers nothing and comes back under
    `not_offered`; call `read` again with the right ids rather than leaving
    the clause unanswered. An option whose variable answers a requirement the
    person stated is not asserted, and comes back under `not_asserted`: the
    clause stays unanswered, and answering it is the person's, even with the
    value it already has.
    A count is answered by the option whose range
    contains it: six stops is `stops:s2_6`. A value that cannot be met is
    still recorded and comes back with the rules that refuse it; keep reading
    the rest of the source before raising it. Use `assert_value` for context
    that is not a requirement, such as the region a city implies.
    """
    offers = engine.state("Cataloguing")["offers"]
    variable_of = {o: v for v, options in offers.items() for o in options}
    asserted = engine.state("Asserting")["asserted"].get(SPEC, {})
    held = {o: _held(variable_of[o]) for o in (answer or []) if o in variable_of}
    completion = engine.root(
        "Copiloting", "invoke", actor="model", flow=turn(), tool="read",
        spec=SPEC, words=words, answer=list(answer or []), file=file,
        utterance=None if file else heard(),
    )
    offered = {
        option
        for options in engine.state("Cataloguing")["offers"].values()
        for option in options
    }
    outcome = _outcome(completion)
    if not any(entry["action"] == "Reading/read" for entry in outcome["did"]):
        # The rule declined: the words are not in the cited source.
        outcome["refused"] = (
            "nothing was read: the words are not in the cited source; "
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
    return {
        **outcome,
        "not_offered": [o for o in (answer or []) if o not in offered],
    }


@tool
def open_file(file: str) -> dict[str, Any]:
    """Read a document the person attached, as it is on record.

    `file` is an id from the `files` list `review` returns. Returns the
    document's name and its text, which is what you read requirements from
    with `read`. A projection, like `review`; it changes nothing.
    """
    return filed(engine, file)


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

    One is issued to the person only when every variable is settled and nothing
    asserted is unmet; otherwise nothing happens, and `quotable` in the result
    says why. The quote freezes the values and the price as they are now. You
    cannot accept it — only the person can, on the canvas — and saying that the
    lift has been ordered would be false.
    """
    completion = engine.root(
        "Copiloting", "invoke", actor="model", flow=turn(), tool="quote", spec=SPEC,
    )
    return _outcome(completion)


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
    each option adds), `notes` (the catalogue's note on each option),
    `excluded` (which rule rules an option out), `rules` (the rule behind a
    value that follows), `answers` (the requirement an asserted value
    answers), `how` (who asserted a value, and the words it was read from). Changes what the person sees and
    nothing else; use it when they ask to see something at a glance rather
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
def frame(variable: str | None = None, clause: str | None = None) -> dict[str, Any]:
    """Narrow the canvas to one assertion or to one requirement.

    With `variable`, an asserted variable's name from the `asked` list
    `review` returns: the canvas shows that assertion, every value that
    follows from it and the rule, every open variable whose options it ruled
    out, and any assertion it made unmet — with the three sections kept. Use
    it when the person asks what one choice cost them or what it changed,
    rather than listing the consequences in the chat.

    With `clause`, a clause's id from the `required` list: the canvas shows
    the values answering that requirement, what those forced, and everything
    still open that could answer it. Use it when the conversation is about
    one requirement. You cannot answer the clause; the person picks.

    One or the other. `review` reports the frame under `frame` and the items
    in it under `framed`. The canvas narrows only when this is called; saying
    it has been narrowed without calling it would be false.
    """
    if clause and not variable:
        value: dict[str, Any] = {"by": "clause", "clause": clause}
    elif variable and not clause:
        value = {"by": "assertion", "variable": variable}
    else:
        return {"did": [{"action": "frame", "refused": "give a variable or a clause, not both or neither"}]}
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


@tool
def review() -> dict[str, Any]:
    """Read the specification: what the person requires in their own words,
    what is asserted and which requirement each value answers, what follows,
    and what is open.

    `required` lists the person's clauses. You cannot state or answer one —
    the person does both on the canvas — but an assertion you make should
    respect them, and when a value you assert meets a clause, say so.

    A projection rather than the state itself. It is accurate as of this call
    and says nothing about what the person has done since.
    """
    return digest(engine, SPEC)


configurator_tools = [
    assert_value, withdraw, read, propose, introduce, entitle, quote,
    show, hide, frame, unframe, review, open_file,
]
