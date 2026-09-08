"""The action log.

MSM §5.2.3.  Both invocations and completions are committed; every completion
carries a flow token and, unless it is a root action, a provenance edge naming
the synchronization that authorised it.

This file is engine.  Nothing here knows about elevators, and no concept
imports it.
"""

from __future__ import annotations

import itertools
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Literal

Kind = Literal["invocation", "completion"]

_seq = itertools.count(1)


@dataclass(frozen=True)
class Record:
    """One entry in the log.

    `via` names the synchronization that authorised the action and `after`
    the completion it reacted to.  Root actions have neither: WYSIWID §6.7 —
    "they are the only ones that have completions but no invocations."
    """

    seq: int
    id: str
    kind: Kind
    concept: str
    action: str
    flow: str
    at: float
    actor: str
    input: dict[str, Any] = field(default_factory=dict)
    output: dict[str, Any] | None = None
    via: str | None = None
    after: str | None = None

    def as_json(self) -> dict[str, Any]:
        return {
            "seq": self.seq,
            "id": self.id,
            "kind": self.kind,
            "concept": self.concept,
            "action": self.action,
            "flow": self.flow,
            "at": self.at,
            "actor": self.actor,
            "input": _plain(self.input),
            "output": _plain(self.output),
            "via": self.via,
            "after": self.after,
        }


def _plain(value: Any) -> Any:
    """Render a value for the wire without pretending sets are lists forever."""
    if isinstance(value, dict):
        return {str(k): _plain(v) for k, v in value.items()}
    if isinstance(value, (set, frozenset)):
        return sorted(_plain(v) for v in value)
    if isinstance(value, (list, tuple)):
        return [_plain(v) for v in value]
    return value


class ActionLog:
    def __init__(self) -> None:
        self._records: list[Record] = []
        # (completion id, sync name) pairs already reacted to.  A rule fires
        # for a completion only if no edge already exists from that completion
        # bearing the rule's name — WYSIWID §6.6, which is also what makes
        # re-evaluating the log on reboot safe.
        self._edges: set[tuple[str, str]] = set()

    def open_flow(self) -> str:
        return f"flow-{uuid.uuid4().hex[:12]}"

    def write(
        self,
        *,
        kind: Kind,
        concept: str,
        action: str,
        flow: str,
        actor: str,
        input: dict[str, Any] | None = None,
        output: dict[str, Any] | None = None,
        via: str | None = None,
        after: str | None = None,
        id: str | None = None,
    ) -> Record:
        record = Record(
            seq=next(_seq),
            id=id or uuid.uuid4().hex,
            kind=kind,
            concept=concept,
            action=action,
            flow=flow,
            at=time.time(),
            actor=actor,
            input=input or {},
            output=output,
            via=via,
            after=after,
        )
        self._records.append(record)
        return record

    def claim(self, completion_id: str, sync_name: str) -> bool:
        """Reserve the right to fire `sync_name` for this completion, once."""
        edge = (completion_id, sync_name)
        if edge in self._edges:
            return False
        self._edges.add(edge)
        return True

    @property
    def last_seq(self) -> int:
        return self._records[-1].seq if self._records else 0

    def records(self, *, since: int = 0, limit: int = 200) -> list[Record]:
        return [r for r in self._records if r.seq > since][-limit:]

    def flow(self, flow: str) -> list[Record]:
        return [r for r in self._records if r.flow == flow]

    def __len__(self) -> int:
        return len(self._records)
