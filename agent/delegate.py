"""What the person may hand to an agent they bring, as an MCP server.

Whose agent it is decides what it may do.  The in-app assistant is the
seller's, and its tools are in `tools.py`.  An agent the person brings is
theirs, so this server offers the person's gestures: each tool performs
`Copiloting/gesture` with the same `act` the canvas sends, under the actor
`browser`, and the rules in `syncs/gestures.py`, `binding.py` and
`reading.py` decide what follows.  `propose` and `read`, which a person has
no gesture for, perform `Copiloting/invoke` under the same actor.  `review`,
`open_quote` and `look_up` are reads, and perform nothing.  How much the person delegates is set in
their agent, not here.  See `docs/syncs/conduct.md`, "The person's own
agent, acting as the person".

This is the one table of those tools.  `webapp.py` mounts the server at
`/configurator/mcp`, where an MCP client connects to it, and the page reads
the same table from there and registers each tool on its WebMCP model
context, forwarding every call back here
(`src/components/configurator/webmcp.tsx`).

`review` and `open_quote` carry MCP Apps views, so a client that renders them
shows the specification or the offer beside its reply, each item in its kind
(`src/apps/`, built into `apps/`).  A view also carries the person's own
gestures, each a tool only the view can call, recorded under the actor
`person`: the person's hand in their own client, not their agent's.  See
Conduct, "In the person's own chat, the facts stay facts".

The person's agent reports to the person in a chat of its own, where a
fragment of the page means nothing.  So every result carries URLs beside
its addresses, in the page's URL grammar (`src/components/configurator/
link.tsx`), written against `CONFIGURATOR_URL`.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Annotated, Any, Literal
from urllib.parse import quote as escape

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from mcp.server.apps import APP_MIME_TYPE, Apps  # noqa: E402
from mcp.server.mcpserver import MCPServer  # noqa: E402
from mcp.server.mcpserver.resources import FunctionResource  # noqa: E402
from mcp.types import CallToolResult, TextContent, ToolAnnotations  # noqa: E402
from pydantic import Field  # noqa: E402

from instance import SPEC, engine  # noqa: E402
from views import canvas, detailed, digest, plain, quoted  # noqa: E402

# The person's own agent, as an actor: it performs the person's gestures and
# the model's verbs a person has no gesture for.  Which rules apply is a
# matter of the root action and its act or tool, not of this actor.
BROWSER = "browser"
# The person, acting by hand in a view their client renders.
PERSON = "person"

ORIGIN = os.environ.get("CONFIGURATOR_URL", "http://localhost:3000").rstrip("/")


# -- what a call hears back ---------------------------------------------------


def done(completion: Any) -> list[dict[str, Any]]:
    """What the rules did in a flow, in the shape `tools.py` hands the in-app
    model: each action, the rule that authorised it, and any refusal."""
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
    return did


def linked(value: Any) -> Any:
    """Every unit with its URL beside its address: `link` beside an `at`,
    and a quote's `page` made absolute."""
    if isinstance(value, list):
        return [linked(v) for v in value]
    if not isinstance(value, dict):
        return value
    out = {k: linked(v) for k, v in value.items()}
    if isinstance(out.get("at"), str) and out["at"].startswith("#"):
        out["link"] = f"{ORIGIN}/{out['at']}"
    if isinstance(out.get("page"), str) and out["page"].startswith("/"):
        out["page"] = f"{ORIGIN}{out['page']}"
    return out


def _frame_word(frame: dict[str, Any] | None) -> str:
    if not frame:
        return "none"
    if frame["by"] == "gap":
        return f"gap:{frame['gap']}"
    if frame["by"] == "assertion":
        return f"assertion:{frame['variable']}"
    return f"clause:{frame['clause']}"


def here(view: dict[str, Any]) -> str:
    """The URL of the view as it stands, every recorded part spelled out, as
    `viewLink` in `link.tsx` writes it."""
    params = {
        "frame": _frame_word(view["frame"]),
        "show": ",".join(f["facet"] for f in view["showing"] if f["shown"]),
    }
    query = "&".join(f"{k}={escape(v, safe=':,')}" for k, v in params.items())
    return f"{ORIGIN}/?{query}"


def _outcome(completion: Any) -> dict[str, Any]:
    view = canvas(engine, SPEC)
    return linked(
        {
            "flow": completion.flow,
            "did": done(completion),
            "state": digest(engine, SPEC, actor=BROWSER, view=view),
        }
    ) | {"here": here(view)}


def gesture(actor: str = BROWSER, **stimulus: Any) -> dict[str, Any]:
    """The person's act, as `POST /gesture` performs it."""
    return _outcome(engine.root("Copiloting", "gesture", actor=actor, spec=SPEC, **stimulus))


def invoke(tool: str, **args: Any) -> dict[str, Any]:
    """One of the model's verbs a person has no gesture for."""
    return _outcome(engine.root("Copiloting", "invoke", actor=BROWSER, spec=SPEC, tool=tool, **args))


# -- what a view renders --------------------------------------------------------

WHO = {"person": "you", BROWSER: "your agent", "model": "the assistant"}


def sheet(view: dict[str, Any]) -> dict[str, Any]:
    """The specification as the canvas lays it out, for a view: each
    requirement on its own line with the values asserted to answer it and
    what each forced beneath it, then every value asserted, with the
    requirements it answers if any, then what is open.  The digest says the
    same things in sentences for an agent to read; a view needs them in
    place, so that a value that follows sits under the assertion it rests
    on.  Read from the canvas, so the kind of each item is the canvas's."""
    variables = {v["name"]: v for v in view["variables"]}
    label = {o["id"]: o["label"] for v in view["variables"] for o in v["options"]}

    def forced(name: str) -> list[dict[str, Any]]:
        return [
            {
                "heading": f["heading"],
                "label": label.get(f["value"], f["value"]),
                "because": [o["because"] for o in f["owing"]],
                "link": f"{ORIGIN}/#variable:{f['name']}",
            }
            for f in view["variables"]
            if f["standing"] == "follows"
            and any(g["variable"] == name for g in f["following"])
        ]

    def value(v: dict[str, Any], at: str) -> dict[str, Any]:
        return {
            "heading": v["heading"],
            "label": label.get(v["asked"] or v["value"], v["asked"] or v["value"]),
            "standing": v["standing"],
            "by": WHO.get(v["by"] or "", v["by"]),
            "refused": [r["because"] for r in v["refused"]],
            "forced": forced(v["name"]),
            "link": f"{ORIGIN}/{at}",
        }

    answering = set()
    lines = []
    for c in view["clauses"]:
        answers = []
        for a in c["answers"]:
            if a["standing"] == "displaced" or a["variable"] not in variables:
                continue
            answering.add(a["variable"])
            answers.append(value(variables[a["variable"]], f"#choice:{a['choice']}"))
        lines.append(
            {
                "clause": c["clause"],
                "text": plain(c["text"]),
                "negotiability": c["negotiability"],
                "by": WHO.get(c["statedBy"], c["statedBy"]),
                # A clause the model read stays its reading until the person
                # keeps it; the view offers keeping it, and striking it.
                "reading": c["statedBy"] == "model",
                "from": (c["source"]["name"] or "your message") if c["source"] else None,
                "answers": answers,
                "link": f"{ORIGIN}/#clause:{c['clause']}",
            }
        )
    asserted = ("asked", "yielded", "unmet")
    return {
        "lines": lines,
        # One entry per value asserted, in the catalogue's order, with the
        # requirements it answers: a value with none is the ordinary case,
        # not a gap (docs/syncs/gestures.md).
        "values": [
            value(v, f"#variable:{v['name']}")
            | {"for": [plain(a["text"]) for a in v["answers"]]}
            for v in view["variables"]
            if v["standing"] in asserted
        ],
        "open": [
            {
                "heading": v["heading"],
                "possible": sum(1 for o in v["options"] if o["possible"]),
                "proposed": v["proposed"]["label"] if v["proposed"] else None,
                "link": f"{ORIGIN}/#variable:{v['name']}",
            }
            for v in view["variables"]
            if v["standing"] == "open"
        ],
        "questions": [
            {
                "about": q["about"],
                "reason": q.get("reason"),
                "asked": (q.get("asked") or {}).get("text"),
                "request": q["request"],
                "options": [
                    {"option": o, "label": f"{variables[o['variable']]['heading']}: {label.get(o['option'], o['option'])}"}
                    if o.get("variable") in variables
                    else {"option": o, "label": GOAL_LABEL.get(o.get("goal"), o.get("goal"))}
                    for o in q["options"]
                    if isinstance(o, dict) and ("goal" in o or o.get("variable") in variables)
                ],
            }
            for q in view["questions"]
            if q["about"] in ("conflict", "goal")
        ],
        "quotable": view["quotable"],
        "currency": view["currency"],
        "price": view["price"]["capital"],
        "here": here(view),
    }


def shown(structured: dict[str, Any], meta: dict[str, Any] | None = None) -> CallToolResult:
    """A read with a view: what the agent reads, and beside it, under
    `_meta`, what only the view renders."""
    return CallToolResult(
        content=[TextContent(type="text", text=json.dumps(structured, ensure_ascii=False))],
        structured_content=structured,
        meta=meta,
    )


def refused(action: str, why: str) -> dict[str, Any]:
    return {"did": [{"action": action, "refused": why}], "state": None}


# -- the server -----------------------------------------------------------------

apps = Apps()
# The tools with no view, added once the server exists; see the end.
PLAIN: list[tuple[Any, dict[str, Any]]] = []

SPECIFICATION = "ui://configurator/specification.html"
OFFER = "ui://configurator/quote.html"
READ_ONLY = ToolAnnotations(readOnlyHint=True)

# How the goal question's two answers read to the person's agent.
GOAL_LABEL = {"cost": "the lowest cost over the lift's life", "carbon": "the least carbon"}
# The view's URI under the key MCP Apps first used, which hosts still read
# beside `_meta.ui.resourceUri`; the extension's own server helper writes both.
LEGACY = {uri: {"ui/resourceUri": uri} for uri in (SPECIFICATION, OFFER)}

Clause = Annotated[str, Field(description="A clause's id, from `required` in `review`")]
Quote = Annotated[str, Field(description="A quote's id, from `quotes` in `review`")]
Moment = Annotated[
    str | None,
    Field(
        description="A quote's id, from `quotes` in `review`; none for the draft, the deal as it stands"
    ),
]
Option = Annotated[
    str,
    Field(description="A full option id, such as `rated_load:kg1000`, from `open` in `review`"),
]


def tool(name: str, description: str):
    def register(fn: Any) -> Any:
        PLAIN.append((fn, {"name": name, "description": description}))
        return fn

    return register


# -- reading the specification --------------------------------------------------


@apps.tool(
    resource_uri=SPECIFICATION,
    meta=LEGACY[SPECIFICATION],
    name="review",
    annotations=READ_ONLY,
    description=(
        "Read the specification as it stands: what is required, in its own "
        "words, and what answers each clause (`required`); the documents on "
        "record (`files`); what is asserted, what follows and the rule that "
        "forces it, what cannot be met, and what is open with the options "
        "still possible and any proposed value (`asked`, `follows`, `unmet`, "
        "`open`); open questions (`questions`): a conflict, or what to finish "
        "the specification for, with the assistant's question "
        "and any reply under `asked` when it put one to the person; price, carbon, the addressee, "
        "the job, and every quote issued, with its number, where it stands and "
        "which values have moved since (`quotes`); `open_quote` reads one. "
        "Every item carries its address on the page under `at` and its URL "
        "under `link`, and a quote its printable proposal under `page`: link "
        "them when you tell the person what you did or found. `here` is the URL "
        "of the canvas as it stands, which the person can open or send on. `struck` "
        "lists what the person struck from a reading. A "
        "projection, accurate as of this call: the person may act on the canvas "
        "between your calls."
    ),
)
def review() -> CallToolResult:
    view = canvas(engine, SPEC)
    return shown(
        linked(digest(engine, SPEC, actor=BROWSER, view=view)) | {"here": here(view)},
        {"sheet": sheet(view)},
    )


@apps.tool(
    resource_uri=OFFER,
    meta=LEGACY[OFFER],
    name="open_quote",
    annotations=READ_ONLY,
    description=(
        "Read an issued quote, as the offer was frozen when it was made, to "
        "check it against what the person asked for before they accept it; "
        "or, with no quote, the draft: the same record over the deal as it "
        "stands, with what is still open under `open` and why it cannot yet "
        "be issued under `because`. Call the draft a draft, never a quote. "
        "Returns each requirement as it stood with what answered it, or that "
        "nothing did (`required`); each value with its standing, why it holds "
        "and what it adds to the sum and the monthly charge (`values`); the "
        "programme's milestones by week, the payments due at each, and what "
        "the customer provides (`programme`, `payments`, `by_others`). "
        "Sentences beside a value are the canvas's, addressed to the person. "
        "`differs` lists the values that have moved in the specification since. "
        "Each line's `link` is its URL on the canvas, to link when you "
        "report to the person, and `page` is the proposal as it prints, the "
        "link to send someone who should read the offer. Changes nothing."
    ),
)
def open_quote(quote: Moment = None) -> CallToolResult:
    view = canvas(engine, SPEC)
    issued = next((q for q in view["quotes"] if q["quote"] == quote), None)
    return shown(
        linked(quoted(engine, SPEC, quote)) | {"here": here(view)},
        # Where the offer stands now, which the view's buttons depend on.
        {"standing": issued and {k: issued[k] for k in ("standing", "committed")}},
    )


@tool(
    "look_up",
    "Read what the seller publishes about one variable and its options, for "
    "a question the specification does not answer: what each option is and "
    "does, the systems it works with and the interfaces it speaks "
    "(`particulars`); what its price includes, excludes and asks the "
    "customer to provide (`scope`), which an offer carrying it prints among "
    "its terms; its price; which option is settled; and the rules that "
    "mention the variable. `variable` is a bare name such as "
    "`access_control`, as `review` lists it. With no variable, returns the "
    "seller's terms as an offer issued now would carry them: validity, "
    "warranty, programme periods, payment stages, and the clauses included, "
    "excluded, provided by the customer and conditions. Changes nothing.",
)
def look_up(
    variable: Annotated[
        str | None, Field(description="A variable's name, from `review`; none for the terms")
    ] = None,
) -> dict[str, Any]:
    return linked(detailed(engine, SPEC, variable))


# -- requirements ---------------------------------------------------------------


@tool(
    "file",
    "Attach a document to the specification, as the person, so requirements "
    "can be read from it and cited. What you file is shown to the seller. "
    "Returns the document's id under `files` in the result's `state`.",
)
def file(
    name: Annotated[str, Field(description="The document's name, such as its file name")],
    text: Annotated[str, Field(description="The document's full text")],
) -> dict[str, Any]:
    return gesture(act="file", name=name, text=text)


@tool(
    "read",
    "Record a requirement read from a filed document, or from a clause the "
    "person stated, with the words it was read from and the options that "
    "answer it. `words` is copied from the "
    "source as one unbroken passage: trim either end, never cut the "
    "middle, never paraphrase; words the source does not contain read "
    "nothing. `answer` is the option ids that answer it, possibly none. A "
    "count or a measure goes in `states` instead, as the words give it, "
    "under a name from `quantities` in `review`, such as `{\"storeys\": 13}`: "
    "the configurator works out the stops and the travel from it. Quantities "
    "worked out together, such as the floors and the basements, go in one "
    "item. From a document, the clause "
    "is stated as a reading, cited to the document; `keep` makes it the "
    "person's own. From a clause (`clause`, from `required`, one the person "
    "stated), no clause is stated: the answer is proposed to that clause as "
    "a reading of its words, which the person corrects. Give `file` or "
    "`clause`, never both.",
)
def read(
    words: Annotated[str, Field(description="The requirement, copied from the source")],
    file: Annotated[
        str | None, Field(description="A document's id, from `files` in `review`")
    ] = None,
    clause: Annotated[
        str | None, Field(description="A clause's id, from `required` in `review`")
    ] = None,
    answer: list[Option] = [],  # noqa: B006 — a schema default, never mutated
    states: Annotated[
        dict[str, float],
        Field(description="The counts and measures the words state, by quantity name"),
    ] = {},  # noqa: B006 — a schema default, never mutated
) -> dict[str, Any]:
    if bool(file) == bool(clause):
        return refused("read", "give a file or a clause, not both and not neither")
    return invoke("read", file=file, clause=clause, words=words, answer=answer, states=states)


@tool(
    "require",
    "State a requirement in the person's words, as one clause. Use `read` "
    "instead when the words are from a document, so the clause is cited.",
)
def require(
    text: Annotated[str, Field(description="The requirement, in the person's words")],
) -> dict[str, Any]:
    return gesture(act="require", text=text)


@tool("keep", "Make a clause read from a source the person's own.")
def keep(clause: Clause) -> dict[str, Any]:
    return gesture(act="keep", clause=clause)


@tool("reword", "Replace a clause's words.")
def reword(
    clause: Clause, text: Annotated[str, Field(description="The clause's new words")]
) -> dict[str, Any]:
    return gesture(act="reword", clause=clause, text=text)


@tool("relax", "Loosen a clause: replace its words with weaker ones.")
def relax(
    clause: Clause, text: Annotated[str, Field(description="The clause's new, weaker words")]
) -> dict[str, Any]:
    return gesture(act="relax", clause=clause, text=text)


@tool(
    "settle",
    "Say how firmly a clause holds: `fixed` (it must be met), `negotiable` "
    "(it gives way when the rules cannot honour it) or `open`.",
)
def settle(
    clause: Clause, negotiability: Literal["fixed", "negotiable", "open"]
) -> dict[str, Any]:
    return gesture(act="settle", clause=clause, negotiability=negotiability)


@tool("move", "Move a clause before another in the ledger.")
def move(
    clause: Clause,
    before: Annotated[str, Field(description="The clause it should come before")],
) -> dict[str, Any]:
    return gesture(act="move", clause=clause, before=before)


@tool("strike", "Remove a clause. The values answering it stay asserted, and answer nothing.")
def strike(clause: Clause) -> dict[str, Any]:
    return gesture(act="strike", clause=clause)


@tool("answer", "Say which option answers a clause. The option is asserted, as answering it.")
def answer(clause: Clause, option: Option) -> dict[str, Any]:
    return gesture(act="answer", clause=clause, option=option)


# -- values ---------------------------------------------------------------------


@tool(
    "assert_value",
    "Assert an option for its variable, as the person, answering no clause. "
    "Use `answer` when the value answers a requirement. An assertion that "
    "cannot be met is still recorded, and comes back under `unmet` with the "
    "rules that refuse it.",
)
def assert_value(
    variable: Annotated[str, Field(description="A variable name, such as `building_type`")],
    option: Option,
) -> dict[str, Any]:
    return gesture(act="assert", variable=variable, option=option)


@tool(
    "withdraw",
    "Take back whatever was asserted of a variable. What follows is "
    "recomputed; a value that was only ever an entailment reverts to open.",
)
def withdraw(
    variable: Annotated[str, Field(description="An asserted variable's name")],
) -> dict[str, Any]:
    return gesture(act="withdraw", variable=variable)


@tool(
    "propose",
    "Work out the way to finish the specification for the least cost over "
    "the lift's life or the least carbon. `goal` is the person's choice: give "
    "it when the person has said which, which records it and computes the "
    "completion; leave it out to finish for the goal already on record, or, "
    "when none is, to raise the question under `questions` for the person. "
    "Every assertion is kept. Each proposed value appears beside its "
    "variable under `open`, to adopt with `adopt`; the whole completion "
    "appears under `questions`, to adopt with `choose`.",
)
def propose(goal: Literal["cost", "carbon"] | None = None) -> dict[str, Any]:
    return invoke("propose", **({"goal": goal} if goal else {}))


@tool("adopt", "Adopt the value proposed for one open variable, as the person.")
def adopt(
    variable: Annotated[
        str, Field(description="An open variable's name with a proposed value")
    ],
) -> dict[str, Any]:
    state = digest(engine, SPEC, actor=BROWSER)
    proposed = next((v["proposed"] for v in state["open"] if v["variable"] == variable), None)
    if not proposed:
        return refused("adopt", f"nothing is proposed for {variable}") | {"state": linked(state)}
    return gesture(
        act="choose",
        request=proposed["request"],
        option={"variable": variable, "option": proposed["option"]},
    )


@tool(
    "choose",
    "Answer an open question as the person: a conflict, what to finish the "
    "specification for (the lowest cost over its life, or the least carbon), "
    "or the whole proposed completion. `request` and `option` are copied "
    "from the question under `questions` in `review`.",
)
def choose(
    request: Annotated[dict[str, Any], Field(description="The question's `request`, as given")],
    option: Annotated[Any, Field(description="One of the question's `options`, as given")],
) -> dict[str, Any]:
    return gesture(act="choose", request=request, option=option)


@tool(
    "decline",
    "Leave an open question for now, as the person: it goes from the "
    "canvas and things stay as they are. To hand a decision back to the "
    "person instead, use `reply`.",
)
def decline(
    request: Annotated[dict[str, Any], Field(description="The question's `request`, as given")],
) -> dict[str, Any]:
    return gesture(act="decline", request=request)


@tool(
    "reply",
    "Reply in words to a question the seller's assistant put, as the person "
    "(`asked` on a question in `review`, or `quotable.asked` when it asked who "
    "the quote is for). The reply settles nothing: the "
    "question stays on the person's canvas with your words beside it, and "
    "the assistant, if it is waiting on the answer, goes on. Use it to say "
    "which assertion gives way in your own words, or that the decision is "
    "the person's to make and you have left it with them.",
)
def reply(
    about: Annotated[dict[str, Any], Field(description="The question's `asked.about`, as given")],
    text: Annotated[str, Field(description="What you say to the assistant")],
) -> dict[str, Any]:
    return gesture(act="reply", about=about, text=text)


# -- the offer ------------------------------------------------------------------


@tool(
    "introduce",
    "Record who the person is, for the proposal's letterhead. Each call adds "
    "to what is recorded. A quote needs at least a name.",
)
def introduce(
    name: str | None = None,
    organisation: str | None = None,
    address: str | None = None,
    email: str | None = None,
    phone: str | None = None,
) -> dict[str, Any]:
    given = {"name": name, "organisation": organisation, "address": address, "email": email, "phone": phone}
    return gesture(act="introduce", **{k: v for k, v in given.items() if v is not None})


@tool(
    "entitle",
    "Record what the job is called and where the lift is going. A quote "
    "needs a site.",
)
def entitle(
    title: Annotated[str | None, Field(description="A short name for the job")] = None,
    site: Annotated[str | None, Field(description="The building's address")] = None,
) -> dict[str, Any]:
    given = {"title": title, "site": site}
    return gesture(act="entitle", **{k: v for k, v in given.items() if v is not None})


@tool(
    "quote",
    "Request a quote on the specification as it stands. One is issued only "
    "when every variable is settled and nothing asserted is unmet; "
    "otherwise `quotable` in the result says why. The quote freezes the "
    "values and the price as they are now.",
)
def request_quote() -> dict[str, Any]:
    return gesture(act="quote")


@tool(
    "commit",
    "Accept a quote, as the person. This commits them to the offer, so it "
    "is their decision: accept only when they have handed it to you, and "
    "otherwise report what `open_quote` shows and leave it with them.",
)
def commit(quote: Quote) -> dict[str, Any]:
    return gesture(act="commit", quote=quote)


@tool("revoke", "Revoke an accepted quote, as the person.")
def revoke(quote: Quote) -> dict[str, Any]:
    return gesture(act="revoke", quote=quote)


@tool(
    "handover",
    "Put the specification into the seller's hands, as the person, with the "
    "reason: what the seller is being handed it for, in the person's words. "
    "Nothing is frozen or locked; the seller reads the specification as it "
    "stands, and the log says how it got there. Hand over when the person "
    "has asked for someone at the seller, or has handed you that decision.",
)
def handover(
    reason: Annotated[str, Field(description="What the seller is being handed the specification for")],
) -> dict[str, Any]:
    return gesture(act="handover", reason=reason)


@tool(
    "clear",
    "Take the out-of-date mark off an answer or an offer, as the person, "
    "having looked at what changed: `review` marks an answer `stale` when "
    "its requirement was reworded since it was chosen, and an offer `stale` "
    "with the variables whose asked-for values moved since it was issued. "
    "The mark is information; clearing it changes nothing else.",
)
def clear(
    item: Annotated[str, Field(description="A choice's id from `answered_by`, or a quote's id from `quotes`")],
) -> dict[str, Any]:
    return gesture(act="clear", item=item)


@tool(
    "survey",
    "Record a fact of the situation as measured on site, as the person: the "
    "floor-to-floor height, the floors, the building's type. `review` lists "
    "the facts under `situation`, with who gave each and whether it was "
    "measured. What rested on the fact is worked out again and marked out of "
    "date, not replaced, and a fact the person gave is left out of a "
    "conflict's options and out of the assistant's reach.",
)
def survey(
    fact: Annotated[str, Field(description="A fact's name from `situation`, such as `storey_height` or `building_type`")],
    value: Annotated[str | float, Field(description="The measurement: a number for a quantity, an option id for a variable")],
) -> dict[str, Any]:
    return gesture(act="survey", fact=fact, value=value)


@tool(
    "drop",
    "Take a fact of the situation off the record, as the person. A fact the "
    "rules hold is withdrawn; a quantity is struck, and what rested on it is "
    "marked out of date.",
)
def drop(
    given: Annotated[str, Field(description="The given's id, from `situation`")],
) -> dict[str, Any]:
    return gesture(act="drop", given=given)



# -- what the canvas shows ------------------------------------------------------


@tool(
    "show",
    "Show a kind of fact beside every item it concerns. `facet` is a name "
    "from `showing` in `review`.",
)
def show(facet: str) -> dict[str, Any]:
    return gesture(act="show", facet=facet)


@tool("hide", "Stop showing a kind of fact. The inverse of `show`.")
def hide(facet: str) -> dict[str, Any]:
    return gesture(act="hide", facet=facet)


@tool(
    "frame",
    "Narrow the canvas to one assertion (`variable`, from `asked`), one "
    "requirement (`clause`, from `required`), one gap (`gap`: `open`, "
    "or `unanswered`), or one step of the job (`step`, from "
    "`steps`), with a `gap` beside a step to filter within it. A step is "
    "narrowed to, never taken, finished or skipped.",
)
def frame(
    variable: str | None = None,
    clause: str | None = None,
    gap: Literal["open", "unanswered"] | None = None,
    step: str | None = None,
) -> dict[str, Any]:
    given = [g for g in (variable, clause, step, gap) if g]
    if step and gap:
        return gesture(act="frame", frame={"by": "step", "step": step, "gap": gap})
    if len(given) != 1:
        return refused("frame", "give exactly one of a variable, a clause, a gap or a step")
    if clause:
        return gesture(act="frame", frame={"by": "clause", "clause": clause})
    if variable:
        return gesture(act="frame", frame={"by": "assertion", "variable": variable})
    if step:
        return gesture(act="frame", frame={"by": "step", "step": step})
    return gesture(act="frame", frame={"by": "gap", "gap": gap})


@tool("unframe", "Show the whole canvas again.")
def unframe() -> dict[str, Any]:
    return gesture(act="unframe")


# -- the person's hand, in a view ----------------------------------------------
#
# Each is a tool whose MCP Apps visibility is the view alone, so a host that
# renders the views keeps it off its agent's tool list.  The act is the same
# as the agent's tool of the same name; the actor is the person's, because
# the host shows the view to the person.  A client that does not render MCP
# Apps lists every tool to its model, and this server, being stateless, cannot
# tell which clients do; each description says so, and Conduct says where the
# boundary is.  What comes back is the read the view re-renders from.

BY_HAND = ["app"]


def _by_hand(stimulus: dict[str, Any], then: Any) -> CallToolResult:
    completion = engine.root("Copiloting", "gesture", actor=PERSON, spec=SPEC, **stimulus)
    result = then()
    result.meta = (result.meta or {}) | {"did": done(completion)}
    return result


def _specification() -> CallToolResult:
    return review()


@apps.tool(
    resource_uri=SPECIFICATION,
    meta=LEGACY[SPECIFICATION],
    visibility=BY_HAND,
    name="person_keep",
    description=(
        "The person keeps a reading as their own, in the specification's view."
        " Only the view calls this, when the person presses it; an agent uses `keep`."
    ),
)
def person_keep(clause: Clause) -> CallToolResult:
    return _by_hand({"act": "keep", "clause": clause}, _specification)


@apps.tool(
    resource_uri=SPECIFICATION,
    meta=LEGACY[SPECIFICATION],
    visibility=BY_HAND,
    name="person_strike",
    description=(
        "The person strikes a clause, in the specification's view."
        " Only the view calls this, when the person presses it; an agent uses `strike`."
    ),
)
def person_strike(clause: Clause) -> CallToolResult:
    return _by_hand({"act": "strike", "clause": clause}, _specification)


@apps.tool(
    resource_uri=SPECIFICATION,
    meta=LEGACY[SPECIFICATION],
    visibility=BY_HAND,
    name="person_choose",
    description=(
        "The person answers an open question, in the specification's view."
        " Only the view calls this, when the person presses it; an agent uses `choose`."
    ),
)
def person_choose(request: dict[str, Any], option: Any) -> CallToolResult:
    return _by_hand({"act": "choose", "request": request, "option": option}, _specification)


@apps.tool(
    resource_uri=OFFER,
    meta=LEGACY[OFFER],
    visibility=BY_HAND,
    name="person_commit",
    description=(
        "The person accepts the quote, in the offer's view."
        " Only the view calls this, when the person presses it; an agent uses `commit`."
    ),
)
def person_commit(quote: Quote) -> CallToolResult:
    return _by_hand({"act": "commit", "quote": quote}, lambda: open_quote(quote))


@apps.tool(
    resource_uri=OFFER,
    meta=LEGACY[OFFER],
    visibility=BY_HAND,
    name="person_revoke",
    description=(
        "The person revokes their acceptance, in the offer's view."
        " Only the view calls this, when the person presses it; an agent uses `revoke`."
    ),
)
def person_revoke(quote: Quote) -> CallToolResult:
    return _by_hand({"act": "revoke", "quote": quote}, lambda: open_quote(quote))


# -- the views ------------------------------------------------------------------
#
# Built from `src/apps/` by `npm run build:apps`, and read when a client asks,
# so the server starts whether or not they have been built.

BUILT = Path(__file__).parent / "apps"


def _view(name: str) -> str:
    path = BUILT / f"{name}.html"
    if path.exists():
        return path.read_text()
    return (
        "<!doctype html><meta charset=utf-8><p>This view has not been built: "
        "run <code>npm run build:apps</code>.</p>"
    )


for uri, name, title in (
    (SPECIFICATION, "specification", "The specification"),
    (OFFER, "quote", "The offer"),
):
    apps.add_resource(
        FunctionResource(
            uri=uri,
            name=name,
            title=title,
            mime_type=APP_MIME_TYPE,
            fn=lambda name=name: _view(name),
        )
    )

server = MCPServer(
    "configurator",
    title="Lift configurator",
    instructions=(
        "The person's side of a lift specification on the seller's "
        "configurator: you act as the person, and what you may do is what "
        "they may do. Start with `review`. A decision that commits the "
        "person, such as accepting a quote, is theirs: take it only when "
        "they have handed it to you."
    ),
    extensions=[apps],
)
for fn, given in PLAIN:
    server.add_tool(fn, **given)
