"""The chat message, as a stimulus.

The third surface a root action arrives over, beside `webapp.py` (a person's
click) and `tools.py` (the model's tool call).  Like both of those, this module
performs a root action of the bootstrap concept and decides nothing: what
follows from a person saying something is `APersonSays` in `syncs/gestures.py`,
and at this slice that rule carries it into `Conversing/say` and stops.

Why it is here and not in the browser.  The point of the concept at this slice
is that the log's first entry for a turn is what the person said, rather than
what the model did with it — and a gesture posted from the browser is a second
HTTP request racing the CopilotKit run, so the ordering would hold only by
luck.  Running before the model node makes it an ordering the graph enforces.

Why the guard is on the message kind.  `before_model` runs before *every* model
call, not once per turn: after a tool call the last message is a `ToolMessage`
and after the model an `AIMessage`, so testing for a `HumanMessage` fires this
exactly once per thing a person said.  The seen set covers the other case — a
run replayed or resumed on the same state — because saying something twice is
two utterances, and a replay is not a person saying anything.
"""

from __future__ import annotations

from typing import Any

from langchain.agents.middleware import before_model
from langchain_core.messages import HumanMessage

from instance import SPEC, engine

_heard: set[str] = set()


def _text(message: HumanMessage) -> str:
    content = message.content
    if isinstance(content, str):
        return content
    # A multi-part message: keep the text parts, in order.
    return "".join(
        part.get("text", "")
        for part in content
        if isinstance(part, dict) and part.get("type") == "text"
    )


@before_model
def hearing(state: dict[str, Any], runtime: Any) -> None:
    """A person said something, before the model is asked what to do about it."""
    messages = state.get("messages") or []
    if not messages:
        return
    last = messages[-1]
    if not isinstance(last, HumanMessage):
        return
    identity = getattr(last, "id", None)
    if identity is not None:
        if identity in _heard:
            return
        _heard.add(identity)
    text = _text(last)
    if not text:
        return
    engine.root("Copiloting", "gesture", actor="person", act="say", spec=SPEC, text=text)
