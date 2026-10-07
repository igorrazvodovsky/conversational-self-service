"""Constraining — to work out what a specification can still become under the
rules that say what can be built, given what is asked of it firmly and what
only as a preference.

Generated from `docs/concepts/constraining.md`.

state
  range:    Variable -> set Option
  scope:    Rule -> seq Variable
  allows:   Rule -> set (seq Option)
  because:  Rule -> string
  assumed:  Spec -> Variable -> Option
  inclined: Spec -> Variable -> Option
  possible: Spec -> Variable -> set Option
  settled:  Spec -> Variable -> Option
  owing:    Spec -> Variable -> set Rule
  following: Spec -> Variable -> set Variable
  refused:  Spec -> Variable -> set Rule

A change to the rule base recomputes every specification being tracked.  Only
an action naming a specification used to do that, so `possible` and `settled`
went stale behind `offer` and `withhold`.

The decision procedure is z3, and the specification says nothing about that on
purpose: which procedure computes `possible` is the kind of implementation
choice MSM §5.2 calls secondary to the names.

The encoding, once, so it is not reverse-engineered later.  One Boolean per
(variable, option) pair; one permanent, untracked exactly-one constraint per
variable, so that it can never appear in a core and be mistaken for a rule; one
literal per rule, with the rule asserted as `Implies(literal, constraint)` and
the literal supplied as an assumption at every check.  Assumptions of a
specification are supplied as the selection literals themselves.  An unsat core
therefore comes back as a mixture of rule identities and (variable, option)
pairs, which is exactly the pair of things the failing case of `assume` has to
report.
"""

from __future__ import annotations

from typing import Any, Iterable

import z3


class Constraining:
    name = "Constraining"

    def __init__(self) -> None:
        self._range: dict[str, list[str]] = {}
        self._rules: dict[str, dict[str, Any]] = {}
        self._because: dict[str, str] = {}
        self._assumed: dict[str, dict[str, str]] = {}
        self._inclined: dict[str, dict[str, str]] = {}
        self._possible: dict[str, dict[str, list[str]]] = {}
        self._settled: dict[str, dict[str, str]] = {}
        self._owing: dict[str, dict[str, list[str]]] = {}
        self._following: dict[str, dict[str, list[str]]] = {}
        self._refused: dict[str, dict[str, list[str]]] = {}
        self._solver: z3.Solver | None = None
        # The reads' own solver, over the same rules.  A solver learns from
        # every question put to it and answers the next one differently for
        # it, so a query made between two actions would leave the actions'
        # answers depending on what the canvas happened to ask — and the log,
        # which records actions and not reads, could not replay them.
        self._reader: z3.Solver | None = None
        self._sel: dict[tuple[str, str], z3.BoolRef] = {}
        self._rule_lit: dict[str, z3.BoolRef] = {}

    def state(self) -> dict[str, Any]:
        return {
            "range": {v: list(os) for v, os in self._range.items()},
            "because": dict(self._because),
            "scope": {r: list(d.get("over", [])) for r, d in self._rules.items()},
            "assumed": {s: dict(m) for s, m in self._assumed.items()},
            "inclined": {s: dict(m) for s, m in self._inclined.items()},
            "possible": {
                s: {v: list(os) for v, os in m.items()}
                for s, m in self._possible.items()
            },
            "settled": {s: dict(m) for s, m in self._settled.items()},
            "owing": {
                s: {v: list(rs) for v, rs in m.items()} for s, m in self._owing.items()
            },
            "following": {
                s: {v: list(vs) for v, vs in m.items()}
                for s, m in self._following.items()
            },
            "refused": {
                s: {v: list(rs) for v, rs in m.items()}
                for s, m in self._refused.items()
            },
        }

    # -- actions: the rule base --------------------------------------------

    def offer(self, variable: str, option: str) -> dict[str, Any]:
        options = self._range.setdefault(variable, [])
        if option not in options:
            options.append(option)
            self._invalidate()
            self._recompute_all()
        return {"variable": variable}

    def withhold(self, variable: str, option: str) -> dict[str, Any]:
        """Take the option out of the range, and out of anything that held it.

        The promise — no specification may settle on it again — is not kept for
        a specification that already assumed it unless the assumption goes too,
        and `possible` and `settled` would go stale besides, since neither is
        recomputed except by an action naming a specification.

        Nothing reaches Asserting.  An assertion of a delisted option stays
        on record and unmet, exactly as it does when a rule refuses it:
        delisting an option does not unask for it.
        """
        options = self._range.get(variable, [])
        if option not in options:
            return {"variable": variable, "conceding": []}
        options.remove(option)
        conceding = []
        for spec in list(self._assumed):
            if self._assumed[spec].get(variable) == option:
                self._assumed[spec].pop(variable, None)
                conceding.append(spec)
        for spec in list(self._inclined):
            if self._inclined[spec].get(variable) == option:
                self._inclined[spec].pop(variable, None)
        self._invalidate()
        self._recompute_all()
        return {"variable": variable, "conceding": sorted(conceding)}

    def tabulate(
        self, rule: str, over: list[str], allows: list[list[str]], because: str
    ) -> dict[str, Any]:
        self._rules[rule] = {
            "kind": "table",
            "over": list(over),
            "allows": [list(t) for t in allows],
        }
        self._because[rule] = because
        self._invalidate()
        return {"rule": rule}

    def imply(
        self,
        rule: str,
        given: list[dict[str, Any]],
        entails: dict[str, Any],
        because: str,
    ) -> dict[str, Any]:
        self._rules[rule] = {
            "kind": "implication",
            "over": [c["variable"] for c in given] + [entails["variable"]],
            "given": [
                {"variable": c["variable"], "among": list(c["among"])} for c in given
            ],
            "entails": {
                "variable": entails["variable"],
                "among": list(entails["among"]),
            },
        }
        self._because[rule] = because
        self._invalidate()
        return {"rule": rule}

    # -- actions: a specification's assumptions -----------------------------

    def assume(self, spec: str, variable: str, option: str) -> dict[str, Any]:
        return self._adopt(spec, variable, option, hard=True)

    def incline(self, spec: str, variable: str, option: str) -> dict[str, Any]:
        return self._adopt(spec, variable, option, hard=False)

    def consider(self, spec: str) -> dict[str, Any]:
        """Begin tracking a specification, with nothing assumed of it."""
        self._assumed[spec] = {}
        self._inclined[spec] = {}
        self._refused[spec] = {}
        return self._recompute(spec)

    def release(self, spec: str, variable: str) -> dict[str, Any]:
        self._assumed.setdefault(spec, {}).pop(variable, None)
        self._inclined.setdefault(spec, {}).pop(variable, None)
        self._refused.setdefault(spec, {}).pop(variable, None)
        return self._recompute(spec)

    def forget(self, spec: str) -> dict[str, Any]:
        """The inverse of `consider`, and it costs what `consider` cost.

        A discarded specification whose assumptions stayed here would be
        neither tracked nor gone.
        """
        for held in (
            self._assumed,
            self._inclined,
            self._possible,
            self._settled,
            self._owing,
            self._following,
            self._refused,
        ):
            held.pop(spec, None)
        return {"spec": spec}

    def complete(self, spec: str, cost: dict[str, float]) -> dict[str, Any]:
        solver = self._built()
        opt = z3.Optimize()
        for assertion in solver.assertions():
            opt.add(assertion)
        for literal in self._rule_lit.values():
            opt.add(literal)
        for variable, option in self._assumed.get(spec, {}).items():
            literal = self._sel.get((variable, option))
            if literal is None:
                return {"error": f"{variable} does not offer {option}", "culprits": []}
            opt.add(literal)
        for variable, option in self._inclined.get(spec, {}).items():
            literal = self._sel.get((variable, option))
            if literal is not None:
                opt.add_soft(literal, weight=1)
        terms = [
            z3.If(literal, float(cost.get(option, 0.0)), 0.0)
            for (variable, option), literal in self._sel.items()
        ]
        objective = opt.minimize(z3.Sum(terms) if terms else z3.RealVal(0))
        if opt.check() != z3.sat:
            culprits = self._why_unsat(spec)["rules"]
            return {
                "error": "no buildable combination honours every requirement",
                "culprits": culprits,
            }
        model = opt.model()
        assignment = {
            variable: option
            for (variable, option), literal in self._sel.items()
            if z3.is_true(model.eval(literal, model_completion=True))
        }
        total = sum(cost.get(option, 0.0) for option in assignment.values())
        return {
            "spec": spec,
            "assignment": assignment,
            "cost": round(float(total), 2),
            "objective": str(objective.value()),
        }

    # -- reads --------------------------------------------------------------

    def excluding(self, spec: str, variable: str, option: str) -> list[str]:
        """Which rules rule the option out for this specification.

        A query, not an action — `docs/concepts/constraining.md`, `queries`.  One solver check: can the rules and
        the assumptions hold with this option selected, and if not, which
        rules are in the core.  Empty for an option still possible, and empty
        when the core holds no rule at all — the option is then ruled out by
        an assumption alone, which is the person having asserted otherwise for
        the same variable, and the card already says so.
        """
        return self._core_against(spec, variable, option)[0]

    def narrowing(self, spec: str, variable: str, option: str) -> list[str]:
        """Which of the specification's assumptions rule the option out.

        The same core as `excluding`, read for its other half: the variables
        whose assumed options took part.  What `Framing` reads to say which
        open variables one assertion narrowed.
        """
        return self._core_against(spec, variable, option)[1]

    def _core_against(
        self, spec: str, variable: str, option: str
    ) -> tuple[list[str], list[str]]:
        if option in self._possible.get(spec, {}).get(variable, []):
            return [], []
        literal = self._built_sel().get((variable, option))
        if literal is None:
            return [], []
        solver = self._reading()
        rules = list(self._rule_lit.values())
        return self._read_core(
            solver, [*rules, *self._effective_literals(spec)], [literal], exclude=variable
        )

    def _read_core(
        self,
        solver: z3.Solver,
        tracked: list[z3.BoolRef],
        fixed: list[z3.BoolRef],
        exclude: str | None = None,
    ) -> tuple[list[str], list[str]]:
        """The smallest set of rules and assumed variables among `tracked`
        that cannot hold together with `fixed`; nothing when they all can.

        The solver's own core is a starting point and not an answer: it is
        not minimal, and it depends on what the solver happened to learn from
        earlier questions, so the same specification could be explained one
        way live and another way after the log is replayed.  So the core is
        shrunk by deletion, in the fixed order `tracked` is given in, until
        every literal left is one without which the rest hold.  One minimal
        set is returned; where several exist the deletion order decides.
        """
        if solver.check(*tracked, *fixed) != z3.unsat:
            return [], []
        core = {str(term) for term in solver.unsat_core()}
        kept = [term for term in tracked if str(term) in core]
        index = 0
        while index < len(kept):
            trial = kept[:index] + kept[index + 1 :]
            if solver.check(*trial, *fixed) == z3.unsat:
                core = {str(term) for term in solver.unsat_core()}
                kept = [term for term in trial if str(term) in core]
            else:
                index += 1
        core = {str(term) for term in kept}
        rules = sorted(
            rule for rule, rule_literal in self._rule_lit.items() if str(rule_literal) in core
        )
        variables = sorted(
            {
                v
                for (v, o), sel in self._sel.items()
                if str(sel) in core and v != exclude
            }
        )
        return rules, variables

    # -- the solver ---------------------------------------------------------

    def _invalidate(self) -> None:
        self._solver = None
        self._reader = None

    def _reading(self) -> z3.Solver:
        """The solver the queries use: the rules the actions' solver holds,
        in a solver whose learning never reaches an action."""
        if self._reader is None:
            built = self._built()
            self._reader = z3.Solver()
            self._reader.add(*built.assertions())
        return self._reader

    def _recompute_all(self) -> None:
        """Every specification being tracked, after the rule base moved.

        `_assumed` is the tracking set: `consider` seeds an entry before
        anything is assumed of a specification and `forget` removes one, so a
        specification with no assumptions left is still tracked.

        Free at boot, where the catalogue arrives before any specification.
        """
        for spec in list(self._assumed):
            self._recompute(spec)

    def _built(self) -> z3.Solver:
        if self._solver is not None:
            return self._solver
        solver = z3.Solver()
        self._sel = {}
        self._rule_lit = {}
        for variable, options in self._range.items():
            literals = []
            for option in options:
                literal = z3.Bool(f"{variable}={option}")
                self._sel[(variable, option)] = literal
                literals.append(literal)
            if literals:
                # Permanent and untracked: an exactly-one constraint is not a
                # rule, and must never turn up in a core as though it were.
                solver.add(z3.PbEq([(literal, 1) for literal in literals], 1))
        for rule, body in self._rules.items():
            constraint = self._encode(body)
            if constraint is None:
                continue
            literal = z3.Bool(f"rule::{rule}")
            self._rule_lit[rule] = literal
            solver.add(z3.Implies(literal, constraint))
        self._solver = solver
        return solver

    def _encode(self, body: dict[str, Any]) -> z3.BoolRef | None:
        if body["kind"] == "table":
            over = body["over"]
            clauses = []
            for tuple_ in body["allows"]:
                literals = [
                    self._sel.get((variable, option))
                    for variable, option in zip(over, tuple_)
                ]
                if all(literal is not None for literal in literals):
                    clauses.append(z3.And(*literals))
            return z3.Or(*clauses) if clauses else z3.BoolVal(False)
        premises = []
        for condition in body["given"]:
            literals = self._among(condition)
            if not literals:
                return None
            premises.append(z3.Or(*literals))
        conclusion = self._among(body["entails"])
        head = z3.Or(*conclusion) if conclusion else z3.BoolVal(False)
        return z3.Implies(z3.And(*premises) if premises else z3.BoolVal(True), head)

    def _among(self, condition: dict[str, Any]) -> list[z3.BoolRef]:
        variable = condition["variable"]
        return [
            self._sel[(variable, option)]
            for option in condition["among"]
            if (variable, option) in self._sel
        ]

    def _assumption_literals(self, spec: str) -> list[z3.BoolRef]:
        literals = []
        for variable, option in self._assumed.get(spec, {}).items():
            literal = self._sel.get((variable, option))
            if literal is not None:
                literals.append(literal)
        return literals

    def _honoured(
        self,
        solver: z3.Solver,
        rules: list[z3.BoolRef],
        assumptions: list[z3.BoolRef],
        inclinations: dict[str, str],
    ) -> tuple[list[z3.BoolRef], dict[str, str]]:
        """Which inclinations can hold together with the rules, the
        assumptions and the inclinations honoured before them, earlier first.

        Returns the assumptions with the honoured inclinations' literals
        appended, and the honoured inclinations themselves.  An inclination
        that cannot hold is dropped here and nowhere else: it stays recorded
        in `inclined`, and the canvas reads it as yielded from `settled`
        beside it.  Order is the order of inclination, which is what makes
        two preferences that cannot both hold resolve the same way twice.
        """
        held = list(assumptions)
        honoured: dict[str, str] = {}
        for variable, option in inclinations.items():
            literal = self._sel.get((variable, option))
            if literal is None:
                continue
            if solver.check(*rules, *held, literal) == z3.sat:
                held.append(literal)
                honoured[variable] = option
        return held, honoured

    def _effective_literals(self, spec: str) -> list[z3.BoolRef]:
        """The assumptions and the honoured inclinations, as the recompute
        sees them.  What `possible`, `settled` and the two reads beside them
        are computed against; never what `assume`'s check is, which is the
        assumptions alone."""
        solver = self._reading()
        held, _ = self._honoured(
            solver,
            list(self._rule_lit.values()),
            self._assumption_literals(spec),
            self._inclined.get(spec, {}),
        )
        return held

    def _adopt(
        self, spec: str, variable: str, option: str, *, hard: bool
    ) -> dict[str, Any]:
        if (variable, option) not in self._built_sel():
            return {
                "error": f"{variable} does not offer {option}",
                "culprits": [],
                "conceding": [variable],
            }
        assumed = self._assumed.setdefault(spec, {})
        inclined = self._inclined.setdefault(spec, {})
        # As they were, in the order they were: the order of inclination is
        # the order they are honoured in, and a refusal must not reshuffle it.
        before_assumed = dict(assumed)
        before_inclined = dict(inclined)
        was_assumed = assumed.get(variable)
        if hard:
            inclined.pop(variable, None)
            assumed[variable] = option
        else:
            assumed.pop(variable, None)
            inclined[variable] = option

        if hard:
            solver = self._built()
            if solver.check(*self._rule_lit.values(), *self._assumption_literals(spec)) \
                    != z3.sat:
                why = self._why_unsat(spec)
                assumed.clear()
                assumed.update(before_assumed)
                inclined.clear()
                inclined.update(before_inclined)
                self._refused.setdefault(spec, {})[variable] = why["rules"]
                if was_assumed is not None and was_assumed != option:
                    # The variable was assumed to be something else, and the
                    # caller has replaced that with what was just refused.
                    # An assumption nothing asserts any more would go on
                    # narrowing the specification on nobody's authority.
                    assumed.pop(variable, None)
                    self._recompute(spec)
                sentences = [self._because.get(r, r) for r in why["rules"]]
                joined = "; ".join(sentences) if sentences else "the rules"
                return {
                    "error": f"{variable} cannot be {option}: {joined}",
                    "culprits": why["rules"],
                    "conceding": sorted(set(why["variables"]) | {variable}),
                }
        self._refused.setdefault(spec, {}).pop(variable, None)
        return self._recompute(spec)

    def _survey(
        self, solver: z3.Solver, rules: list[z3.BoolRef], assumptions: list[z3.BoolRef]
    ) -> tuple[dict[str, list[str]], dict[str, str]]:
        """The first pass: which options survive, and which variables are
        settled to one, under these assumptions.  Shared by `_recompute` and
        by `foreseeing`, which asks it of assumptions nobody has made."""
        possible: dict[str, set[str]] = {v: set() for v in self._range}
        while True:
            unseen = [
                self._sel[(variable, option)]
                for variable, options in self._range.items()
                for option in options
                if option not in possible[variable]
            ]
            if not unseen:
                break
            solver.push()
            solver.add(*assumptions)
            solver.add(z3.Or(*unseen))
            found = solver.check(*rules) == z3.sat
            model = solver.model() if found else None
            solver.pop()
            if not found:
                break
            for (variable, option), literal in self._sel.items():
                if z3.is_true(model.eval(literal, model_completion=True)):
                    possible[variable].add(option)

        ordered = {
            variable: [o for o in options if o in possible[variable]]
            for variable, options in self._range.items()
        }
        settled = {v: os[0] for v, os in ordered.items() if len(os) == 1}
        return ordered, settled

    def foreseeing(
        self,
        spec: str,
        assumptions: dict[str, str],
        inclinations: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        """What the specification would settle under these assumptions and
        inclinations instead of its own.

        A read, not an action — `docs/syncs/propagation.md`, "What each
        answer would cost is a read".  Nothing is recorded: the question
        *what if this were given up* is asked of the solver and answered,
        and the specification's own assumptions are untouched.  `buildable`
        is false when the assumptions cannot hold together, in which case
        nothing is possible and nothing settled.  Inclinations are honoured
        where they can be, as in the recompute.
        """
        solver = self._reading()
        rules = list(self._rule_lit.values())
        literals = [
            self._sel[(variable, option)]
            for variable, option in assumptions.items()
            if (variable, option) in self._sel
        ]
        buildable = solver.check(*rules, *literals) == z3.sat
        if not buildable:
            return {"spec": spec, "buildable": False, "possible": {}, "settled": {}}
        held, _ = self._honoured(solver, rules, literals, inclinations or {})
        possible, settled = self._survey(solver, rules, held)
        return {"spec": spec, "buildable": True, "possible": possible, "settled": settled}

    def _built_sel(self) -> dict[tuple[str, str], z3.BoolRef]:
        self._built()
        return self._sel

    def _why_unsat(self, spec: str) -> dict[str, list[str]]:
        """The smallest set of rules and assumptions that cannot hold together."""
        solver = self._built()
        rules, variables = self._read_core(
            solver, [*self._rule_lit.values(), *self._assumption_literals(spec)], []
        )
        return {"rules": rules, "variables": variables}

    def _recompute(self, spec: str) -> dict[str, Any]:
        """Which options survive, which variables are settled, and by which rules.

        Two passes, and the shape of them is the difference between a
        configurator that answers in milliseconds and one that does not.

        The first enumerates models rather than testing pairs.  Asking "can
        this variable still be this option" once per pair costs one solver call
        per pair — about a hundred and fifty here.  Asking instead for any
        model that selects a pair nobody has seen yet retires a whole
        assignment's worth of pairs per call, and stops when none are left.

        The second runs only over the variables that came out settled, and
        asks one question of each: is the opposite unsatisfiable, and if so on
        whose authority.  The core of that check is `owing` — the rules that
        make the value necessary, which is what the interface prints next to it.
        """
        solver = self._built()
        rules = list(self._rule_lit.values())
        assumptions, honoured = self._honoured(
            solver, rules, self._assumption_literals(spec), self._inclined.get(spec, {})
        )

        ordered, settled = self._survey(solver, rules, assumptions)
        asked = self._assumed.get(spec, {})
        owing: dict[str, list[str]] = {}
        following: dict[str, list[str]] = {}
        for variable, option in settled.items():
            if variable in asked or variable in honoured:
                # Settled because you said so, firmly or as a preference the
                # rules could honour, not because a rule said so.
                continue
            literal = self._sel[(variable, option)]
            # The same core, both halves: the rules that force the value and
            # the assumptions it rests on.
            blamed, rests = self._read_core(
                solver, [*rules, *assumptions], [z3.Not(literal)], exclude=variable
            )
            if blamed:
                owing[variable] = blamed
                following[variable] = rests

        self._possible[spec] = ordered
        self._settled[spec] = settled
        self._owing[spec] = owing
        self._following[spec] = following
        return {
            "spec": spec,
            "possible": ordered,
            "settled": settled,
            "owing": owing,
            "following": following,
        }
