"""Profiling — to hold what a party says of who they are, so that a document
can name and address them.

Generated from `docs/concepts/profiling.md`.

state
  name:         Party -> string
  organisation: Party -> string
  address:      Party -> string
  email:        Party -> string
  phone:        Party -> string

`introduce` is partial on purpose: a person gives their name in one message
and their company in the next, and a form is filled one field at a time.  Each
call records what it carries and leaves the rest.  There is no inverse — a
detail can be overwritten and not erased — and the note records that as a
finding.
"""

from __future__ import annotations

from typing import Any

DETAILS = ("name", "organisation", "address", "email", "phone")


class Profiling:
    name = "Profiling"

    def __init__(self) -> None:
        self._details: dict[str, dict[str, str]] = {d: {} for d in DETAILS}

    def state(self) -> dict[str, Any]:
        return {d: dict(m) for d, m in self._details.items()}

    # -- actions ------------------------------------------------------------

    def introduce(
        self,
        party: str,
        name: str | None = None,
        organisation: str | None = None,
        address: str | None = None,
        email: str | None = None,
        phone: str | None = None,
    ) -> dict[str, Any]:
        given = {
            "name": name,
            "organisation": organisation,
            "address": address,
            "email": email,
            "phone": phone,
        }
        for detail, value in given.items():
            if value is not None:
                self._details[detail][party] = str(value).strip()
        return {"party": party}

    # -- the read -----------------------------------------------------------

    def profile(self, party: str) -> dict[str, str]:
        """Every detail recorded for the party, as one record.  A read."""
        return {
            d: m[party] for d, m in self._details.items() if party in m and m[party]
        }
