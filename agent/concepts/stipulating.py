"""Stipulating — to hold the conditions on which an offer is made, so that
every quote is made on stated terms.

Generated from `docs/concepts/stipulating.md`.

state
  validity:     Basis -> Natural
  warranty:     Basis -> Natural
  approval:     Basis -> Natural
  installation: Basis -> Natural
  handover:     Basis -> Option -> Natural
  byOthers:     Basis -> set Variable
  stages:       Basis -> seq Stage
  upon:         Stage -> string
  event:        Stage -> Event
  share:        Stage -> Real
  clauses:      Basis -> seq Clause
  section:      Clause -> string
  text:         Clause -> string
  where:        Clause -> set Option

`Basis` is the one Pricing prices on; a payment schedule and a warranty are
terms of the same kind as a financing factor, kept apart because a condition
is a sentence and a price is arithmetic.  Stages and clauses are individuals
minted here, in sequence, because their order is what a reader sees.

`programme` and `terms` are queries, as Pricing's `total` is: the milestones are the ends
of the periods this concept holds, reckoned here and nowhere else, and it
records nothing.
"""

from __future__ import annotations

from typing import Any, Iterable

# The milestones a stage may fall due on, in the order the work reaches them.
EVENTS = ("order", "approval", "dispatch", "completion", "acceptance")


class Stipulating:
    name = "Stipulating"

    def __init__(self) -> None:
        self._validity: dict[str, int] = {}
        self._warranty: dict[str, int] = {}
        self._approval: dict[str, int] = {}
        self._installation: dict[str, int] = {}
        self._handover: dict[str, dict[str, int]] = {}
        self._by_others: dict[str, list[str]] = {}
        self._stages: dict[str, list[str]] = {}
        self._upon: dict[str, str] = {}
        self._event: dict[str, str] = {}
        self._share: dict[str, float] = {}
        self._clauses: dict[str, list[str]] = {}
        self._section: dict[str, str] = {}
        self._text: dict[str, str] = {}
        self._where: dict[str, list[str]] = {}

    def state(self) -> dict[str, Any]:
        return {
            "validity": dict(self._validity),
            "warranty": dict(self._warranty),
            "approval": dict(self._approval),
            "installation": dict(self._installation),
            "handover": {b: dict(ws) for b, ws in self._handover.items()},
            "byOthers": {b: list(vs) for b, vs in self._by_others.items()},
            "stages": {b: list(ss) for b, ss in self._stages.items()},
            "upon": dict(self._upon),
            "event": dict(self._event),
            "share": dict(self._share),
            "clauses": {b: list(cs) for b, cs in self._clauses.items()},
            "section": dict(self._section),
            "text": dict(self._text),
            "where": {c: list(os) for c, os in self._where.items()},
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

    def promise(self, basis: str, option: str, weeks: int) -> dict[str, Any]:
        self._handover.setdefault(basis, {})[option] = int(weeks)
        return {"basis": basis}

    def stage(self, basis: str, upon: str, event: str, share: float) -> dict[str, Any]:
        stages = self._stages.setdefault(basis, [])
        stage = f"{basis}/stage{len(stages) + 1}"
        stages.append(stage)
        self._upon[stage] = upon
        self._event[stage] = event
        self._share[stage] = float(share)
        return {"stage": stage}

    def clause(
        self, basis: str, section: str, text: str, where: Iterable[str] = ()
    ) -> dict[str, Any]:
        clauses = self._clauses.setdefault(basis, [])
        clause = f"{basis}/clause{len(clauses) + 1}"
        clauses.append(clause)
        self._section[clause] = section
        self._text[clause] = text
        if where:
            self._where[clause] = list(where)
        return {"clause": clause}

    def delegate(self, basis: str, variable: str) -> dict[str, Any]:
        delegated = self._by_others.setdefault(basis, [])
        if variable not in delegated:
            delegated.append(variable)
        return {"basis": basis}

    # -- the reads ----------------------------------------------------------

    def terms(self, basis: str, chosen: Iterable[str]) -> dict[str, Any]:
        """The query in `docs/concepts/stipulating.md`: the clauses that
        hold always, and those that hold where a chosen option is in their
        `where`, in the basis's order."""
        held = set(chosen)
        return {
            "clauses": [
                c
                for c in self._clauses.get(basis, [])
                if c not in self._where or held & set(self._where[c])
            ]
        }

    def programme(self, basis: str, chosen: Iterable[str], term: int) -> dict[str, Any]:
        """The query in `docs/concepts/stipulating.md`, and nowhere else.

        order       = 0
        approval    = approval(b)
        dispatch    = handover − installation(b)
        completion  = acceptance = handover
        warranty    = warranty(b) months from acceptance
        maintenance = term months from the end of warranty

        handover is the weeks promised for a chosen option; with none
        promised, only order is placed.
        """
        promised = self._handover.get(basis, {})
        # One option per variable, but nothing here knows that; take the
        # earliest promise rather than the order a set arrived in.
        weeks = sorted(promised[o] for o in chosen if o in promised)
        milestones = [{"event": "order", "week": 0}]
        if weeks:
            handover = weeks[0]
            milestones += [
                {"event": "approval", "week": self._approval.get(basis, 0)},
                {
                    "event": "dispatch",
                    "week": max(handover - self._installation.get(basis, 0), 0),
                },
                {"event": "completion", "week": handover},
                {"event": "acceptance", "week": handover},
            ]
        return {
            "milestones": milestones,
            "warranty": self._warranty.get(basis, 0),
            "maintenance": int(term),
        }
