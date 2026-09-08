"""The bootstrap concept's root actions.

WYSIWID §6.7: external stimuli are the actions of a special bootstrap concept,
and they are "the only ones that have completions but no invocations."

`Copiloting` is held at the abstract tier — purpose only, no specification
(`docs/method/boundaries.md`).  This class is not that specification.  It is the
adapter that turns a stimulus arriving over the CopilotKit boundary into a
record the log can hold, and it deliberately does nothing else: the actions
below have no state and decide nothing.  What may follow from each of them is
in `docs/syncs/gestures.md` and `docs/syncs/conduct.md`.

Two root actions, not one, because this application has two independent root
actors and the rules that authorise them differ.  A person may adopt a proposed
completion; the model may not.  That difference has to be visible to the rules,
so it has to be visible here.
"""

from __future__ import annotations

from typing import Any


class Copiloting:
    name = "Copiloting"

    def state(self) -> dict[str, Any]:
        return {}

    def gesture(self, **stimulus: Any) -> dict[str, Any]:
        """A person acted on an application surface."""
        return dict(stimulus)

    def invoke(self, **stimulus: Any) -> dict[str, Any]:
        """The model called a named tool."""
        return dict(stimulus)
