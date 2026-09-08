"""The HTTP surface a person's browser reaches.

Mounted into the LangGraph server by `langgraph.json`'s `http.app`, so it runs
in the same process as the graph and shares one engine with the model's tools.

Two routes and no more, because there are only two things to do: perform a root
action, or read.  This is WYSIWID §6.4's split at the level of the wire —
`POST /gesture` is the action API, `GET /view` is the querying capability, and
nothing writes through a read.

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

from fastapi import Body, FastAPI  # noqa: E402

from instance import SPEC, engine  # noqa: E402
from views import canvas  # noqa: E402

app = FastAPI()


@app.get("/configurator/view")
def view(grid: str = "today") -> dict[str, Any]:
    return canvas(engine, SPEC, grid=grid)


@app.post("/configurator/gesture")
def gesture(
    stimulus: dict[str, Any] = Body(...), grid: str = "today"
) -> dict[str, Any]:
    """A person acted on an application surface.

    The one root action a browser can perform.  What follows is entirely a
    matter for the synchronizations.

    `grid` arrives as a query parameter rather than in the body, because it is
    a property of the read that comes back and not of the act.  Which carbon
    intensity somebody is looking at is not something they did, and it has no
    business in the action log.
    """
    stimulus.setdefault("spec", SPEC)
    completion = engine.root("Copiloting", "gesture", actor="person", **stimulus)
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
