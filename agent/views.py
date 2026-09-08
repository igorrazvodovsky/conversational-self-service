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

from typing import Any

from engine import Engine
from wiring import BASIS

# Which rule put an assertion on record, in words.  Three sentences, three
# rules, and no field anywhere recording which: the difference between them is
# a provenance edge.  `Asserting.assertedBy` answers a different question —
# *whose value is this* — and `APersonAssertsAValue` and
# `AnAdoptedCompletionBecomesAssertions` both answer it with the same party.
HOW = {
    "APersonAssertsAValue": "you asked for this",
    "TheModelMayAssertAValue": "the assistant asked for this",
    "AnAdoptedCompletionBecomesAssertions": "adopted from a proposal",
}


def _provenance(engine: Engine, spec: str) -> dict[str, str]:
    """The rule behind the most recent assertion recorded for each variable.

    Scanned from the boot mark rather than from the start of the log: the
    catalogue's arrival is a thousand-odd records of `Cataloguing` and
    `Pricing`, and no assertion can precede it.
    """
    how: dict[str, str] = {}
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
            how[output["variable"]] = record.via or "recorded at boot"
    return how


def canvas(engine: Engine, spec: str, grid: str = "today") -> dict[str, Any]:
    with engine.turn:
        return _canvas(engine, spec, grid)


def _canvas(engine: Engine, spec: str, grid: str) -> dict[str, Any]:
    catalogue = engine.state("Cataloguing")
    constraining = engine.state("Constraining")
    asserting = engine.state("Asserting")
    moding = engine.state("Moding")
    pricing = engine.concepts["Pricing"]
    footprinting = engine.concepts["Footprinting"]
    capital = pricing.state()["capital"]
    monthly = pricing.state()["monthly"]
    embodied = footprinting.state()["embodied"]

    asserted = asserting["asserted"].get(spec, {})
    assumed = constraining["assumed"].get(spec, {})
    possible = constraining["possible"].get(spec, {})
    settled = constraining["settled"].get(spec, {})
    owing = constraining["owing"].get(spec, {})
    refused = constraining["refused"].get(spec, {})
    how = _provenance(engine, spec)

    variables = []
    for name, offered in catalogue["offers"].items():
        allowed = set(possible.get(name, offered))
        asked = asserted.get(name)
        unmet = name in asserted and assumed.get(name) != asserted[name]
        value = settled.get(name)
        if unmet:
            standing = "unmet"
        elif asked is not None:
            standing = "asked"
        elif value is not None:
            standing = "follows"
        else:
            standing = "open"
        variables.append(
            {
                "name": name,
                "heading": catalogue["heading"].get(name, name),
                "family": catalogue["family"].get(name, "other"),
                "standing": standing,
                "asked": asked,
                "how": HOW.get(how.get(name, ""), how.get(name)) if asked else None,
                "value": value,
                "owing": [
                    {"rule": rule, "because": constraining["because"].get(rule, rule)}
                    for rule in owing.get(name, [])
                ],
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
                    }
                    for option in offered
                ],
            }
        )

    chosen = list(settled.values())
    # Every open question, not one.  A conflict and a proposed completion are
    # two requests about the same specification and can be pending together;
    # they used to share a request key, so asking either erased the other.
    questions = [
        q
        for q in engine.concepts["Deciding"].pending()
        if isinstance(q["request"], dict) and q["request"].get("spec") == spec
    ]
    for q in questions:
        q["about"] = q["request"].get("about")

    return {
        "spec": spec,
        "grid": grid,
        "product": engine.catalogue.get("name", ""),
        "currency": engine.catalogue.get("currency", ""),
        "mode": moding["active"].get("workspace", "chat"),
        "variables": variables,
        "price": pricing.total(chosen, BASIS),
        "footprint": footprinting.footprint(chosen, grid, BASIS),
        "questions": questions,
        "counts": {
            "asked": sum(1 for v in variables if v["standing"] == "asked"),
            "follows": sum(1 for v in variables if v["standing"] == "follows"),
            "open": sum(1 for v in variables if v["standing"] == "open"),
            "unmet": sum(1 for v in variables if v["standing"] == "unmet"),
        },
        # Behaviour only: the catalogue's arrival is a thousand records of
        # Cataloguing and Pricing, and nobody wants to read it back.
        "log": [
            r.as_json()
            for r in engine.log.records(since=engine.settled_at, limit=24)
            if r.kind == "completion"
        ],
    }


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
        "asked": [say(v) for v in view["variables"] if v["standing"] == "asked"],
        "follows": [
            f"{say(v)} — {', '.join(o['because'] for o in v['owing'])}"
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
    }
