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

Why the guard is what it is.  `before_model` runs before *every* model call,
not once per turn: after a tool call the last message is a `ToolMessage` and
after the model an `AIMessage`.  So the hook looks for the most recent
`HumanMessage` rather than at the end of the list — the transport puts its own
messages in there and looking only at the end would silently record nothing —
and the set of ids already heard is what makes it fire once per thing a person
said rather than once per model call.  Saying something twice is two
utterances; a replay is not a person saying anything.

A message with no id gets the strict test instead, because without an identity
there is nothing to deduplicate on and the end of the list is the only evidence
that this is a new turn.
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
    said = next((m for m in reversed(messages) if isinstance(m, HumanMessage)), None)
    if said is None:
        return
    identity = getattr(said, "id", None)
    if identity is None:
        if said is not messages[-1]:
            return
    elif identity in _heard:
        return
    else:
        _heard.add(identity)
    text = _text(said)
    if not text:
        return
    engine.root("Copiloting", "gesture", actor="person", act="say", spec=SPEC, text=text)
