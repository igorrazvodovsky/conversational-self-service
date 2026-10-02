"""The measures — `docs/measures.md`.

What the case's plan counts to judge its first two slices: whether a value
answers a requirement the person stated, and what became of each reading the
model landed unasked.  A read, like `views.py`: it invokes nothing and writes
nothing, and it is served at `GET /configurator/measures`.  Nothing on the
page, in the digest or among the tools reads it, since a party shown the
count would change what is counted.

Records are linked by `after`, the completion a rule reacted to.  Every rule
named below is the one whose edge the note reads; a rule renamed in
`syncs/` is a measure that silently counts nothing, so the names stay
spelled as they are there.
"""

from __future__ import annotations

from collections import Counter
from typing import Any

from engine import Engine

PERSON = "person"

ANSWERED = {"AChoiceReachesTheAssertions", "ASubstituteReachesTheAssertions"}
ASKED = {"APersonAssertsAValue", "TheModelMayAssertAValue"}
ADOPTED = "AnAdoptedValueBecomesAnAssertion"

CLAUSE_LEVEL = {"struck", "reworded", "relaxed"}
ANSWER_LEVEL = {"re-answered", "withdrawn"}
EDITS = {"strike": "struck", "reword": "reworded", "relax": "relaxed"}


def measures(engine: Engine) -> dict[str, Any]:
    records = [
        r
        for r in engine.log.records(since=engine.settled_at, limit=1_000_000)
        if r.kind == "completion" and not (r.output or {}).get("error")
    ]
    by_id = {r.id: r for r in records}
    catalogue = engine.state("Cataloguing")
    label = catalogue["label"]

    # What every clause was stated as, by whom, and in which specification.
    # Struck clauses leave Specifying's state, so the log is the only place
    # their words survive.
    stated: dict[str, dict[str, Any]] = {}
    for r in records:
        if (r.concept, r.action) == ("Specifying", "require"):
            stated[r.output["clause"]] = {
                "spec": r.output["spec"],
                "by": r.input.get("party"),
                "words": [r.input.get("text", "")],
            }
        elif r.concept == "Specifying" and r.action in {"reword", "relax"}:
            clause = stated.get(r.input.get("clause"))
            if clause is not None:
                clause["words"].append(r.input.get("text", ""))

    def requirement_of(assertion: Any) -> str | None:
        prior = by_id.get(assertion.after)
        return (prior.output or {}).get("requirement") if prior else None

    specs: dict[str, dict[str, Any]] = {}

    def spec(s: str) -> dict[str, Any]:
        return specs.setdefault(s, {"origin": Counter(), "items": []})

    # Slice 1, the history: every assertion, by the rule that made it.
    for r in records:
        if (r.concept, r.action) != ("Asserting", "assert"):
            continue
        if r.via in ANSWERED:
            clause = stated.get(requirement_of(r) or "")
            key = f"answers a clause stated by {clause['by'] if clause else 'nobody'}"
        elif r.via in ASKED:
            key = f"asked for by {r.actor}"
        elif r.via == ADOPTED:
            key = "adopted from a proposal"
        else:
            key = r.via or "recorded at boot"
        spec(r.output["spec"])["origin"][key] += 1

    # Slice 2: each read item, its clause, its proposed choices, and what the
    # person or anyone else did to them afterwards.
    clause_of: dict[str, str] = {}  # read completion id -> clause
    choices_of: dict[str, set[str]] = {}  # clause -> choices proposed from the read
    for r in records:
        if r.via == "AReadItemBecomesAClause":
            clause_of[r.after] = r.output["clause"]
        elif r.via == "AReadAnswerIsProposed":
            prior = by_id.get(r.after)
            if prior is not None:
                choices_of.setdefault(prior.output["clause"], set()).add(r.output["choice"])

    fates: dict[str, set[str]] = {}  # clause -> fates
    for r in records:
        if r.concept == "Specifying" and r.action in EDITS:
            fates.setdefault(r.input.get("clause"), set()).add(EDITS[r.action])
            continue
        if r.concept != "Binding":
            continue
        for clause, choices in choices_of.items():
            if r.action == "substitute" and r.input.get("choice") in choices:
                if r.input.get("party") == PERSON:
                    fates.setdefault(clause, set()).add("re-answered")
            elif r.action == "retract" and r.input.get("choice") in choices:
                if r.via == "AnOverwrittenValueRetractsItsChoices":
                    fates.setdefault(clause, set()).add("displaced")
                elif r.via == "AWithdrawnValueRetractsItsChoices":
                    withdraw = by_id.get(r.after)
                    who = withdraw.actor if withdraw else None
                    fates.setdefault(clause, set()).add(
                        "withdrawn" if who == PERSON else "withdrawn by the model"
                    )
        if (
            r.action == "propose"
            and r.input.get("party") == PERSON
            and r.input.get("requirement") in stated
            and not choices_of.get(r.input["requirement"])
        ):
            fates.setdefault(r.input["requirement"], set()).add("missed")

    for r in records:
        if (r.concept, r.action) != ("Reading", "read"):
            continue
        clause = clause_of.get(r.id)
        if clause is None or clause not in stated:
            continue
        source = r.output.get("source") or {}
        found = set(fates.get(clause, set()))
        if not choices_of.get(clause):
            found.add("found nothing")
        spec(stated[clause]["spec"])["items"].append(
            {
                "item": r.output.get("item"),
                "source": "file" if source.get("file") else "utterance",
                "file": (
                    engine.state("Filing")["name"].get(source["file"], source["file"])
                    if source.get("file")
                    else None
                ),
                "words": r.output.get("words"),
                "answer": [label.get(o, o) for o in r.output.get("answer") or []],
                "clause": clause,
                "fates": sorted(found),
            }
        )

    # Slice 1, the standing: each value asserted now, and the clause it answers.
    asserting = engine.state("Asserting")
    binding = engine.state("Binding")
    for s in asserting["open"]:
        spec(s)
    out = []
    for s, m in specs.items():
        selections = [sel for sel, of in binding["for"].items() if of == s]
        # One option can answer several clauses: a later choice of the same
        # option retracts nothing.  It is the person's if any clause is.
        answering: dict[str, list[dict[str, Any]]] = {}  # option -> clauses
        for sel in selections:
            for ch in binding["choices"].get(sel, []):
                clause = stated.get(binding["answers"][ch])
                if clause is not None:
                    answering.setdefault(binding["value"][ch], []).append(clause)
        standing: Counter[str] = Counter()
        pairs = []
        for variable, option in asserting["asserted"].get(s, {}).items():
            clauses = answering.get(option, [])
            persons = [c for c in clauses if c["by"] == PERSON]
            if persons:
                standing["answers a clause stated by person"] += 1
            elif clauses:
                standing["answers a clause stated by model"] += 1
            else:
                standing["unbound"] += 1
            pairs += [
                {
                    "clause": c["words"][-1],
                    "variable": variable,
                    "value": label.get(option, option),
                }
                for c in persons
            ]
        current = sum(standing.values())
        out.append(
            {
                "spec": s,
                "open": s in asserting["open"],
                "values": {
                    "standing": dict(standing),
                    "answering the person": _share(
                        standing["answers a clause stated by person"], current
                    ),
                    "origin": dict(m["origin"]),
                    "pairs": pairs,
                },
                "readings": _readings(m["items"]),
            }
        )
    return {"specs": out}


def _readings(items: list[dict[str, Any]]) -> dict[str, Any]:
    def tally(of: list[dict[str, Any]]) -> dict[str, Any]:
        fates = Counter(f for i in of for f in i["fates"])
        clause = [i for i in of if CLAUSE_LEVEL & set(i["fates"])]
        answer = [i for i in of if ANSWER_LEVEL & set(i["fates"])]
        disowned = [i for i in of if (CLAUSE_LEVEL | ANSWER_LEVEL) & set(i["fates"])]
        empty = [i for i in of if "found nothing" in i["fates"]]
        return {
            "items": len(of),
            "fates": dict(fates),
            "disowned": _share(len(disowned), len(of)),
            "disowned at the clause": _share(len(clause), len(of)),
            "disowned at the answer": _share(len(answer), len(of)),
            "missed": _share(sum("missed" in i["fates"] for i in empty), len(empty)),
        }

    return {
        "all": tally(items),
        "from a file": tally([i for i in items if i["source"] == "file"]),
        "from the person's words": tally([i for i in items if i["source"] == "utterance"]),
        "items": items,
    }


def _share(part: int, whole: int) -> float | None:
    return round(part / whole, 3) if whole else None
