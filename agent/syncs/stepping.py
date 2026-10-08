"""Stepping — `docs/syncs/stepping.md`.

Where the person is in the job, what the step still needs, and who owns
it.  A specification gets its steps when it is opened and loses them when
it is closed; everything else is a gesture, and every gesture is the
person's.  There is no `TheModelMayTakeAStep`: where the person is in their
own job is theirs to say.

Nothing here guards anything, and no rule anywhere has a step's `status` in
its `where`.  That is the one constraint the catalogue puts on this
concept's composition, and it is what makes the steps a map rather than
the wizard's script.  The template itself arrives with the catalogue, in
`seeding.py`.
"""

from __future__ import annotations

from engine import Completion, Invocation, States, Sync

from . import readings
from .gestures import PERSON, WORKSPACE


def _a_started_specification_gets_its_steps(c: Completion, _: States) -> list[Invocation]:
    if c.failed:
        return []
    return [Invocation("Stepping", "instantiate", {"spec": c.output["spec"]})]


def _a_discarded_specification_loses_its_steps(c: Completion, _: States) -> list[Invocation]:
    if c.failed:
        return []
    return [Invocation("Stepping", "abandon", {"spec": c.output["spec"]})]


def _a_taken_step_frames_the_canvas(c: Completion, _: States) -> list[Invocation]:
    """The claim and the view in one gesture: taking a step narrows the
    canvas to what the step is about.  The frame is a value the read side
    interprets, as a gap's is, and `unframe` leaves the claim standing."""
    if c.failed:
        return []
    return [
        Invocation(
            "Framing",
            "frame",
            {"lens": WORKSPACE, "frame": {"by": "step", "step": c.output["step"]}},
        )
    ]



def _gesture(act: str, action: str, *arguments: str):
    """The person's gesture carried to the action of the same shape, under
    the person's name: the form `gestures.py` uses, with the party stated."""

    def then(c: Completion, _: States) -> list[Invocation]:
        if c.output.get("act") != act:
            return []
        input = {a: c.output[a] for a in arguments if a in c.output}
        return [Invocation("Stepping", action, {"party": PERSON, **input})]

    return then


def _a_person_adds_a_step(c: Completion, _: States) -> list[Invocation]:
    """`bind a fresh identity as ?st`: the step is an individual, and the
    rule that adds it names it."""
    if c.output.get("act") != "add":
        return []
    return [
        Invocation(
            "Stepping",
            "add",
            {
                "party": PERSON,
                "spec": c.output.get("spec"),
                "name": c.output.get("name", ""),
                "step": readings.fresh("st"),
            },
        )
    ]


GESTURE = ("Copiloting", "gesture")

rules = [
    Sync(
        "AStartedSpecificationGetsItsSteps",
        ("Specifying", "open"),
        _a_started_specification_gets_its_steps,
    ),
    Sync(
        "ADiscardedSpecificationLosesItsSteps",
        ("Specifying", "close"),
        _a_discarded_specification_loses_its_steps,
    ),
    Sync("APersonTakesAStep", GESTURE, _gesture("take", "take", "spec", "step")),
    Sync("ATakenStepFramesTheCanvas", ("Stepping", "take"), _a_taken_step_frames_the_canvas),
    Sync("APersonFinishesAStep", GESTURE, _gesture("finish", "finish", "step")),
    Sync("APersonSkipsAStep", GESTURE, _gesture("skip", "skip", "step", "reason")),
    Sync("APersonReopensAStep", GESTURE, _gesture("reopen", "reopen", "step")),
    Sync("APersonReassignsAStep", GESTURE, _gesture("reassign", "reassign", "step", "owner")),
    Sync("APersonRenamesAStep", GESTURE, _gesture("rename", "rename", "step", "name")),
    Sync("APersonAddsAStep", GESTURE, _a_person_adds_a_step),
]
