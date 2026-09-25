"""Specifying — to hold what a party requires, in their own words, as separate
clauses each of which can be reworded, relaxed, struck, or deliberately left
open.

Generated from `docs/concepts/specifying.md`.

state
  open:          set Spec
  clauses:       Spec -> seq Clause
  text:          Clause -> string
  statedBy:      Clause -> Party
  negotiability: Clause -> ("fixed" | "negotiable" | "open")
  formerly:      Clause -> seq string

A clause is text in the party's vocabulary and nothing else: no relation here
points at a variable, an option, the catalogue or a classification.  The
words may name the catalogue by a reference token (`docs/syncs/gestures.md`,
"A clause is stated in the person's words"), and this concept holds that as
words too.  A clause is meant as fixed until settled otherwise, and nothing
about it is asked at entry.  What answers it is
`Binding`'s business, and whether it can be met is a read across concepts
that this one never makes.

A clause is an individual, so two clauses with the same text are two clauses.
The identity is minted here, in sequence, which is also what lets the canvas
call them by a short handle.
"""

from __future__ import annotations

from typing import Any

NEGOTIABILITY = ("fixed", "negotiable", "open")


class Specifying:
    name = "Specifying"

    def __init__(self) -> None:
        self._open: set[str] = set()
        self._clauses: dict[str, list[str]] = {}
        self._text: dict[str, str] = {}
        self._stated_by: dict[str, str] = {}
        self._negotiability: dict[str, str] = {}
        self._formerly: dict[str, list[str]] = {}
        self._minted = 0

    def state(self) -> dict[str, Any]:
        return {
            "open": sorted(self._open),
            "clauses": {s: list(c) for s, c in self._clauses.items()},
            "text": dict(self._text),
            "statedBy": dict(self._stated_by),
            "negotiability": dict(self._negotiability),
            "formerly": {c: list(f) for c, f in self._formerly.items()},
        }

    def _spec_of(self, clause: str) -> str | None:
        for spec, clauses in self._clauses.items():
            if clause in clauses:
                return spec
        return None

    # -- actions ------------------------------------------------------------

    def open(self, spec: str) -> dict[str, Any]:
        self._open.add(spec)
        self._clauses.setdefault(spec, [])
        return {"spec": spec}

    def require(self, spec: str, party: str, text: str) -> dict[str, Any]:
        """Not `state`, the catalogue's name: that is the method every concept
        exposes its relations through, and the engine reads it for every view."""
        if spec not in self._open:
            return {"error": f"{spec} is not open"}
        wording = str(text).strip()
        if not wording:
            return {"error": "a clause needs some words"}
        self._minted += 1
        clause = f"c{self._minted}"
        self._clauses[spec].append(clause)
        self._text[clause] = wording
        self._stated_by[clause] = party
        self._negotiability[clause] = "fixed"
        self._formerly[clause] = []
        return {"clause": clause, "spec": spec}

    def settle(self, clause: str, negotiability: str) -> dict[str, Any]:
        spec = self._spec_of(clause)
        if spec is None:
            return {"error": f"there is no clause {clause}"}
        if negotiability not in NEGOTIABILITY:
            return {"error": f"{negotiability!r} is not fixed, negotiable or open"}
        self._negotiability[clause] = negotiability
        return {"clause": clause, "spec": spec}

    def reword(self, clause: str, text: str) -> dict[str, Any]:
        """A correction, not a concession: `formerly` is untouched."""
        spec = self._spec_of(clause)
        if spec is None:
            return {"error": f"there is no clause {clause}"}
        wording = str(text).strip()
        if not wording:
            return {"error": "a clause needs some words"}
        self._text[clause] = wording
        return {"clause": clause, "spec": spec}

    def move(self, clause: str, before: str | None = None) -> dict[str, Any]:
        spec = self._spec_of(clause)
        if spec is None:
            return {"error": f"there is no clause {clause}"}
        sequence = self._clauses[spec]
        if before is not None and (before not in sequence or before == clause):
            return {"error": f"{before} is not another clause of {spec}"}
        sequence.remove(clause)
        if before is None:
            sequence.append(clause)
        else:
            sequence.insert(sequence.index(before), clause)
        return {"clause": clause, "spec": spec}

    def relax(self, clause: str, text: str) -> dict[str, Any]:
        spec = self._spec_of(clause)
        if spec is None:
            return {"error": f"there is no clause {clause}"}
        if self._negotiability[clause] != "negotiable":
            return {"error": f"{clause} is {self._negotiability[clause]}, not negotiable"}
        wording = str(text).strip()
        if not wording:
            return {"error": "a clause needs some words"}
        formerly = self._text[clause]
        self._formerly[clause].append(formerly)
        self._text[clause] = wording
        return {"clause": clause, "spec": spec, "formerly": formerly}

    def strike(self, clause: str) -> dict[str, Any]:
        spec = self._spec_of(clause)
        if spec is None:
            return {"error": f"there is no clause {clause}"}
        self._clauses[spec].remove(clause)
        for relation in (
            self._text,
            self._stated_by,
            self._negotiability,
            self._formerly,
        ):
            relation.pop(clause, None)
        return {"clause": clause, "spec": spec}

    def close(self, spec: str) -> dict[str, Any]:
        self._open.discard(spec)
        for clause in self._clauses.pop(spec, []):
            for relation in (
                self._text,
                self._stated_by,
                self._negotiability,
                self._formerly,
            ):
                relation.pop(clause, None)
        return {"spec": spec}
