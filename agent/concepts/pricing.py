"""Pricing — to say what each choice adds to the cost of a specification.

Generated from `docs/concepts/pricing.md`.

state
  capital: Option -> Money
  monthly: Option -> Money
  months:  Option -> Natural
  usual:   Basis -> Option
  factor:  Basis -> Real

`Basis` is a type parameter for the reason `Grid` is one in Footprinting: a
financing factor and a default term are the terms somebody is being quoted on,
not facts about the product, and state that can hold only one of them presents
a contested assumption as a fact.  The catalogue seeds one basis today.

There is no `total` action.  Nobody performs "compute the total"; a person
performs a choice and the total changes.  The arithmetic is a read — WYSIWID
§6.4 — and lives in `total()` below, which takes the chosen options as an
argument rather than reading any other concept's state.
"""

from __future__ import annotations

from typing import Any, Iterable


class Pricing:
    name = "Pricing"

    def __init__(self) -> None:
        self._capital: dict[str, float] = {}
        self._monthly: dict[str, float] = {}
        self._months: dict[str, int] = {}
        self._usual: dict[str, str] = {}
        self._factor: dict[str, float] = {}

    def state(self) -> dict[str, Any]:
        return {
            "capital": dict(self._capital),
            "monthly": dict(self._monthly),
            "months": dict(self._months),
            "usual": dict(self._usual),
            "factor": dict(self._factor),
        }

    # -- actions ------------------------------------------------------------

    def list(
        self,
        option: str,
        capital: float | None = None,
        monthly: float | None = None,
    ) -> dict[str, Any]:
        if capital is not None:
            self._capital[option] = float(capital)
        if monthly is not None:
            self._monthly[option] = float(monthly)
        return {"option": option}

    def span(self, option: str, months: int) -> dict[str, Any]:
        self._months[option] = int(months)
        return {"option": option}

    def presume(self, basis: str, option: str) -> dict[str, Any]:
        """Record the term this basis reckons by when none has been chosen."""
        self._usual[basis] = option
        return {"basis": basis}

    def finance(self, basis: str, factor: float) -> dict[str, Any]:
        self._factor[basis] = float(factor)
        return {"basis": basis}

    def delist(self, option: str) -> dict[str, Any]:
        self._capital.pop(option, None)
        self._monthly.pop(option, None)
        self._months.pop(option, None)
        return {"option": option}

    # -- the read -----------------------------------------------------------

    def total(self, chosen: Iterable[str], basis: str) -> dict[str, Any]:
        """The formula in `docs/concepts/pricing.md`, and nowhere else.

        capital    = Σ capital(o)
        recurring  = Σ monthly(o)
        term       = months(t) for the term option t among the chosen,
                     else months(usual(b))
        financed   = capital × factor(b)
        instalment = financed / term + recurring
        lifetime   = financed + recurring × term
        """
        chosen = list(chosen)
        capital = sum(self._capital.get(o, 0.0) for o in chosen)
        recurring = sum(self._monthly.get(o, 0.0) for o in chosen)
        terms = sorted(self._months[o] for o in chosen if o in self._months)
        presumed = not terms
        # A specification may not name two terms — one option per variable —
        # but nothing in this concept knows that, so say which one is taken
        # rather than depending on the order a set happened to arrive in.
        term = terms[0] if terms else self._months.get(self._usual.get(basis, ""), 0)
        factor = self._factor.get(basis, 1.0)
        financed = capital * factor
        instalment = (financed / term if term else 0.0) + recurring
        lifetime = financed + recurring * term
        return {
            "capital": round(capital, 2),
            "recurring": round(recurring, 2),
            "term": term,
            "financed": round(financed, 2),
            "instalment": round(instalment, 2),
            "lifetime": round(lifetime, 2),
            "presumed": presumed,
            "basis": basis,
            "factor": factor,
            "complete": bool(term),
        }
