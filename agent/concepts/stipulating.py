"""Stipulating — to hold the conditions on which an offer is made, so that
every quote is made on stated terms.

Generated from `docs/concepts/stipulating.md`.

state
  validity:     Basis -> Natural
  warranty:     Basis -> Natural
  approval:     Basis -> Natural
  installation: Basis -> Natural
  byOthers:     Basis -> set Variable
  stages:       Basis -> seq Stage
  upon:         Stage -> string
  share:        Stage -> Real
  clauses:      Basis -> seq Clause
  section:      Clause -> string
  text:         Clause -> string

`Basis` is the one Pricing prices on; a payment schedule and a warranty are
terms of the same kind as a financing factor, kept apart because a condition
is a sentence and a price is arithmetic.  Stages and clauses are individuals
minted here, in sequence, because their order is what a reader sees.
"""

from __future__ import annotations

from typing import Any


class Stipulating:
    name = "Stipulating"

    def __init__(self) -> None:
        self._validity: dict[str, int] = {}
        self._warranty: dict[str, int] = {}
        self._approval: dict[str, int] = {}
        self._installation: dict[str, int] = {}
        self._by_others: dict[str, list[str]] = {}
        self._stages: dict[str, list[str]] = {}
        self._upon: dict[str, str] = {}
        self._share: dict[str, float] = {}
        self._clauses: dict[str, list[str]] = {}
        self._section: dict[str, str] = {}
        self._text: dict[str, str] = {}

    def state(self) -> dict[str, Any]:
        return {
            "validity": dict(self._validity),
            "warranty": dict(self._warranty),
            "approval": dict(self._approval),
            "installation": dict(self._installation),
            "byOthers": {b: list(vs) for b, vs in self._by_others.items()},
            "stages": {b: list(ss) for b, ss in self._stages.items()},
            "upon": dict(self._upon),
            "share": dict(self._share),
            "clauses": {b: list(cs) for b, cs in self._clauses.items()},
            "section": dict(self._section),
            "text": dict(self._text),
        }

    # -- actions ------------------------------------------------------------

    def stipulate(
        self, basis: str, validity: int, warranty: int, approval: int, installation: int
    ) -> dict[str, Any]:
        self._validity[basis] = int(validity)
        self._warranty[basis] = int(warranty)
        self._approval[basis] = int(approval)
        self._installation[basis] = int(installation)
        return {"basis": basis}

    def stage(self, basis: str, upon: str, share: float) -> dict[str, Any]:
        stages = self._stages.setdefault(basis, [])
        stage = f"{basis}/stage{len(stages) + 1}"
        stages.append(stage)
        self._upon[stage] = upon
        self._share[stage] = float(share)
        return {"stage": stage}

    def clause(self, basis: str, section: str, text: str) -> dict[str, Any]:
        clauses = self._clauses.setdefault(basis, [])
        clause = f"{basis}/clause{len(clauses) + 1}"
        clauses.append(clause)
        self._section[clause] = section
        self._text[clause] = text
        return {"clause": clause}

    def delegate(self, basis: str, variable: str) -> dict[str, Any]:
        delegated = self._by_others.setdefault(basis, [])
        if variable not in delegated:
            delegated.append(variable)
        return {"basis": basis}
