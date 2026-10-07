"""Detailing — to keep what the seller publishes about what an item is and
does, so that a question about it is answered from the seller's record.

Generated from `docs/concepts/detailing.md`.  Change the behaviour by editing
that specification, not this file (WYSIWID §7.3).

state
  particulars: Item -> seq Particular
  topic:       Particular -> string
  text:        Particular -> string

An item is whatever the seller describes: a variable or an option, by the
identity the rules give it.  Particulars are individuals minted here, in
sequence, because their order is the order the seller wrote them in.
"""

from __future__ import annotations

from typing import Any


class Detailing:
    name = "Detailing"

    def __init__(self) -> None:
        self._particulars: dict[str, list[str]] = {}
        self._topic: dict[str, str] = {}
        self._text: dict[str, str] = {}

    def state(self) -> dict[str, Any]:
        return {
            "particulars": {i: list(ps) for i, ps in self._particulars.items()},
            "topic": dict(self._topic),
            "text": dict(self._text),
        }

    # -- actions ------------------------------------------------------------

    def detail(self, item: str, topic: str, text: str) -> dict[str, Any]:
        content = str(text or "")
        if not content.strip():
            return {"error": f"a particular of {item} has no text"}
        particular = f"d{len(self._topic) + 1}"
        self._particulars.setdefault(item, []).append(particular)
        self._topic[particular] = str(topic or "")
        self._text[particular] = content
        return {"particular": particular}
