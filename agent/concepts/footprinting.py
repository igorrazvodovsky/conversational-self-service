"""Footprinting — to estimate the carbon a specification will emit over its life.

Generated from `docs/concepts/footprinting.md`.

state
  embodied:  Option -> Mass
  installed: Option -> Mass
  upkeep:    Option -> Mass
  ended:     Option -> Mass
  demand:    Option -> Option -> Option -> Energy
  intensity: Grid -> Mass
  horizon:   Basis -> Natural
  uplift:    Basis -> Real
  scope:     Basis -> string

`Basis` is a type parameter for the reason `Grid` is one.  A service life of
twenty-five years moves the balance between the made and run halves at least as
much as the grid intensity does, so holding one horizon would present a
contested estimate as a fact.  The catalogue seeds one basis today.

Making, installing, upkeep and the end of life are kept as separate relations
rather than one figure per option, because each falls at a different point in
the lift's life and only one of them is multiplied out over the years: upkeep
accrues over the basis's horizon, which is the service life, while a contract
term belongs to Pricing and appears nowhere here.

As with Pricing, the footprint is a read and not an action.
"""

from __future__ import annotations

from typing import Any, Iterable


class Footprinting:
    name = "Footprinting"

    def __init__(self) -> None:
        self._embodied: dict[str, float] = {}
        self._installed: dict[str, float] = {}
        self._upkeep: dict[str, float] = {}
        self._ended: dict[str, float] = {}
        self._demand: dict[tuple[str, str, str], float] = {}
        self._intensity: dict[str, float] = {}
        self._horizon: dict[str, int] = {}
        self._uplift: dict[str, float] = {}
        self._scope: dict[str, str] = {}

    def state(self) -> dict[str, Any]:
        return {
            "embodied": dict(self._embodied),
            "installed": dict(self._installed),
            "upkeep": dict(self._upkeep),
            "ended": dict(self._ended),
            "demand": {"/".join(k): v for k, v in self._demand.items()},
            "intensity": dict(self._intensity),
            "horizon": dict(self._horizon),
            "uplift": dict(self._uplift),
            "scope": dict(self._scope),
        }

    # -- actions ------------------------------------------------------------

    def attribute(
        self,
        option: str,
        embodied: float | None = None,
        installed: float | None = None,
        ended: float | None = None,
    ) -> dict[str, Any]:
        """One action with a case per stage, as `Pricing/list` has one per kind of amount."""
        if embodied is not None:
            self._embodied[option] = float(embodied)
        if installed is not None:
            self._installed[option] = float(installed)
        if ended is not None:
            self._ended[option] = float(ended)
        return {"option": option}

    def recur(self, option: str, upkeep: float) -> dict[str, Any]:
        self._upkeep[option] = float(upkeep)
        return {"option": option}

    def meter(
        self, klass: str, usage: str, travel: str, energy: float
    ) -> dict[str, Any]:
        self._demand[(klass, usage, travel)] = float(energy)
        return {}

    def rate(self, grid: str, intensity: float) -> dict[str, Any]:
        self._intensity[grid] = float(intensity)
        return {"grid": grid}

    def frame(
        self, basis: str, horizon: int, uplift: float, scope: str
    ) -> dict[str, Any]:
        self._horizon[basis] = int(horizon)
        self._uplift[basis] = float(uplift)
        self._scope[basis] = scope
        return {"basis": basis}

    # -- the read -----------------------------------------------------------

    def footprint(
        self, chosen: Iterable[str], grid: str, basis: str
    ) -> dict[str, Any]:
        """The formula in `docs/concepts/footprinting.md`, and nowhere else.

        made       = uplift(b) × Σ embodied(o)
        installed  = Σ installed(o)
        maintained = Σ upkeep(o) × horizon(b)
        annual     = demand(class, usage, travel)
        run        = annual × intensity(grid) × horizon(b)
        ended      = Σ ended(o)
        footprint  = made + installed + maintained + run + ended
        """
        chosen = list(chosen)
        uplift = self._uplift.get(basis, 1.0)
        horizon = self._horizon.get(basis, 0)
        made = uplift * sum(self._embodied.get(o, 0.0) for o in chosen)
        installed = sum(self._installed.get(o, 0.0) for o in chosen)
        maintained = horizon * sum(self._upkeep.get(o, 0.0) for o in chosen)
        ended = sum(self._ended.get(o, 0.0) for o in chosen)
        annual = 0.0
        known = False
        for (klass, usage, travel), energy in self._demand.items():
            if klass in chosen and usage in chosen and travel in chosen:
                annual = energy
                known = True
                break
        intensity = self._intensity.get(grid, 0.0)
        run = annual * intensity * horizon
        return {
            "made": round(made),
            "installed": round(installed),
            "maintained": round(maintained),
            "annual": round(annual),
            "run": round(run),
            "ended": round(ended),
            "total": round(made + installed + maintained + run + ended),
            "grid": grid,
            "intensity": intensity,
            "basis": basis,
            "horizon": horizon,
            "uplift": uplift,
            "scope": self._scope.get(basis, ""),
            "complete": known,
        }
