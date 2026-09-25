"""The chat message, as a stimulus.

The third surface a root action arrives over, beside `webapp.py` (a person's
click) and `tools.py` (the model's tool call).  Like both of those, this module
performs a root action of the bootstrap concept and decides nothing: what
follows from a person saying something is `APersonSays` in `syncs/gestures.py`,
and that rule carries it into `Conversing/say` and stops.

Why it is here and not in the browser.  The point of the concept is that the
log's first entry for a turn is what the person said, rather than what the
model did with it — and a gesture posted from the browser is a second HTTP
request racing the CopilotKit run, so the ordering would hold only by luck.
Running before the model node makes it an ordering the graph enforces.

Why the turn is one flow.  A person's message and the tool calls the model
makes in reply are one occasion, as the catalogue's arrival at boot is one
occasion, so the `say` opens a flow and every root action the model performs
in that turn is performed in it (`tools.py` asks `turn()` for it).  That is
what joins *the person said "hospital, six storeys"* to *the model asserted
`building_type:hospital`* in the log: the same flow token on both, with no
field anywhere recording the link and no rule writing one.  The canvas reads
it back beside the value (`views.py`).  A browser agent's call arrives with no
message and opens a flow of its own, so nothing joins it to any words.  See
`docs/syncs/gestures.md`, "Where a chat message enters".

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
from langgraph.config import get_config

from instance import SPEC, engine

_heard: set[str] = set()
# The flow the current turn of each thread runs in: opened by the person's
# words, shared by the model's tool calls in reply, replaced by the next turn.
_turn: dict[str, str] = {}


def _thread() -> str | None:
    """The thread this node or tool is running in, or nothing outside a run."""
    try:
        return get_config().get("configurable", {}).get("thread_id")
    except RuntimeError:
        return None


def turn() -> str | None:
    """The flow the current turn's words opened, for a tool call made in reply.

    None when no words opened one — a run with no message, or a call from
    outside any run — and the caller then opens a flow of its own.
    """
    thread = _thread()
    return _turn.get(thread) if thread is not None else None


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
    # A new turn, whatever it says: what the model does from here on is not
    # a reply to the previous turn's words.
    thread = _thread()
    if thread is not None:
        _turn.pop(thread, None)
    text = _text(said)
    if not text:
        return
    record = engine.root(
        "Copiloting", "gesture", actor="person", act="say", spec=SPEC, text=text
    )
    if thread is not None:
        _turn[thread] = record.flow
