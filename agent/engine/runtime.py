"""The engine.

Discovers concepts, holds the synchronizations, and is the only thing that
invokes an action.  MSM §5.2.1 lists this under `src/engine/` — "provided;
developers do not touch it" — and §5.2.4 records that every observed case of
an agent editing engine code to get a behaviour was a defect in the change.
Behaviour belongs in `concepts/` and `syncs/`.

What is deliberately *not* here: a `when`/`where`/`then` parser.  The notation
lives in `docs/syncs/`, where the papers' notation belongs.  A rule is a Python
function receiving one completion and returning invocations; the engine supplies
the flow token, the provenance edge and the once-only guarantee.  All four of
WYSIWID §7.2's design rules are checkable against that shape, and none of them
needs a matcher.
"""

from __future__ import annotations

import threading
from dataclasses import dataclass
from typing import Any, Callable, Protocol

from .log import ActionLog, Record


class Concept(Protocol):
    name: str

    def state(self) -> dict[str, Any]: ...


@dataclass(frozen=True)
class Invocation:
    """An action pattern with no `=>`: the contents of a `then` clause."""

    concept: str
    action: str
    input: dict[str, Any]


@dataclass(frozen=True)
class Sync:
    """One rule.

    `when` is the (concept, action) pair the rule matches completions of.
    `then` is the body: it receives the completion's input and output, plus a
    read-only view of concept state for its `where` clause, and returns the
    invocations to make.  Returning nothing is how a rule declines to fire.
    """

    name: str
    when: tuple[str, str]
    then: Callable[["Completion", "States"], list[Invocation]]


@dataclass(frozen=True)
class Completion:
    concept: str
    action: str
    input: dict[str, Any]
    output: dict[str, Any]
    flow: str
    actor: str
    id: str

    @property
    def failed(self) -> bool:
        return "error" in self.output


class States:
    """The `where` clause's window onto concept state.

    Read-only, and only concept state: WYSIWID §7.2's third design rule.  A
    rule that wants anything else has to ask for it as an action.
    """

    def __init__(self, concepts: dict[str, Concept]) -> None:
        self._concepts = concepts

    def __getitem__(self, concept: str) -> Any:
        return self._concepts[concept]

    def __contains__(self, concept: str) -> bool:
        return concept in self._concepts


class Engine:
    def __init__(self) -> None:
        self.log = ActionLog()
        self._concepts: dict[str, Concept] = {}
        self._syncs: list[Sync] = []
        # The two root actors arrive on different threads — a person's click on
        # the server's threadpool, the model's tool call on the event loop — and
        # both walk the same state.  Actions are atomic occurrences (MSM §4.1);
        # this is what makes that true of the implementation as well.
        self._turn = threading.RLock()
        # Where the catalogue stopped and behaviour began.
        self.settled_at = 0
        self.catalogue: dict[str, Any] = {}

    # -- wiring -------------------------------------------------------------

    def register(self, concept: Concept) -> None:
        self._concepts[concept.name] = concept

    def react(self, *syncs: Sync) -> None:
        self._syncs.extend(syncs)

    @property
    def concepts(self) -> dict[str, Concept]:
        return dict(self._concepts)

    @property
    def syncs(self) -> list[Sync]:
        return list(self._syncs)

    def state(self, concept: str) -> dict[str, Any]:
        with self._turn:
            return self._concepts[concept].state()

    @property
    def turn(self) -> threading.RLock:
        """Held for the duration of a read that spans several concepts."""
        return self._turn

    # -- the only way an action happens -------------------------------------

    def root(
        self, concept: str, action: str, actor: str, flow: str | None = None, **input: Any
    ) -> Record:
        """A root action: an external stimulus, with a fresh flow.

        WYSIWID §6.7 — root actions belong to the bootstrap concept and are the
        only ones with completions but no invocations.  A flow may be supplied
        when several root actions are one occasion, as the catalogue's arrival
        at boot is.
        """
        with self._turn:
            return self._perform(
                concept, action, input, flow=flow or self.log.open_flow(), actor=actor
            )

    def _perform(
        self,
        concept: str,
        action: str,
        input: dict[str, Any],
        *,
        flow: str,
        actor: str,
        via: str | None = None,
        after: str | None = None,
    ) -> Record:
        target = self._concepts.get(concept)
        if target is None:
            raise KeyError(f"no concept named {concept!r}")
        method = getattr(target, action, None)
        if method is None or not callable(method):
            raise KeyError(f"{concept} has no action {action!r}")

        self.log.write(
            kind="invocation",
            concept=concept,
            action=action,
            flow=flow,
            actor=actor,
            input=input,
            via=via,
            after=after,
        )
        output = method(**input)
        if not isinstance(output, dict):
            raise TypeError(
                f"{concept}/{action} returned {type(output).__name__}; "
                "an action is a function from a map to a map"
            )
        completion = self.log.write(
            kind="completion",
            concept=concept,
            action=action,
            flow=flow,
            actor=actor,
            input=input,
            output=output,
            via=via,
            after=after,
        )
        self._dispatch(completion)
        return completion

    def _dispatch(self, completion: Record) -> None:
        assert completion.output is not None
        event = Completion(
            concept=completion.concept,
            action=completion.action,
            input=completion.input,
            output=completion.output,
            flow=completion.flow,
            actor=completion.actor,
            id=completion.id,
        )
        states = States(self._concepts)
        for sync in self._syncs:
            if sync.when != (completion.concept, completion.action):
                continue
            if not self.log.claim(completion.id, sync.name):
                continue
            for invocation in sync.then(event, states) or ():
                self._perform(
                    invocation.concept,
                    invocation.action,
                    invocation.input,
                    flow=completion.flow,
                    actor=completion.actor,
                    via=sync.name,
                    after=completion.id,
                )
