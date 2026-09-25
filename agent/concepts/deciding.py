"""Deciding — to obtain a person's choice on a matter the system cannot settle
on its own.

Generated from `docs/concepts/deciding.md`.

state
  reason:   Request -> string
  offered:  Request -> set Option
  chosen:   Request -> Option
  declined: set Request

`Request` and `Option` are type parameters and cannot be constrained.  Both are
instantiated here with *values* rather than individuals — a request is
`{spec, about}`, an option is a retraction candidate `{variable, option}` or a
whole assignment — so two of either naming the same things are the same thing,
and no identity has to be minted.  Labels are not held here; they belong to
whoever owns the thing being offered.

Why `about` is part of a request: two different questions about one
specification are two requests, and passing the specification itself made them
one.  A pending conflict was then silently replaced by a proposed completion.
See `docs/concepts/deciding.md`.

A request is a value, so it is keyed by its rendering; `request` in the exposed
state is the map back from that key to the value, not a relation of the
specification.

Why `ask` on an open request is not an error: a second conflict on the same
specification is a new question about the same matter, and refusing to ask it
would leave a stale one on the screen.  What was missing was an account of the
replacement, so `ask` returns whatever it displaced.
"""

from __future__ import annotations

import json
from typing import Any


def _key(value: Any) -> str:
    return json.dumps(value, sort_keys=True, default=str)


class Deciding:
    name = "Deciding"

    def __init__(self) -> None:
        self._request: dict[str, Any] = {}
        self._reason: dict[str, str] = {}
        self._offered: dict[str, list[Any]] = {}
        self._chosen: dict[str, Any] = {}
        self._declined: set[str] = set()

    def state(self) -> dict[str, Any]:
        return {
            "request": dict(self._request),
            "reason": dict(self._reason),
            "offered": {r: list(os) for r, os in self._offered.items()},
            "chosen": dict(self._chosen),
            "declined": sorted(self._declined),
        }

    # -- actions ------------------------------------------------------------

    def ask(self, request: Any, reason: str, options: list[Any]) -> dict[str, Any]:
        key = _key(request)
        displaced = self._offered.get(key, [])
        self._request[key] = request
        self._reason[key] = reason
        self._offered[key] = list(options)
        self._chosen.pop(key, None)
        self._declined.discard(key)
        return {"request": request, "displaced": displaced}

    def choose(self, request: Any, option: Any) -> dict[str, Any]:
        key = _key(request)
        offered = self._offered.get(key, [])
        if _key(option) not in {_key(o) for o in offered}:
            return {"error": "that was not among the options offered"}
        if key in self._chosen or key in self._declined:
            return {"error": "the request is already answered"}
        self._chosen[key] = option
        return {"request": request, "option": option}

    def decline(self, request: Any) -> dict[str, Any]:
        key = _key(request)
        self._request.setdefault(key, request)
        self._declined.add(key)
        return {"request": request}

    def withdraw(self, request: Any) -> dict[str, Any]:
        """The matter no longer needs settling — not the same as declining it.

        Declining is a person saying *not now*, and the request stays.  This is
        whoever asked taking the question off the record, and until now nothing
        could: `ask` put a matter on and nothing took one off.
        """
        key = _key(request)
        offered = self._offered.pop(key, [])
        self._request.pop(key, None)
        self._reason.pop(key, None)
        self._chosen.pop(key, None)
        self._declined.discard(key)
        return {"request": request, "offered": offered}
