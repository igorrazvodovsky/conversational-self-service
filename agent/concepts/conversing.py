"""Conversing — to carry what a party says into the system, in the order it was
said.

Generated from `docs/concepts/conversing.md`.

state
  utterances: seq Utterance
  by:         Utterance -> Party
  text:       Utterance -> Text

The concept promises nothing beyond the record.  What an utterance *does* is
decided by the rules that read it, and at this slice exactly one rule does:
`APersonSays` carries a person's chat message here, and nothing fires from the
completion.  That is deliberate — the point of the concept at this slice is
that the log's first entry for a turn is what the person said, rather than what
the model did with it.

An utterance is an individual and needs an identity that does not collide, so
this concept mints one.  `Deciding` does not, because a request is a value; an
utterance is not — two people saying the same words said two things.
"""

from __future__ import annotations

from typing import Any


class Conversing:
    name = "Conversing"

    def __init__(self) -> None:
        self._utterances: list[str] = []
        self._by: dict[str, str] = {}
        self._text: dict[str, str] = {}

    def state(self) -> dict[str, Any]:
        return {
            "utterances": list(self._utterances),
            "by": dict(self._by),
            "text": dict(self._text),
        }

    # -- actions ------------------------------------------------------------

    def say(self, party: str, text: str) -> dict[str, Any]:
        utterance = f"u{len(self._utterances) + 1}"
        self._utterances.append(utterance)
        self._by[utterance] = party
        self._text[utterance] = text
        return {"utterance": utterance, "party": party, "text": text}
