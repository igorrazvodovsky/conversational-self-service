"""Stepping — to show a person where they are in a recurring piece of work,
what the step they are at still needs and who owns it, without preventing
them from acting out of order.

Generated from `docs/concepts/stepping.md`.

state
  templates:  seq Template
  called:     Template -> string
  wants:      Template -> set Need
  usually:    Template -> Party
  steps:      Spec -> seq Step
  instanceOf: Step -> Template
  name:       Step -> string
  needs:      Step -> set Need
  owner:      Step -> Party
  status:     Step -> ("open" | "finished" | "skipped")
  at:         Spec -> Step
  deviation:  Step -> seq [ kind ; text ]

`Spec`, `Need` and `Party` are type parameters.  A need is whatever the
authoring party names — here a variable's name — and this concept never
asks whether one is met: that is a read over other concepts' state, made
by the rules and the read side.  A step holds its labels and nothing else:
where the person is, what is missing and whether a step is done are read
off the specification, not kept here.

Nothing here guards anything.  `take` on a skipped step, `finish` with its
needs unmet, `skip` of the step the spec is at: every one is recorded as
asked.  The map informs; it does not govern.
"""

from __future__ import annotations

from typing import Any

STATUSES = ("open", "finished", "skipped")


class Stepping:
    name = "Stepping"

    def __init__(self) -> None:
        self._templates: list[str] = []
        self._called: dict[str, str] = {}
        self._wants: dict[str, list[str]] = {}
        self._usually: dict[str, str] = {}
        self._steps: dict[str, list[str]] = {}
        self._instance_of: dict[str, str] = {}
        self._name: dict[str, str] = {}
        self._needs: dict[str, list[str]] = {}
        self._owner: dict[str, str] = {}
        self._status: dict[str, str] = {}
        self._at: dict[str, str] = {}
        self._deviation: dict[str, list[dict[str, str]]] = {}

    def state(self) -> dict[str, Any]:
        return {
            "templates": list(self._templates),
            "called": dict(self._called),
            "wants": {t: list(n) for t, n in self._wants.items()},
            "usually": dict(self._usually),
            "steps": {s: list(st) for s, st in self._steps.items()},
            "instanceOf": dict(self._instance_of),
            "name": dict(self._name),
            "needs": {st: list(n) for st, n in self._needs.items()},
            "owner": dict(self._owner),
            "status": dict(self._status),
            "at": dict(self._at),
            "deviation": {st: [dict(d) for d in ds] for st, ds in self._deviation.items()},
        }

    # -- helpers ------------------------------------------------------------

    def _spec_of(self, step: str) -> str | None:
        return next((s for s, steps in self._steps.items() if step in steps), None)

    def _deviate(self, step: str, kind: str, text: str) -> None:
        self._deviation.setdefault(step, []).append({"kind": kind, "text": text})

    # -- actions ------------------------------------------------------------

    def author(
        self, template: str, name: str, needs: list[str] | None = None, owner: str = ""
    ) -> dict[str, Any]:
        if template not in self._called:
            self._templates.append(template)
        self._called[template] = name
        self._wants[template] = list(dict.fromkeys(needs or []))
        self._usually[template] = owner
        return {"template": template}

    def instantiate(self, spec: str) -> dict[str, Any]:
        if spec in self._steps:
            return {"error": f"{spec} already has steps"}
        steps = []
        for template in self._templates:
            step = f"{spec}:{template}"
            steps.append(step)
            self._instance_of[step] = template
            self._name[step] = self._called[template]
            self._needs[step] = list(self._wants[template])
            self._owner[step] = self._usually[template]
            self._status[step] = "open"
            self._deviation[step] = []
        self._steps[spec] = steps
        return {"spec": spec, "steps": list(steps)}

    def abandon(self, spec: str) -> dict[str, Any]:
        for step in self._steps.pop(spec, []):
            for relation in (
                self._instance_of, self._name, self._needs,
                self._owner, self._status, self._deviation,
            ):
                relation.pop(step, None)
        self._at.pop(spec, None)
        return {"spec": spec}

    def take(self, party: str, spec: str, step: str) -> dict[str, Any]:
        if step not in self._steps.get(spec, []):
            return {"error": f"{step} is not a step of {spec}"}
        self._at[spec] = step
        return {"spec": spec, "step": step, "party": party}

    def finish(self, party: str, step: str) -> dict[str, Any]:
        spec = self._spec_of(step)
        if spec is None:
            return {"error": f"no step {step}"}
        self._status[step] = "finished"
        return {"step": step, "spec": spec, "party": party}

    def skip(self, party: str, step: str, reason: str = "") -> dict[str, Any]:
        spec = self._spec_of(step)
        if spec is None:
            return {"error": f"no step {step}"}
        self._status[step] = "skipped"
        self._deviate(step, "skip", reason)
        return {"step": step, "spec": spec, "party": party}

    def reopen(self, party: str, step: str) -> dict[str, Any]:
        spec = self._spec_of(step)
        if spec is None:
            return {"error": f"no step {step}"}
        if self._status[step] == "open":
            return {"error": f"{step} is open"}
        self._status[step] = "open"
        return {"step": step, "spec": spec, "party": party}

    def reassign(self, party: str, step: str, owner: str) -> dict[str, Any]:
        spec = self._spec_of(step)
        if spec is None:
            return {"error": f"no step {step}"}
        formerly = self._owner[step]
        self._owner[step] = owner
        return {"step": step, "spec": spec, "owner": owner, "formerly": formerly}

    def rename(self, party: str, step: str, name: str) -> dict[str, Any]:
        spec = self._spec_of(step)
        if spec is None:
            return {"error": f"no step {step}"}
        if not name.strip():
            return {"error": "a step needs a name"}
        formerly = self._name[step]
        self._name[step] = name
        self._deviate(step, "rename", formerly)
        return {"step": step, "spec": spec, "formerly": formerly}

    def add(self, party: str, spec: str, name: str, step: str) -> dict[str, Any]:
        if spec not in self._steps:
            return {"error": f"{spec} has no steps"}
        if not name.strip():
            return {"error": "a step needs a name"}
        if step in self._name:
            return {"error": f"{step} exists"}
        self._steps[spec].append(step)
        self._name[step] = name
        self._needs[step] = []
        self._owner[step] = party
        self._status[step] = "open"
        self._deviation[step] = [{"kind": "add", "text": name}]
        return {"step": step, "spec": spec}
