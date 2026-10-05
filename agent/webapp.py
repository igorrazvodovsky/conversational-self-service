"""The HTTP surface a person's browser reaches.

Mounted into the LangGraph server by `langgraph.json`'s `http.app`, so it runs
in the same process as the graph and shares one engine with the model's tools.

Two kinds of route and no more, because there are only two things to do:
perform a root action, or read.  This is WYSIWID §6.4's split at the level of
the wire — `POST /gesture` and `POST /invoke` are the action API, `GET /view`
and `GET /digest` are the querying capability, and nothing writes through a
read.  `GET /measures` is a read too, for whoever studies the sessions rather
than either party in them (`docs/measures.md`).

The person's own agent reaches the engine through both.  The page registers
the person's gestures on `document.modelContext` (`src/components/
configurator/webmcp.tsx`), and each lands at `/gesture` as
`Copiloting/gesture` under the actor `browser`: the rules in
`syncs/gestures.py` match on the act and not on the actor, so what the
person's agent may do is what the person may do.  `review`, `propose` and
`read`, which a person has no gesture for, land at `/invoke` under the same
actor and fire the model's rules.  See `docs/syncs/conduct.md`, "The
person's own agent, acting as the person".

Note what is absent: there is no endpoint per concept action.  A person's click
is a stimulus, and the rules in `syncs/gestures.py` decide what follows from it.
Adding a route that called `Asserting/assert` directly would make the browser
a second initiator and break WYSIWID §7.2's fourth design rule.
"""

from __future__ import annotations

import os
import sys
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import Body, FastAPI, HTTPException  # noqa: E402

from instance import SPEC, engine  # noqa: E402
from measures import measures  # noqa: E402
from views import canvas, digest  # noqa: E402

app = FastAPI()


@app.get("/configurator/view")
def view(grid: str = "today") -> dict[str, Any]:
    return canvas(engine, SPEC, grid=grid)


@app.get("/configurator/digest")
def review() -> dict[str, Any]:
    """The reading the person's own agent gets: the projection `tools.py`'s
    `review` returns to the in-app model, read as the person reads it."""
    return digest(engine, SPEC, actor=BROWSER)


@app.get("/configurator/measures")
def measured() -> dict[str, Any]:
    """What the case's plan counts, read off the log.  Reachable through the
    frontend's proxy like any read, and read by nothing on the page, in the
    digest or among the tools: a party shown the count would change it."""
    return measures(engine)


# The person's own agent, as an actor: it performs the person's gestures and
# the model's three verbs a person has no gesture for.  Which rules apply is
# a matter of the root action and its act or tool, not of this actor.
BROWSER = "browser"
ACTORS = {"person", BROWSER}


@app.post("/configurator/invoke")
def invoke(
    stimulus: dict[str, Any] = Body(...), grid: str = "today"
) -> dict[str, Any]:
    """The person's own agent called one of the model's tools.

    The body carries the tool's name under `tool` and its arguments beside
    it, as `tools.py` passes them.  The response is what the tool returns to
    a model — what the rules did, and the reading — with the view beside it
    so the canvas can render from the action's own outputs.
    """
    stimulus.setdefault("spec", SPEC)
    completion = engine.root("Copiloting", "invoke", actor=BROWSER, **stimulus)
    return _outcome(completion, grid)


def _outcome(completion: Any, grid: str) -> dict[str, Any]:
    """What the person's own agent hears back: what the rules did, in the
    shape `tools.py` hands the in-app model, and the reading afterwards."""
    did = []
    for record in engine.log.flow(completion.flow):
        if record.kind != "completion" or record.concept == "Copiloting":
            continue
        entry: dict[str, Any] = {"action": f"{record.concept}/{record.action}"}
        if record.via:
            entry["by rule"] = record.via
        error = (record.output or {}).get("error")
        if error:
            entry["refused"] = error
        did.append(entry)
    return {
        "flow": completion.flow,
        "did": did,
        "state": digest(engine, SPEC, actor=BROWSER),
        "view": canvas(engine, SPEC, grid=grid),
    }


@app.post("/configurator/gesture")
def gesture(
    stimulus: dict[str, Any] = Body(...), grid: str = "today", actor: str = "person"
) -> dict[str, Any]:
    """A person acted on an application surface.

    The one root action a person's browser performs.  What follows is
    entirely a matter for the synchronizations.

    `grid` arrives as a query parameter rather than in the body, because it is
    a property of the read that comes back and not of the act.  Which carbon
    intensity somebody is looking at is not something they did, and it has no
    business in the action log.

    `actor` is `browser` when the person's own agent performed it, and the
    response is then what `/invoke` returns: what the rules did, and the
    digest it reads.
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
