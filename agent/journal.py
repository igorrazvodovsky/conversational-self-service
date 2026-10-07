"""The action log, kept.

MSM §5.2.3: the log is the source of truth, and "the state of concepts can be
reconstructed entirely from the log" — even a non-deterministic action replays
deterministically from its recorded completion.  This module is that sentence
made operational.  Every record after the boot mark is appended to a file as
it is committed, and at the next boot the file is read back: each completion's
recorded input is applied to its concept again, and the record itself —
identity, timestamp, actor, provenance edge — is put back in the log as it
was.  No rule fires during replay, because every derived completion is in the
file already; the once-only edges are restored with the records, so the engine
sees the log it would have seen had it never stopped.

This is not a concept.  It has no purpose a user could state and no action
anyone performs; it is the log's storage.  It lives outside `engine/` because
that directory is not edited (MSM §5.2.4), and the one consequence of that is
visible below: the engine's log numbers records from a module-level counter,
so the durable log numbers its own, or a replayed record and a new one could
share a sequence number — and the views scan the log by sequence.

What is *not* replayed: the catalogue.  Boot is re-read from `elevator.json`
every time, and only what happened after `settled_at` is kept.  A journal
written against one catalogue is applied to the next all the same — the
concepts do not validate — and a completion whose outcome differs from the
recorded one (an assertion that succeeded then and fails now) is reported on
stderr rather than hidden.

The chat is kept elsewhere.  LangGraph's dev server persists its threads under
`.langgraph_api/`, and nothing here touches them.
"""

from __future__ import annotations

import json
import os
import sys
import time
import uuid
from dataclasses import fields, replace
from pathlib import Path
from typing import IO, Any

from engine import ActionLog, Engine, Record

# `AGENT_JOURNAL` may be absolute or relative to this directory; deleting the
# file starts the specification over.
JOURNAL = Path(__file__).parent / (
    os.environ.get("AGENT_JOURNAL") or Path(".journal") / "actions.jsonl"
)

_FIELDS = [f.name for f in fields(Record)]


class Journal(ActionLog):
    """An action log that keeps what is written to it.

    Constructed over an existing log, it takes that log's records as its own,
    so the boot records stay where the views expect them and `settled_at`
    still marks where they stop.
    """

    def __init__(self, log: ActionLog | None = None) -> None:
        super().__init__()
        self._file: IO[str] | None = None
        if log is not None:
            for record in log.records(limit=len(log)):
                self._adopt(record)

    def write(
        self,
        *,
        kind: str,
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
            seq=self.last_seq + 1,
            id=id or uuid.uuid4().hex,
            kind=kind,  # type: ignore[arg-type]
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
        if self._file is not None:
            self._file.write(json.dumps(record.as_json()) + "\n")
            self._file.flush()
        return record

    def restore(self, record: Record) -> Record:
        """Put a record back as it was, numbered to follow what is here.

        Nothing fires: the record is history, not a stimulus.  Its provenance
        edge is claimed so that the rule that authorised it will not fire for
        the same completion again, which is what makes re-reading the log at
        boot safe (WYSIWID §6.6).
        """
        return self._adopt(replace(record, seq=self.last_seq + 1))

    def _adopt(self, record: Record) -> Record:
        """Take a record as it is, sequence number included."""
        self._records.append(record)
        if record.via and record.after:
            self.claim(record.after, record.via)
        return record

    def keep(self, path: Path) -> None:
        """Append every record written from now on to `path`."""
        path.parent.mkdir(parents=True, exist_ok=True)
        self._file = path.open("a", encoding="utf-8")


def keep(engine: Engine, path: Path = JOURNAL) -> int:
    """Replay what `path` holds into `engine`, then keep its log there.

    Call once, after boot and before either root actor is let in.  Returns
    the number of records replayed.
    """
    journal = Journal(engine.log)
    engine.log = journal
    replayed = 0
    if path.exists():
        concepts = engine.concepts
        with engine.turn, path.open(encoding="utf-8") as file:
            for number, line in enumerate(file, start=1):
                line = line.strip()
                if not line:
                    continue
                try:
                    raw = json.loads(line)
                except json.JSONDecodeError:
                    _warn(f"line {number} of {path} is not a record; skipped")
                    continue
                if raw.get("kind") == "completion":
                    _apply(concepts, raw)
                journal.restore(Record(**{name: raw.get(name) for name in _FIELDS}))
                replayed += 1
    journal.keep(path)
    return replayed


def _apply(concepts: dict[str, Any], raw: dict[str, Any]) -> None:
    """Apply a recorded completion to its concept again.

    The recorded input is what the concept saw the first time; the output it
    returns now is compared with the one recorded only on whether it failed,
    because that is the divergence that means something — the catalogue moved
    under the journal.  The record keeps its recorded output either way: the
    log says what happened, not what would happen now.
    """
    concept = concepts.get(raw["concept"])
    method = getattr(concept, raw["action"], None) if concept is not None else None
    if method is None:
        _warn(
            f"{raw['concept']}/{raw['action']} is no longer an action; "
            "its record is kept, its effect is not"
        )
        return
    output = method(**(raw.get("input") or {}))
    failed_then = "error" in (raw.get("output") or {})
    failed_now = isinstance(output, dict) and "error" in output
    if failed_then != failed_now:
        _warn(
            f"{raw['concept']}/{raw['action']} "
            f"{'failed' if failed_now else 'succeeded'} on replay but "
            f"{'failed' if failed_then else 'succeeded'} when recorded: "
            f"{output if failed_now else raw.get('output')}"
        )


def _warn(message: str) -> None:
    print(f"journal: {message}", file=sys.stderr)
