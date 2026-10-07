"""The chat message, as a stimulus.

The third surface a root action arrives over, beside `webapp.py` (a person's
click) and `tools.py` (the model's tool call).  Like both of those, this module
performs root actions of the bootstrap concept and decides nothing: what
follows from a person saying something is `APersonSays` in `syncs/gestures.py`,
and that rule carries it into `Conversing/say` and stops; what follows from
a person attaching a document is `APersonFilesADocument` in
`syncs/reading.py`, which carries it into `Filing/file` and stops.

Why it is here and not in the browser.  The point of the concept is that the
log's first entry for a turn is what the person said, rather than what the
model did with it — and a gesture posted from the browser is a second HTTP
request racing the CopilotKit run, so the ordering would hold only by luck.
Running before the model node makes it an ordering the graph enforces.

Why the turn is one flow.  A person's message, the documents attached to it
and the tool calls the model makes in reply are one occasion, as the
catalogue's arrival at boot is one occasion, so the `say` opens a flow, each
`file` is performed in it, and every root action the model performs in that
turn is performed in it (`tools.py` asks `turn()` for it).  That is what joins
*the person said "hospital, six storeys"* to *the model asserted
`building_type:hospital`* in the log: the same flow token on both, with no
field anywhere recording the link and no rule writing one.  The canvas reads
it back beside the value (`views.py`).  The person's own agent arrives with no
message and opens a flow of its own, so nothing joins it to any words.  See
`docs/syncs/gestures.md`, "Where a chat message enters".

Why a document is read into text here.  `Filing` keeps words, so that a
passage can be cited and the model can read the document back from the log
rather than from the transport (`docs/syncs/reading.md`).  The bytes are the
transport's; the text is the record.  A file nothing can be read from is
refused by the concept, and the refusal is in the log.  For the same reason
the model is never handed the bytes: `unattaching` puts a line naming the
document in place of the file on every model call.

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

Why some words are already on record.  The person's own agent speaks in the
chat through the page (`src/components/chat/converse.tsx`): its words are a
`say` gesture under the actor `browser`, completed before the page runs the
graph, and the message carries the flow that gesture opened as its id.  Such
a message is not heard again; its flow becomes the turn's, as a reply in
words does (`follow`).  The words are checked against the `say` in that flow,
so an id that merely looks like a flow is heard as the person's.  And the
model is told who spoke: `attributing` marks the agent's words on every model
call.  See `docs/syncs/gestures.md`, "The person's own agent speaks in the
chat".
"""

from __future__ import annotations

import asyncio
import base64
import io
import mimetypes
import sys
import urllib.parse
from typing import Any

from langchain.agents.middleware import before_model, wrap_model_call
from langchain_core.messages import HumanMessage
from langgraph.config import get_config

from instance import SPEC, engine

_heard: set[str] = set()
# The flow the current turn of each thread runs in: opened by the person's
# words, shared by the model's tool calls in reply, replaced by the next turn.
_turn: dict[str, str] = {}
# The utterance the current turn's words became, so a reading of them can
# name what it read.
_said: dict[str, str] = {}


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


def heard() -> str | None:
    """The utterance the current turn's words became, or nothing."""
    thread = _thread()
    return _said.get(thread) if thread is not None else None


def follow(flow: str, utterance: str) -> None:
    """A reply in words, made while the model's question waited, becomes the
    turn's words: what the model does next in this turn runs in the flow the
    reply opened, as a tool call in reply to a message runs in the message's.
    See `docs/syncs/conduct.md`, "The floor is carried by an interrupt"."""
    thread = _thread()
    if thread is None:
        return
    _turn[thread] = flow
    _said[thread] = utterance


# Whether a message id is the flow of words already on record, and whose:
# the utterance and the actor, or nothing.  Read off the log once per id.
_on_record: dict[str, tuple[str, str] | None] = {}


def _said_already(message: HumanMessage) -> tuple[str, str] | None:
    """The utterance and its actor, when the message's words were said by
    gesture before the run, in the flow its id names."""
    identity = getattr(message, "id", None)
    if not isinstance(identity, str) or not identity.startswith("flow-"):
        return None
    if identity not in _on_record:
        text = _text(message)
        _on_record[identity] = next(
            (
                (record.output["utterance"], record.actor)
                for record in engine.log.flow(identity)
                if record.kind == "completion"
                and record.concept == "Conversing"
                and record.action == "say"
                and (record.output or {}).get("text") == text
                and (record.output or {}).get("utterance")
            ),
            None,
        )
    return _on_record[identity]


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


def _files(message: HumanMessage) -> list[tuple[str, str]]:
    """The documents attached to a message, each read into text, in order."""
    content = message.content
    if isinstance(content, str):
        return []
    out = []
    for part in content:
        if not _attached(part):
            continue
        name = _name(part)
        raw = _bytes(part)
        if raw is None:
            continue
        out.append((name, _read(raw, _mime(part), name)))
    return out


def _url(part: dict[str, Any]) -> str:
    """The part's URL, flat (`file`) or nested (`image_url`)."""
    url = part.get("url")
    if part.get("type") == "image_url":
        nested = part.get("image_url")
        url = nested if isinstance(nested, str) else (nested or {}).get("url")
    return url if isinstance(url, str) else ""


def _mime(part: dict[str, Any]) -> str:
    url = _url(part)
    if url.startswith("data:"):
        return url[5:].split(",", 1)[0].split(";", 1)[0]
    return part.get("mime_type") or ""


def _attached(part: Any) -> bool:
    """Whether a content part is an attached document rather than words.

    `@ag-ui/langgraph` hands every attachment over as an `image_url` part
    whose data URL carries the document's own MIME type, and drops its name,
    which `src/agent.ts` puts back as the URL's `name` parameter; a part
    that is really an image is left for the model to see.
    """
    if not isinstance(part, dict):
        return False
    if part.get("type") == "file":
        return True
    return part.get("type") == "image_url" and not _mime(part).startswith("image/")


def _name(part: dict[str, Any]) -> str:
    return (
        part.get("filename")
        or (part.get("metadata") or {}).get("filename")
        or _named(part)
        or "attachment" + (mimetypes.guess_extension(_mime(part)) or "")
    )


def _named(part: dict[str, Any]) -> str | None:
    """The `name` parameter of the part's data URL, if it has one."""
    url = _url(part)
    if not url.startswith("data:"):
        return None
    for parameter in url[5:].split(",", 1)[0].split(";")[1:]:
        key, _, value = parameter.partition("=")
        if key == "name" and value:
            return urllib.parse.unquote(value)
    return None


def _bytes(part: dict[str, Any]) -> bytes | None:
    """The file's bytes, from whichever field the transport put them in."""
    for key in ("base64", "data"):
        value = part.get(key)
        if isinstance(value, str) and value:
            try:
                return base64.b64decode(value)
            except ValueError:
                return None
    url = _url(part)
    if url.startswith("data:") and "," in url:
        try:
            return base64.b64decode(url.split(",", 1)[1])
        except ValueError:
            return None
    return None


def _read(raw: bytes, mime: str, name: str) -> str:
    """The document as text: a PDF's pages, or the bytes decoded."""
    if mime == "application/pdf" or name.lower().endswith(".pdf"):
        try:
            from pypdf import PdfReader

            pages = [page.extract_text() or "" for page in PdfReader(io.BytesIO(raw)).pages]
            return "\n\n".join(p.strip() for p in pages if p.strip())
        except Exception as cause:  # noqa: BLE001 — the refusal is the concept's
            print(f"hearing: could not read {name}: {cause}", file=sys.stderr)
            return ""
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        return raw.decode("latin-1", errors="replace")


@before_model
async def hearing(state: dict[str, Any], runtime: Any) -> None:
    """A person said something, before the model is asked what to do about it.

    Async, and the work in a worker thread: reading a document into text
    and appending to the journal are filesystem work, and LangGraph's dev
    server refuses filesystem calls on its event loop.  The graph is run
    asynchronously, so this is the hook that runs.
    """
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
    thread = _thread()
    already = await asyncio.to_thread(_said_already, said)
    if already is not None:
        # Words said by gesture before the run: the turn is theirs.
        if thread is not None:
            _turn[thread] = said.id
            _said[thread] = already[0]
        return
    await asyncio.to_thread(_hear, said, thread)


def _hear(said: HumanMessage, thread: str | None) -> None:
    """The root actions a message is: its words, then each document attached
    to it, in one flow."""
    # A new turn, whatever it says: what the model does from here on is not
    # a reply to the previous turn's words.
    if thread is not None:
        _turn.pop(thread, None)
        _said.pop(thread, None)
    flow: str | None = None
    text = _text(said)
    if text:
        # The message's id and the thread ride along for the view, which
        # finds the utterance a chat message became by the one and the
        # conversation to open by the other; no rule reads either.
        stimulus = {
            **({"message": said.id} if isinstance(said.id, str) else {}),
            **({"thread": thread} if thread is not None else {}),
        }
        record = engine.root(
            "Copiloting", "gesture", actor="person", act="say", spec=SPEC, text=text,
            **stimulus,
        )
        flow = record.flow
        utterance = next(
            (
                (r.output or {}).get("utterance")
                for r in engine.log.flow(flow)
                if r.kind == "completion" and r.concept == "Conversing"
            ),
            None,
        )
        if thread is not None and utterance:
            _said[thread] = utterance
    # The documents, in the same flow as the words that brought them.
    for name, content in _files(said):
        record = engine.root(
            "Copiloting", "gesture", actor="person", flow=flow,
            act="file", spec=SPEC, name=name, text=content,
        )
        flow = flow or record.flow
    if thread is not None and flow is not None:
        _turn[thread] = flow


def _unattached(message: Any) -> Any:
    """The message with each attached file replaced by a line naming it."""
    if not isinstance(message, HumanMessage) or isinstance(message.content, str):
        return message
    if not any(_attached(part) for part in message.content):
        return message
    content = [
        {
            "type": "text",
            "text": f"[attached: {_name(part)}. Filed; `review` lists it under "
            "`files`, and `open_file` returns its text.]",
        }
        if _attached(part)
        else part
        for part in message.content
    ]
    return message.model_copy(update={"content": content})


@wrap_model_call
async def unattaching(request: Any, handler: Any) -> Any:
    """The model reads a filed document from the log, never from the transport.

    Each attachment is in `Filing` by the time the model is called, as text,
    and `open_file` returns that text, so the words the model quotes are the
    words `TheModelMayReadARequirement` checks.  The file part is replaced
    for the call and left in the thread, and a format the model's provider
    would refuse cannot fail the turn.  See `docs/syncs/reading.md`.
    """
    return await handler(
        request.override(messages=[_unattached(m) for m in request.messages])
    )


BROWSER = "browser"


def _attributed(message: Any) -> Any:
    """The person's own agent's words, marked as theirs for the model."""
    if not isinstance(message, HumanMessage):
        return message
    already = _said_already(message)
    if already is None or already[1] != BROWSER:
        return message
    text = _text(message)
    return message.model_copy(
        update={"content": f"[The person's own agent, speaking for them:] {text}"}
    )


@wrap_model_call
async def attributing(request: Any, handler: Any) -> Any:
    """The model is told when it is the person's own agent speaking.

    The thread holds the words as they were said; who said them is the
    `say`'s actor, and the model reads it here, on every call, so it can put
    each decision to the party it belongs to.  See `docs/syncs/conduct.md`,
    "The person's own agent, acting as the person".
    """
    messages = await asyncio.to_thread(lambda: [_attributed(m) for m in request.messages])
    return await handler(request.override(messages=messages))
