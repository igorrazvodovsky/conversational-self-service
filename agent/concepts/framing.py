"""Framing — to let a viewer narrow what is shown to the items that bear on
one question, and keep the choice.

Generated from `docs/concepts/framing.md`.

state
  framed: Lens -> Frame
"""

from __future__ import annotations

from typing import Any


class Framing:
    name = "Framing"

    def __init__(self) -> None:
        self._framed: dict[str, Any] = {}

    def state(self) -> dict[str, Any]:
        return {"framed": dict(self._framed)}

    # -- actions ------------------------------------------------------------

    def frame(self, lens: str, frame: Any) -> dict[str, Any]:
        self._framed[lens] = frame
        return {"lens": lens, "frame": frame}

    def unframe(self, lens: str) -> dict[str, Any]:
        self._framed.pop(lens, None)
        return {"lens": lens}
