"""The model's tools.

Three verbs and one reading.  Each is a root action of the bootstrap concept
and nothing more: the tool records that the model called it, and the rules in
`syncs/conduct.py` decide what follows.  A tool body that changed state
directly would make the model a second initiator, which is the thing WYSIWID
§7.2's fourth design rule exists to prevent and the thing the starter this
replaces did in every frontend tool it defined.

The names are ours, and so is the granularity: `assert_value`, `withdraw`,
`propose`.  A log of those three says what happened.  A single `configure(spec)`
taking the whole assignment — the shape this repository used to have — says
only that something did.

`prefer` is gone with `Asserting/prefer`.  Strength is a fact of a clause in
the buyer's words, and this build holds no clauses — see
`docs/concepts/asserting.md`.  The Python function is `assert_value` because
Python reserves `assert`; the tool string the rules match on is `assert`, which
is the vocabulary.
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

    Every assertion already on record is kept. The result is put to the person
    to adopt or refuse — you cannot adopt it yourself, and saying that you have
    would be false.
    """
    completion = engine.root(
        "Copiloting", "invoke", actor="model", tool="propose",
        spec=SPEC, measure=measure,
    )
    return _outcome(completion.flow)


@tool
def review() -> dict[str, Any]:
    """Read the specification: what is asserted, what follows, what is open.

    A projection rather than the state itself. It is accurate as of this call
    and says nothing about what the person has done since.
    """
    return digest(engine, SPEC)


configurator_tools = [assert_value, withdraw, propose, review]
