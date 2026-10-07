"""Reading — to hold what a source was read as, so that the reading can be
checked against the source and corrected.

Generated from `docs/concepts/reading.md`.

state
  heard:  Source -> seq Item
  words:  Item -> string
  answer: Item -> set Value
  states: Item -> Quantity -> Real

A source is a value the rules hand in — `[ file: f ]` or `[ utterance: u ]`
— and this concept keys on it without looking inside.  An item is an
individual, handed in by the rule that reads it.  The answer is whatever the reader took to
answer the words, which may be nothing, and so are the quantities the
reader took the words to state; this concept records the claims and judges
none of them.  What becomes of an item is the rules' business
(`docs/syncs/reading.md`).
"""

from __future__ import annotations

import json
import math
from typing import Any


def _key(source: Any) -> str:
    if isinstance(source, dict):
        return json.dumps(source, sort_keys=True)
    return json.dumps(source)


class Reading:
    name = "Reading"

    def __init__(self) -> None:
        self._heard: dict[str, list[str]] = {}
        self._source: dict[str, Any] = {}
        self._words: dict[str, str] = {}
        self._answer: dict[str, list[Any]] = {}
        self._states: dict[str, dict[str, float]] = {}

    def state(self) -> dict[str, Any]:
        return {
            "heard": {key: list(items) for key, items in self._heard.items()},
            "source": {item: source for item, source in self._source.items()},
            "words": dict(self._words),
            "answer": {item: list(values) for item, values in self._answer.items()},
            "states": {item: dict(q) for item, q in self._states.items()},
        }

    # -- actions ------------------------------------------------------------

    def read(
        self,
        source: Any,
        words: str,
        item: str,
        answer: list[Any] | None = None,
        states: dict[str, float] | None = None,
    ) -> dict[str, Any]:
        text = str(words or "").strip()
        if not text:
            return {"error": "nothing was read: the words are empty"}
        if item in self._words:
            return {"error": f"{item} was heard already"}
        quantities = dict(states or {})
        for quantity, value in quantities.items():
            if (
                not isinstance(value, (int, float))
                or isinstance(value, bool)
                or not math.isfinite(value)
            ):
                return {"error": f"{quantity} is not a finite number"}
        values: list[Any] = []
        for value in answer or []:
            if value not in values:
                values.append(value)
        self._heard.setdefault(_key(source), []).append(item)
        self._source[item] = source
        self._words[item] = text
        self._answer[item] = values
        self._states[item] = quantities
        return {
            "item": item,
            "source": source,
            "words": text,
            "answer": list(values),
            "states": dict(quantities),
        }
