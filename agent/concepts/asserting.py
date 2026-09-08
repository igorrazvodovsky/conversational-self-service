"""Asserting — to hold what a party asserted of a specification apart from what
its rules entailed.

Generated from `docs/concepts/asserting.md`.

state
  open:       set Spec
  asserted:   Spec -> Variable -> Option
  assertedBy: Spec -> Variable -> Party

This concept validates nothing against a catalogue and solves nothing.  An
assertion that cannot be met is recorded all the same; the difference between
what is asserted here and what was assumable in Constraining is the most
important thing on the screen.

`assertedBy` records the party at the grain of the assertion, which is not the
same fact as the provenance edge the log already carries.  The edge names the
*rule* that authorised the action — *you asked for this*, *adopted from a
proposal* — and two different rules can put the same party on the same
assertion.  The canvas reads the edge; a reader asking *whose value is this*
reads this relation.

There is no `prefer` and no strength.  Hard-or-soft is a fact of a clause in
the buyer's vocabulary, and this concept holds no clauses — see
`docs/concepts/asserting.md`, "Why `prefer` left the specification".
"""

from __future__ import annotations

from typing import Any


class Asserting:
    name = "Asserting"

    def __init__(self) -> None:
        self._open: set[str] = set()
        self._asserted: dict[str, dict[str, str]] = {}
        self._asserted_by: dict[str, dict[str, str]] = {}

    def state(self) -> dict[str, Any]:
        return {
            "open": sorted(self._open),
            "asserted": {s: dict(m) for s, m in self._asserted.items()},
            "assertedBy": {s: dict(m) for s, m in self._asserted_by.items()},
        }

    # -- actions ------------------------------------------------------------

    def start(self, spec: str) -> dict[str, Any]:
        self._open.add(spec)
        self._asserted[spec] = {}
        self._asserted_by[spec] = {}
        return {"spec": spec}

    def assert_(
        self, spec: str, variable: str, option: str, party: str
    ) -> dict[str, Any]:
        """Python reserves `assert`, so the method carries a trailing underscore.

        The engine dispatches by name and is not edited for this: `wiring.py`
        registers the alias `assert` after discovery, and every rule invokes
        that name.  The log therefore reads `Asserting/assert`, which is what
        the specification's operational principle says.
        """
        if spec not in self._open:
            return {"error": f"{spec} is not open"}
        self._asserted[spec][variable] = option
        self._asserted_by[spec][variable] = party
        return {"spec": spec, "variable": variable, "option": option}

    def withdraw(self, spec: str, variable: str) -> dict[str, Any]:
        asserted = self._asserted.get(spec, {}).pop(variable, None)
        self._asserted_by.get(spec, {}).pop(variable, None)
        if asserted is None:
            return {"error": f"nothing was asserted of {variable}"}
        return {"spec": spec, "variable": variable, "option": asserted}

    def discard(self, spec: str) -> dict[str, Any]:
        self._open.discard(spec)
        self._asserted.pop(spec, None)
        self._asserted_by.pop(spec, None)
        return {"spec": spec}
