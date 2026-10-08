"""HandingOver — to put an item into another party's hands, with what it is
handed over for, so that they can take it up from where it was left.

Generated from `docs/concepts/handing-over.md`.

state
  handovers: seq Handover
  of:        Handover -> Item
  from:      Handover -> Party
  to:        Handover -> Party
  reason:    Handover -> string
  received:  Handover -> Date

`Item` and `Party` are type parameters and cannot be constrained.  The item
is whatever the sending rule names — here the specification's identity, not
a copy of it — and this concept never looks inside it.  What the recipient
needs in order to take the item up is not this concept's to carry; the
reason is, because it is the one fact about the handover that nothing else
holds.

There is no clock.  `on` arrives with `receive` as a date and is kept as
given.  A handover is an individual, so the same item sent twice to the same
party is two handovers, minted here in sequence.
"""

from __future__ import annotations

from typing import Any


class HandingOver:
    name = "HandingOver"

    def __init__(self) -> None:
        self._handovers: list[str] = []
        self._of: dict[str, Any] = {}
        self._from: dict[str, str] = {}
        self._to: dict[str, str] = {}
        self._reason: dict[str, str] = {}
        self._received: dict[str, str] = {}

    def state(self) -> dict[str, Any]:
        return {
            "handovers": list(self._handovers),
            "of": dict(self._of),
            "from": dict(self._from),
            "to": dict(self._to),
            "reason": dict(self._reason),
            "received": dict(self._received),
        }

    # -- actions ------------------------------------------------------------

    def send(self, item: Any, to: str, reason: str, **given: Any) -> dict[str, Any]:
        # `from` is a Python keyword, so it arrives among the keyword
        # arguments and is read out by name; the log reads `from` as specified.
        sender = given.get("from")
        if sender == to:
            return {"error": f"{to} cannot hand over to themselves"}
        handover = f"h{len(self._handovers) + 1}"
        self._handovers.append(handover)
        self._of[handover] = item
        self._from[handover] = sender
        self._to[handover] = to
        self._reason[handover] = str(reason or "")
        return {"handover": handover, "to": to}

    def receive(self, handover: str, party: str, on: str) -> dict[str, Any]:
        if handover not in self._of:
            return {"error": f"there is no handover {handover}"}
        if self._to[handover] != party:
            return {"error": f"{handover} did not go to {party}"}
        if handover in self._received:
            return {"error": f"{handover} is already received"}
        self._received[handover] = on
        return {"handover": handover, "party": party}
