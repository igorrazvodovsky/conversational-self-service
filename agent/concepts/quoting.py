"""Quoting — to hold an offer still — what is offered, at what price, on what
terms, until when — so that a party can accept it as it stood.

Generated from `docs/concepts/quoting.md`.

state
  quotes:    seq Quote
  from:      Quote -> Item
  issuedTo:  Quote -> Party
  amount:    Quote -> Money
  terms:     Quote -> Terms
  until:     Quote -> Date
  committed: Quote -> Date
  revoked:   set Quote

`Item`, `Party` and `Terms` are type parameters and cannot be constrained.  The
item is whatever the issuing rule hands over — here a value, the specification's
identity with its settled assignment copied out — and this concept never looks
inside it.  That is what makes a quote a snapshot: it holds what was true, not
a reference to something that can move.

There is no clock.  `until` arrives with `quote` and `on` with `commit`, both
as dates, and the concept compares them.  Whether a quote has lapsed *today* is
a read made by whoever supplies today.

A quote is an individual, so two quotes with identical contents are two
quotes.  The identity is minted here, in sequence, which is also what lets the
canvas call them "Quote 1" and "Quote 2".
"""

from __future__ import annotations

from typing import Any


class Quoting:
    name = "Quoting"

    def __init__(self) -> None:
        self._quotes: list[str] = []
        self._from: dict[str, Any] = {}
        self._issued_to: dict[str, str] = {}
        self._amount: dict[str, float] = {}
        self._terms: dict[str, Any] = {}
        self._until: dict[str, str] = {}
        self._committed: dict[str, str] = {}
        self._revoked: set[str] = set()

    def state(self) -> dict[str, Any]:
        return {
            "quotes": list(self._quotes),
            "from": dict(self._from),
            "issuedTo": dict(self._issued_to),
            "amount": dict(self._amount),
            "terms": dict(self._terms),
            "until": dict(self._until),
            "committed": dict(self._committed),
            "revoked": sorted(self._revoked),
        }

    # -- actions ------------------------------------------------------------

    def quote(
        self, item: Any, to: str, amount: float, terms: Any, until: str
    ) -> dict[str, Any]:
        quote = f"q{len(self._quotes) + 1}"
        self._quotes.append(quote)
        self._from[quote] = item
        self._issued_to[quote] = to
        self._amount[quote] = float(amount)
        self._terms[quote] = terms
        self._until[quote] = until
        return {"quote": quote, "to": to}

    def commit(self, quote: str, party: str, on: str) -> dict[str, Any]:
        if quote not in self._from:
            return {"error": f"there is no quote {quote}"}
        if self._issued_to[quote] != party:
            return {"error": f"{quote} was not issued to {party}"}
        if quote in self._revoked:
            return {"error": f"{quote} has been revoked"}
        if quote in self._committed:
            return {"error": f"{quote} is already committed"}
        # ISO dates compare as strings.
        if on > self._until[quote]:
            return {"error": f"{quote} was valid until {self._until[quote]}"}
        self._committed[quote] = on
        return {"quote": quote, "party": party}

    def revoke(self, quote: str) -> dict[str, Any]:
        if quote not in self._from:
            return {"error": f"there is no quote {quote}"}
        if quote in self._committed:
            return {"error": f"{quote} is committed and cannot be revoked"}
        self._revoked.add(quote)
        return {"quote": quote}
