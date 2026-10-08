"""The HTTP surface a person's browser reaches.

Mounted into the LangGraph server by `langgraph.json`'s `http.app`, so it runs
in the same process as the graph and shares one engine with the model's tools.

Two kinds of route and no more, because there are only two things to do:
perform a root action, or read.  This is WYSIWID §6.4's split at the level of
the wire — `POST /gesture` is the action API, `GET /view`, `GET /at`, `GET /digest`
and `GET /steps` are the querying capability, and nothing writes through a read.

The person's own agent reaches the engine through one more route,
`/configurator/mcp`: the MCP server in `delegate.py`, each of whose tools is
again a root action, under the actor `browser`, or a read.  It
is the one table of the person's agent's tools; the page registers it on
`document.modelContext` and forwards each call there.  The rules in
`syncs/gestures.py` match on the act and not on the actor, so what the
person's agent may do is what the person may do.  See
`docs/syncs/conduct.md`, "The person's own agent, acting as the person".

Note what is absent: there is no endpoint per concept action.  A person's click
is a stimulus, and the rules in `syncs/gestures.py` decide what follows from it.
Adding a route that called `Asserting/assert` directly would make the browser
a second initiator and break WYSIWID §7.2's fourth design rule.
"""

from __future__ import annotations

import os
import sys
from contextlib import asynccontextmanager
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import Body, FastAPI, HTTPException  # noqa: E402

from delegate import BROWSER, done, server  # noqa: E402
from instance import SPEC, engine  # noqa: E402
from views import canvas, digest, tally  # noqa: E402

# The person's own agent's tools, over streamable HTTP.  Stateless and
# answering in JSON, so each call is one request and one response, and the
# frontend's proxy forwards it like any other route.
delegated = server.streamable_http_app(
    streamable_http_path="/configurator/mcp", stateless_http=True, json_response=True
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    async with server.session_manager.run():
        yield


app = FastAPI(lifespan=lifespan)
# The route itself, not the sub-application mounted: a mount at the root
# would stand in front of the LangGraph server's own routes.
app.router.routes.extend(delegated.routes)


@app.get("/configurator/view")
def view(grid: str = "today") -> dict[str, Any]:
    return canvas(engine, SPEC, grid=grid)


@app.get("/configurator/at")
def at() -> dict[str, Any]:
    """Where the log stands, for a page to tell whether anything has happened
    since its view without rendering one: the person's own agent may act
    through the MCP server with no page involved."""
    return {"at": engine.log.last_seq}


@app.get("/configurator/digest")
def review() -> dict[str, Any]:
    """The reading the person's own agent gets, as `review` in `delegate.py`
    returns it without the links: what `converse` reads to see whether a
    question waits on the person."""
    return digest(engine, SPEC, actor=BROWSER)


@app.get("/configurator/steps")
def steps() -> list[dict[str, Any]]:
    """The case's instrument for the steps: per authored step, how many
    specifications skipped it or took it out of order.  Read by whoever runs
    the prototype plan, not by the page or the model."""
    return tally(engine)


ACTORS = {"person", BROWSER}


def _outcome(completion: Any, grid: str) -> dict[str, Any]:
    """What the person's own agent hears back: what the rules did, in the
    shape `tools.py` hands the in-app model, and the reading afterwards."""
    return {
        "flow": completion.flow,
        "did": done(completion),
        "state": digest(engine, SPEC, actor=BROWSER),
        "view": canvas(engine, SPEC, grid=grid),
    }


@app.post("/configurator/gesture")
def gesture(
    stimulus: dict[str, Any] = Body(...), grid: str = "today", actor: str = "person"
) -> dict[str, Any]:
    """The one root action a person's browser performs.

    `grid` arrives as a query parameter rather than in the body, because it is
    a property of the read that comes back and not of the act.  Which carbon
    intensity somebody is looking at is not something they did, and it has no
    business in the action log.

    `actor` is `browser` when the person's own agent performed it through the
    page itself — `converse` saying something in the chat — and the response
    is then what a tool in `delegate.py` returns, with the view beside it.
    """
    if actor not in ACTORS:
        raise HTTPException(status_code=400, detail=f"no actor {actor}")
    stimulus.setdefault("spec", SPEC)
    completion = engine.root("Copiloting", "gesture", actor=actor, **stimulus)
    if actor == BROWSER:
        return _outcome(completion, grid)
    return {
        "flow": completion.flow,
        "view": canvas(engine, SPEC, grid=grid),
        "did": [
            {
                "concept": record.concept,
                "action": record.action,
                "via": record.via,
                "error": (record.output or {}).get("error"),
            }
            for record in engine.log.flow(completion.flow)
            if record.kind == "completion"
        ],
    }
