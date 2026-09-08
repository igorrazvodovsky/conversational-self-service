"""main — discovers the concepts, wires the synchronizations, and reads the
catalogue in.

MSM §5.2.1's `src/main.ts`.  This is the one place outside a concept or a rule
where an action may be invoked, and everything it invokes is invoked as an
action: the catalogue's arrival is as accountable as a person's click.

Why option identities are qualified.  The source file names options inside a
variable — `standard` is a service level, an energy package, a control panel
and a lead time, four different things spelled the same way.  An option is an
[individual](docs/method/individual.md), so it needs an identity that does not
collide, and `variable:value` is that identity.  WYSIWID §6.1 makes the same
move for the same reason and goes further, to full URIs.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from concepts.asserting import Asserting
from concepts.cataloguing import Cataloguing
from concepts.constraining import Constraining
from concepts.conversing import Conversing
from concepts.deciding import Deciding
from concepts.footprinting import Footprinting
from concepts.moding import Moding
from concepts.pricing import Pricing
from engine import Engine
from engine.bootstrap import Copiloting
from syncs import conduct, gestures, propagation, seeding

CATALOGUE = Path(__file__).parent / "catalogue" / "elevator.json"

# One specification per running instance, and one workspace.  A configurator
# sold to anyone would need a specification per session, per customer and per
# revision; leaving that out is a scope decision, not a claim it does not
# matter.  See docs/concepts/README.md, "Not concepts".
SPEC = "spec"
WORKSPACE = "workspace"
GRIDS = {"grid_factor": "today", "grid_factor_decarbonising": "decarbonising"}
# The one basis the catalogue carries: the terms these figures are reckoned on.
# `Pricing` and `Footprinting` can hold a second, and this file seeds one.
BASIS = "catalogue"


def oid(variable: str, value: str) -> str:
    return f"{variable}:{value}"


def build(path: Path = CATALOGUE) -> Engine:
    engine = Engine()
    for concept in (
        Copiloting(),
        Cataloguing(),
        Constraining(),
        Pricing(),
        Footprinting(),
        Asserting(),
        Conversing(),
        Deciding(),
        Moding(),
    ):
        engine.register(concept)
    _alias_assert(engine)
    engine.react(*seeding.rules, *propagation.rules, *gestures.rules, *conduct.rules)

    catalogue = json.loads(path.read_text())
    _load(engine, catalogue)
    _open(engine)

    engine.catalogue = catalogue
    engine.settled_at = engine.log.last_seq
    return engine


def _alias_assert(engine: Engine) -> None:
    """`Asserting/assert`, under the name the specification gives it.

    Python reserves `assert`, so the generated method is `assert_`.  The engine
    dispatches with `getattr(concept, action)` and is not edited for a language
    keyword — MSM §5.2.4 — so the alias is registered here, where the concepts
    are discovered.  Every rule invokes `assert`, and the log reads
    `Asserting/assert`.
    """
    asserting = engine.concepts["Asserting"]
    setattr(asserting, "assert", asserting.assert_)


def _load(engine: Engine, catalogue: dict[str, Any]) -> None:
    flow = engine.log.open_flow()

    def do(concept: str, action: str, **input: Any) -> None:
        engine.root(concept, action, actor="boot", flow=flow, **input)

    for variable in catalogue["variables"]:
        name = variable["name"]
        do(
            "Cataloguing",
            "describe",
            variable=name,
            heading=variable.get("label", name),
            family=variable.get("group", "other"),
        )
        for option in variable["options"]:
            identity = oid(name, option["value"])
            # Cataloguing/list, and by rule Constraining/offer.
            do(
                "Cataloguing",
                "list",
                variable=name,
                option=identity,
                label=option.get("label", option["value"]),
            )
            if option.get("note"):
                do("Cataloguing", "annotate", option=identity, note=option["note"])
            if option.get("price") is not None:
                do("Pricing", "list", option=identity, capital=option["price"])
            if option.get("monthly_price") is not None:
                do("Pricing", "list", option=identity, monthly=option["monthly_price"])
            if option.get("co2") is not None:
                do("Footprinting", "attribute", option=identity, embodied=option["co2"])

    pricing = catalogue.get("pricing", {})
    for value, months in pricing.get("term_months", {}).items():
        do("Pricing", "span", option=oid("contract_term", value), months=months)
    if pricing.get("default_term"):
        do(
            "Pricing",
            "presume",
            basis=BASIS,
            option=oid("contract_term", pricing["default_term"]),
        )
    if pricing.get("financing_factor") is not None:
        do("Pricing", "finance", basis=BASIS, factor=pricing["financing_factor"])

    footprint = catalogue.get("footprint", {})
    for klass, by_usage in footprint.get("annual_kwh", {}).items():
        for usage, by_travel in by_usage.items():
            for travel, energy in by_travel.items():
                do(
                    "Footprinting",
                    "meter",
                    klass=oid("energy_class", klass),
                    usage=oid("usage_profile", usage),
                    travel=oid("travel", travel),
                    energy=energy,
                )
    for key, grid in GRIDS.items():
        if footprint.get(key) is not None:
            do("Footprinting", "rate", grid=grid, intensity=footprint[key])
    do(
        "Footprinting",
        "frame",
        basis=BASIS,
        horizon=footprint.get("service_life_years", 0),
        uplift=footprint.get("fabrication_multiplier", 1.0),
        scope=footprint.get("module_scope", ""),
    )

    for rule in catalogue.get("constraints", []):
        if rule["type"] == "table":
            over = rule["vars"]
            do(
                "Constraining",
                "tabulate",
                rule=rule["id"],
                over=over,
                allows=[
                    [oid(variable, value) for variable, value in zip(over, tuple_)]
                    for tuple_ in rule["allowed"]
                ],
                because=rule["label"],
            )
        else:
            do(
                "Constraining",
                "imply",
                rule=rule["id"],
                given=[
                    {
                        "variable": condition["var"],
                        "among": [
                            oid(condition["var"], value) for value in condition["in"]
                        ],
                    }
                    for condition in rule["if_all"]
                ],
                entails={
                    "variable": rule["then"]["var"],
                    "among": [
                        oid(rule["then"]["var"], value) for value in rule["then"]["in"]
                    ],
                },
                because=rule["label"],
            )


def _open(engine: Engine) -> None:
    flow = engine.log.open_flow()
    for surface in ("chat", "canvas"):
        engine.root(
            "Moding", "offer", actor="boot", flow=flow, workspace=WORKSPACE, surface=surface
        )
    engine.root(
        "Moding", "focus", actor="boot", flow=flow, workspace=WORKSPACE, surface="chat"
    )
    engine.root("Asserting", "start", actor="boot", flow=flow, spec=SPEC)
