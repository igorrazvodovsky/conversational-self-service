"""Footprinting — to estimate the carbon a specification will emit over its life.

Generated from `docs/concepts/footprinting.md`.

state
  embodied:  Option -> Mass
  demand:    Option -> Option -> Option -> Energy
  intensity: Grid -> Mass
  horizon:   Basis -> Natural
  uplift:    Basis -> Real
  scope:     Basis -> string

`Basis` is a type parameter for the reason `Grid` is one.  A service life of
twenty-five years moves the balance between the made and run halves at least as
much as the grid intensity does, so holding one horizon would present a
contested estimate as a fact.  The catalogue seeds one basis today.

As with Pricing, the footprint is a read and not an action.
"""

from __future__ import annotations

from typing import Any, Iterable


class Footprinting:
    name = "Footprinting"

    def __init__(self) -> None:
        self._embodied: dict[str, float] = {}
        self._demand: dict[tuple[str, str, str], float] = {}
        self._intensity: dict[str, float] = {}
        self._horizon: dict[str, int] = {}
        self._uplift: dict[str, float] = {}
        self._scope: dict[str, str] = {}

    def state(self) -> dict[str, Any]:
        return {
            "embodied": dict(self._embodied),
            "demand": {"/".join(k): v for k, v in self._demand.items()},
            "intensity": dict(self._intensity),
            "horizon": dict(self._horizon),
            "uplift": dict(self._uplift),
            "scope": dict(self._scope),
        }

    # -- actions ------------------------------------------------------------

    def attribute(self, option: str, embodied: float) -> dict[str, Any]:
        self._embodied[option] = float(embodied)
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

        made      = uplift(b) × Σ embodied(o)
        annual    = demand(class, usage, travel)
        run       = annual × intensity(grid) × horizon(b)
        footprint = made + run
        """
        chosen = list(chosen)
        uplift = self._uplift.get(basis, 1.0)
        horizon = self._horizon.get(basis, 0)
        made = uplift * sum(self._embodied.get(o, 0.0) for o in chosen)
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
            "annual": round(annual),
            "run": round(run),
            "total": round(made + run),
            "grid": grid,
            "intensity": intensity,
            "basis": basis,
            "horizon": horizon,
            "uplift": uplift,
            "scope": self._scope.get(basis, ""),
            "complete": known,
        }
