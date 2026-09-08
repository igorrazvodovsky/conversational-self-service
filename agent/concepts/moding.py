"""Moding — to give one of several surfaces a viewer's attention.

Generated from `docs/concepts/moding.md`.

state
  available: Workspace -> set Surface
  active:    Workspace -> Surface
"""

from __future__ import annotations

from typing import Any


class Moding:
    name = "Moding"

    def __init__(self) -> None:
        self._available: dict[str, list[str]] = {}
        self._active: dict[str, str] = {}

    def state(self) -> dict[str, Any]:
        return {
            "available": {w: list(ss) for w, ss in self._available.items()},
            "active": dict(self._active),
        }

    # -- actions ------------------------------------------------------------

    def offer(self, workspace: str, surface: str) -> dict[str, Any]:
        surfaces = self._available.setdefault(workspace, [])
        if surface not in surfaces:
            surfaces.append(surface)
        return {"workspace": workspace}

    def focus(self, workspace: str, surface: str) -> dict[str, Any]:
        if surface not in self._available.get(workspace, []):
            return {"error": f"{workspace} does not offer {surface}"}
        self._active[workspace] = surface
        return {"workspace": workspace, "surface": surface}
