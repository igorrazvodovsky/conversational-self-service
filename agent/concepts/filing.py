"""Filing — to keep a document a party brought, as it was brought, so that a
passage of it can be cited.

Generated from `docs/concepts/filing.md`.

state
  files:     seq File
  broughtBy: File -> Party
  name:      File -> string
  text:      File -> string

The text is words, not bytes: whoever performs `file` has already read the
document into text, and this concept keeps that text as it was given.  A
file is an individual, so two copies of the same document are two files.
"""

from __future__ import annotations

from typing import Any


class Filing:
    name = "Filing"

    def __init__(self) -> None:
        self._files: list[str] = []
        self._brought_by: dict[str, str] = {}
        self._name: dict[str, str] = {}
        self._text: dict[str, str] = {}

    def state(self) -> dict[str, Any]:
        return {
            "files": list(self._files),
            "broughtBy": dict(self._brought_by),
            "name": dict(self._name),
            "text": dict(self._text),
        }

    # -- actions ------------------------------------------------------------

    def file(self, party: str, name: str, text: str) -> dict[str, Any]:
        content = str(text or "")
        if not content.strip():
            return {"error": f"nothing could be read from {name or 'the file'}"}
        file = f"f{len(self._files) + 1}"
        self._files.append(file)
        self._brought_by[file] = party
        self._name[file] = str(name or file)
        self._text[file] = content
        return {"file": file, "party": party, "name": self._name[file]}
