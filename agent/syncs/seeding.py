"""Seeding — `docs/syncs/seeding.md`.

The catalogue arrives as a stimulus of the bootstrap concept, `Copiloting/boot`,
and every fact it leaves in a concept is carried there by a rule.  Nothing is
invoked around the rules: MSM §5.2.3's invariant, that every action reaches
the log by way of a synchronization, holds for the catalogue as it does for a
click.

Each concept is seeded by its own rule off the stimulus, not by a chain off
`Cataloguing/list`: a price does not follow from an option being listed, and
hanging `Pricing/list` behind `Cataloguing/list` would have required the latter
to carry an amount, which is the option record reassembled.  The one fact that
does follow from listing, an option's place in the solver's range, is carried
from `Cataloguing/list` itself.
"""

from __future__ import annotations

from typing import Any

from engine import Completion, Invocation, States, Sync

BOOT = ("Copiloting", "boot")


def oid(variable: str, value: str) -> str:
    """An option's identity: `variable:value`, since values repeat across variables."""
    return f"{variable}:{value}"


def _catalogue(c: Completion) -> dict[str, Any]:
    return c.output.get("catalogue") or {}


def _the_seller_is_introduced(c: Completion, _: States) -> list[Invocation]:
    vendor = _catalogue(c).get("vendor")
    if not vendor:
        return []
    details = {
        k: vendor[k]
        for k in ("name", "organisation", "address", "email", "phone")
        if k in vendor
    }
    return [
        Invocation(
            "Profiling", "introduce", {"party": vendor.get("party", "seller"), **details}
        )
    ]


def _the_sellers_terms_are_stipulated(c: Completion, _: States) -> list[Invocation]:
    terms = _catalogue(c).get("terms")
    if not terms:
        return []
    basis = terms.get("basis", c.output["basis"])
    out = [
        Invocation(
            "Stipulating",
            "stipulate",
            {
                "basis": basis,
                "validity": terms.get("validity_days", 30),
                "warranty": terms.get("warranty_months", 12),
                "approval": terms.get("approval_weeks", 4),
                "installation": terms.get("installation_weeks", 6),
            },
        )
    ]
    for variable in _catalogue(c).get("variables", []):
        for option in variable["options"]:
            if option.get("weeks") is not None:
                out.append(
                    Invocation(
                        "Stipulating",
                        "promise",
                        {
                            "basis": basis,
                            "option": oid(variable["name"], option["value"]),
                            "weeks": option["weeks"],
                        },
                    )
                )
    for stage in terms.get("schedule", []):
        out.append(
            Invocation(
                "Stipulating",
                "stage",
                {
                    "basis": basis,
                    "upon": stage["upon"],
                    "event": stage["event"],
                    "share": stage["share"],
                },
            )
        )
    for section, texts in terms.get("clauses", {}).items():
        for text in texts:
            out.append(
                Invocation(
                    "Stipulating",
                    "clause",
                    {"basis": basis, "section": section, "text": text},
                )
            )
    for variable in terms.get("by_others", []):
        out.append(
            Invocation("Stipulating", "delegate", {"basis": basis, "variable": variable})
        )
    return out


def _the_catalogue_is_listed(c: Completion, _: States) -> list[Invocation]:
    out: list[Invocation] = []
    for variable in _catalogue(c).get("variables", []):
        name = variable["name"]
        out.append(
            Invocation(
                "Cataloguing",
                "describe",
                {
                    "variable": name,
                    "heading": variable.get("label", name),
                    "family": variable.get("group", "other"),
                },
            )
        )
        for option in variable["options"]:
            identity = oid(name, option["value"])
            out.append(
                Invocation(
                    "Cataloguing",
                    "list",
                    {
                        "variable": name,
                        "option": identity,
                        "label": option.get("label", option["value"]),
                    },
                )
            )
            if option.get("note"):
                out.append(
                    Invocation(
                        "Cataloguing", "annotate", {"option": identity, "note": option["note"]}
                    )
                )
    return out


def _the_catalogue_is_priced(c: Completion, _: States) -> list[Invocation]:
    catalogue = _catalogue(c)
    basis = c.output["basis"]
    out: list[Invocation] = []
    for variable in catalogue.get("variables", []):
        for option in variable["options"]:
            identity = oid(variable["name"], option["value"])
            if option.get("price") is not None:
                out.append(
                    Invocation("Pricing", "list", {"option": identity, "capital": option["price"]})
                )
            if option.get("monthly_price") is not None:
                out.append(
                    Invocation(
                        "Pricing", "list", {"option": identity, "monthly": option["monthly_price"]}
                    )
                )
    pricing = catalogue.get("pricing", {})
    for value, months in pricing.get("term_months", {}).items():
        out.append(
            Invocation(
                "Pricing", "span", {"option": oid("contract_term", value), "months": months}
            )
        )
    if pricing.get("default_term"):
        out.append(
            Invocation(
                "Pricing",
                "presume",
                {"basis": basis, "option": oid("contract_term", pricing["default_term"])},
            )
        )
    if pricing.get("financing_factor") is not None:
        out.append(
            Invocation(
                "Pricing", "finance", {"basis": basis, "factor": pricing["financing_factor"]}
            )
        )
    return out


def _the_catalogue_is_footprinted(c: Completion, _: States) -> list[Invocation]:
    catalogue = _catalogue(c)
    out: list[Invocation] = []
    for variable in catalogue.get("variables", []):
        for option in variable["options"]:
            if option.get("co2") is not None:
                out.append(
                    Invocation(
                        "Footprinting",
                        "attribute",
                        {
                            "option": oid(variable["name"], option["value"]),
                            "embodied": option["co2"],
                        },
                    )
                )
    footprint = catalogue.get("footprint", {})
    for klass, by_usage in footprint.get("annual_kwh", {}).items():
        for usage, by_travel in by_usage.items():
            for travel, energy in by_travel.items():
                out.append(
                    Invocation(
                        "Footprinting",
                        "meter",
                        {
                            "klass": oid("energy_class", klass),
                            "usage": oid("usage_profile", usage),
                            "travel": oid("travel", travel),
                            "energy": energy,
                        },
                    )
                )
    for key, grid in c.output.get("grids", {}).items():
        if footprint.get(key) is not None:
            out.append(
                Invocation("Footprinting", "rate", {"grid": grid, "intensity": footprint[key]})
            )
    out.append(
        Invocation(
            "Footprinting",
            "frame",
            {
                "basis": c.output["basis"],
                "horizon": footprint.get("service_life_years", 0),
                "uplift": footprint.get("fabrication_multiplier", 1.0),
                "scope": footprint.get("module_scope", ""),
            },
        )
    )
    return out


def _the_catalogue_sets_the_rules(c: Completion, _: States) -> list[Invocation]:
    out: list[Invocation] = []
    for rule in _catalogue(c).get("constraints", []):
        if rule["type"] == "table":
            over = rule["vars"]
            out.append(
                Invocation(
                    "Constraining",
                    "tabulate",
                    {
                        "rule": rule["id"],
                        "over": over,
                        "allows": [
                            [oid(variable, value) for variable, value in zip(over, tuple_)]
                            for tuple_ in rule["allowed"]
                        ],
                        "because": rule["label"],
                    },
                )
            )
        else:
            out.append(
                Invocation(
                    "Constraining",
                    "imply",
                    {
                        "rule": rule["id"],
                        "given": [
                            {
                                "variable": condition["var"],
                                "among": [
                                    oid(condition["var"], value) for value in condition["in"]
                                ],
                            }
                            for condition in rule["if_all"]
                        ],
                        "entails": {
                            "variable": rule["then"]["var"],
                            "among": [
                                oid(rule["then"]["var"], value)
                                for value in rule["then"]["in"]
                            ],
                        },
                        "because": rule["label"],
                    },
                )
            )
    return out


def _the_workspace_is_laid_out(c: Completion, _: States) -> list[Invocation]:
    workspace = c.output["workspace"]
    surfaces = c.output.get("surfaces", [])
    out = [
        Invocation("Moding", "offer", {"workspace": workspace, "surface": surface})
        for surface in surfaces
    ]
    if surfaces:
        out.append(
            Invocation("Moding", "focus", {"workspace": workspace, "surface": surfaces[0]})
        )
    for facet in c.output.get("facets", []):
        out.append(
            Invocation(
                "Showing",
                "offer",
                {"lens": workspace, "facet": facet["facet"], "about": facet["about"]},
            )
        )
        if facet.get("shown"):
            out.append(
                Invocation("Showing", "show", {"lens": workspace, "facet": facet["facet"]})
            )
    return out


def _a_specification_is_started(c: Completion, _: States) -> list[Invocation]:
    return [Invocation("Asserting", "start", {"spec": c.output["spec"]})]


def _seeds_the_solver(c: Completion, _: States) -> list[Invocation]:
    if c.failed:
        return []
    return [
        Invocation(
            "Constraining",
            "offer",
            {"variable": c.output["variable"], "option": c.output["option"]},
        )
    ]


def _leaves_the_solver(c: Completion, _: States) -> list[Invocation]:
    if c.failed:
        return []
    return [
        Invocation(
            "Constraining",
            "withhold",
            {"variable": c.output["variable"], "option": c.output["option"]},
        )
    ]


# In this order: a rule fires with every earlier rule's consequences already
# in place, and the specification is started last, once the solver holds the
# rules it will be given to.
rules = [
    Sync("TheSellerIsIntroduced", BOOT, _the_seller_is_introduced),
    Sync("TheSellersTermsAreStipulated", BOOT, _the_sellers_terms_are_stipulated),
    Sync("TheCatalogueIsListed", BOOT, _the_catalogue_is_listed),
    Sync("TheCatalogueIsPriced", BOOT, _the_catalogue_is_priced),
    Sync("TheCatalogueIsFootprinted", BOOT, _the_catalogue_is_footprinted),
    Sync("TheCatalogueSetsTheRules", BOOT, _the_catalogue_sets_the_rules),
    Sync("TheWorkspaceIsLaidOut", BOOT, _the_workspace_is_laid_out),
    Sync("ASpecificationIsStartedAtBoot", BOOT, _a_specification_is_started),
    Sync("TheCatalogueSeedsTheSolver", ("Cataloguing", "list"), _seeds_the_solver),
    Sync("ADelistedOptionLeavesTheSolver", ("Cataloguing", "delist"), _leaves_the_solver),
]
