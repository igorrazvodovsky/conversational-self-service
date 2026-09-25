"""The model's tools.

Ten verbs and one reading.  Each is a root action of the bootstrap concept
and nothing more: the tool records that the model called it, and the rules in
`syncs/conduct.py` decide what follows.  A tool body that changed state
directly would make the model a second initiator, which is the thing WYSIWID
§7.2's fourth design rule exists to prevent and the thing the starter this
replaces did in every frontend tool it defined.

The names are ours, and so is the granularity: `assert_value`, `withdraw`,
`propose`, `introduce`, `entitle`, `quote`, `show`, `hide`, `frame`,
`unframe`.  A log of those says what happened.  A single `configure(spec)`
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

from instance import SPEC, engine
from views import digest


def _outcome(flow: str) -> dict[str, Any]:
    """What the rules did with the stimulus, in the vocabulary they did it in."""
    did = []
    for record in engine.log.flow(flow):
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


@tool
def assert_value(variable: str, option: str) -> dict[str, Any]:
    """Assert this option for this variable, on the person's behalf.

    `variable` is a variable name such as `building_type`; `option` is a full
    option id such as `building_type:hospital`. Read them from the `open` list
    that every tool returns. An assertion that cannot be met is still recorded,
    and comes back with the rules that refuse it.
    """
    completion = engine.root(
        "Copiloting", "invoke", actor="model", tool="assert",
        spec=SPEC, variable=variable, option=option,
    )
    return _outcome(completion.flow)


@tool
def withdraw(variable: str) -> dict[str, Any]:
    """Take back whatever was asserted of this variable.

    What follows from the remaining assertions is recomputed; a value that was
    only ever an entailment reverts to being open.
    """
    completion = engine.root(
        "Copiloting", "invoke", actor="model", tool="withdraw",
        spec=SPEC, variable=variable,
    )
    return _outcome(completion.flow)


@tool
def propose(measure: Literal["cost", "carbon"] = "cost") -> dict[str, Any]:
    """Work out the cheapest or lowest-carbon way to finish the specification.

    Every assertion already on record is kept. Each value proposed for a
    still-open variable is put to the person beside that variable, to take
    one at a time or all at once — you cannot adopt any of it yourself, and
    saying that you have would be false.
    """
    completion = engine.root(
        "Copiloting", "invoke", actor="model", tool="propose",
        spec=SPEC, measure=measure,
    )
    return _outcome(completion.flow)


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
        "Copiloting", "invoke", actor="model", tool="quote", spec=SPEC,
    )
    return _outcome(completion.flow)


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
        "Copiloting", "invoke", actor="model", tool="introduce",
        name=name, organisation=organisation, address=address, email=email, phone=phone,
    )
    return _outcome(completion.flow)


@tool
def entitle(title: str | None = None, site: str | None = None) -> dict[str, Any]:
    """Record what the job is called and where the lift is going.

    `site` is the building's address, and a quote cannot be issued without
    one. `title` is a short name for the job, such as "Riverside clinic, bed
    lift". Pass only what the person said.
    """
    completion = engine.root(
        "Copiloting", "invoke", actor="model", tool="entitle",
        spec=SPEC, title=title, site=site,
    )
    return _outcome(completion.flow)


@tool
def show(facet: str) -> dict[str, Any]:
    """Show a kind of fact on the canvas, beside every item it concerns.

    `facet` is one of the names `review` lists under `showing`, each with
    what it shows and whether it is shown now: `price` and `carbon` (what
    each option adds), `notes` (the catalogue's note on each option),
    `excluded` (which rule rules an option out), `rules` (the rule behind a
    value that follows), `answers` (the requirement an asserted value
    answers), `how` (who asserted a value). Changes what the person sees and
    nothing else; use it when they ask to see something at a glance rather
    than reciting the figures.
    """
    completion = engine.root(
        "Copiloting", "invoke", actor="model", tool="show", facet=facet,
    )
    return _outcome(completion.flow)


@tool
def hide(facet: str) -> dict[str, Any]:
    """Stop showing a kind of fact on the canvas. The inverse of `show`, over
    the same names; use it when the person says the canvas is too busy or
    asks to hide something.
    """
    completion = engine.root(
        "Copiloting", "invoke", actor="model", tool="hide", facet=facet,
    )
    return _outcome(completion.flow)


@tool
def frame(variable: str) -> dict[str, Any]:
    """Narrow the canvas to what followed from one assertion.

    `variable` is an asserted variable's name, from the `asked` list `review`
    returns. The canvas then shows that assertion, every value that follows
    from it and the rule, every open variable whose options it ruled out, and
    any assertion it made unmet — with the three sections kept. Use it when
    the person asks what one choice cost them or what it changed, rather than
    listing the consequences in the chat. `review` reports the frame under
    `frame` and the items in it under `framed`. The canvas narrows only when
    this is called; saying it has been narrowed without calling it would be
    false.
    """
    completion = engine.root(
        "Copiloting", "invoke", actor="model", tool="frame",
        frame={"by": "assertion", "variable": variable},
    )
    return _outcome(completion.flow)


@tool
def unframe() -> dict[str, Any]:
    """Show the whole canvas again. The inverse of `frame`."""
    completion = engine.root("Copiloting", "invoke", actor="model", tool="unframe")
    return _outcome(completion.flow)


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
    assert_value, withdraw, propose, introduce, entitle, quote,
    show, hide, frame, unframe, review,
]
