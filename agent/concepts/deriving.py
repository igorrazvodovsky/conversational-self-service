"""Deriving — to work a quantity out from stated ones by a method a person
can inspect, so that they can see what the number rests on and what was
assumed.

Generated from `docs/concepts/deriving.md`.  Change the behaviour by editing
that specification, not this file (WYSIWID §7.3).

state
  meaning:  Quantity -> string
  unit:     Quantity -> string
  methods:  seq Method
  yields:   Method -> Quantity
  formula:  Method -> string
  needs:    Method -> set Quantity
  presumes: Method -> Quantity -> Real
  method:   Derivation -> Method
  for:      Derivation -> Target
  stated:   Derivation -> Quantity -> Real
  assumed:  Derivation -> Quantity -> Real
  result:   Derivation -> Real

A formula is arithmetic and nothing else: numbers, the quantities the
method needs, the four operations and brackets.  It is parsed, never
executed, so a catalogue cannot put code into it.
"""

from __future__ import annotations

import ast
import math
from typing import Any

_OPERATIONS = {
    ast.Add: lambda a, b: a + b,
    ast.Sub: lambda a, b: a - b,
    ast.Mult: lambda a, b: a * b,
    ast.Div: lambda a, b: a / b,
}


def _names(node: ast.AST) -> set[str] | None:
    """The quantities a formula names, or None when it is not arithmetic."""
    if isinstance(node, ast.Expression):
        return _names(node.body)
    if isinstance(node, ast.Constant) and type(node.value) in (int, float):
        return set()
    if isinstance(node, ast.Name):
        return {node.id}
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub):
        return _names(node.operand)
    if isinstance(node, ast.BinOp) and type(node.op) in _OPERATIONS:
        left, right = _names(node.left), _names(node.right)
        return None if left is None or right is None else left | right
    return None


def _work_out(node: ast.AST, values: dict[str, float]) -> float:
    if isinstance(node, ast.Expression):
        return _work_out(node.body, values)
    if isinstance(node, ast.Constant):
        return float(node.value)
    if isinstance(node, ast.Name):
        return values[node.id]
    if isinstance(node, ast.UnaryOp):
        return -_work_out(node.operand, values)
    assert isinstance(node, ast.BinOp)
    return _OPERATIONS[type(node.op)](
        _work_out(node.left, values), _work_out(node.right, values)
    )


def _parse(formula: str) -> ast.Expression | None:
    try:
        return ast.parse(formula, mode="eval")
    except SyntaxError:
        return None


def _finite(value: Any) -> bool:
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(value)
    )


def _number(value: float) -> float | int:
    """A whole result reads as a count, not as 6.0."""
    return int(value) if float(value).is_integer() else value


class Deriving:
    name = "Deriving"

    def __init__(self) -> None:
        self._meaning: dict[str, str] = {}
        self._unit: dict[str, str] = {}
        self._methods: list[str] = []
        self._yields: dict[str, str] = {}
        self._formula: dict[str, str] = {}
        self._needs: dict[str, list[str]] = {}
        self._presumes: dict[str, dict[str, float]] = {}
        self._method: dict[str, str] = {}
        self._for: dict[str, Any] = {}
        self._stated: dict[str, dict[str, float]] = {}
        self._assumed: dict[str, dict[str, float]] = {}
        self._result: dict[str, float] = {}

    def state(self) -> dict[str, Any]:
        return {
            "meaning": dict(self._meaning),
            "unit": dict(self._unit),
            "methods": list(self._methods),
            "yields": dict(self._yields),
            "formula": dict(self._formula),
            "needs": {m: list(q) for m, q in self._needs.items()},
            "presumes": {m: dict(p) for m, p in self._presumes.items()},
            "method": dict(self._method),
            "for": dict(self._for),
            "stated": {d: dict(v) for d, v in self._stated.items()},
            "assumed": {d: dict(v) for d, v in self._assumed.items()},
            "result": dict(self._result),
        }

    # -- actions ------------------------------------------------------------

    def describe(self, quantity: str, meaning: str, unit: str = "") -> dict[str, Any]:
        self._meaning[quantity] = meaning
        self._unit[quantity] = unit
        return {"quantity": quantity}

    def define(
        self,
        method: str,
        yields: str,
        formula: str,
        needs: list[str],
        presumes: dict[str, float] | None = None,
    ) -> dict[str, Any]:
        presumes = dict(presumes or {})
        if method in self._formula:
            return {"error": f"{method} is defined already"}
        parsed = _parse(formula)
        named = _names(parsed) if parsed is not None else None
        if named is None or not named <= set(needs):
            return {
                "error": f"{method}'s formula is not arithmetic over the quantities it needs"
            }
        stray = sorted(set(presumes) - set(needs))
        if stray:
            return {"error": f"{method} presumes {', '.join(stray)}, which it does not need"}
        if not all(_finite(v) for v in presumes.values()):
            return {"error": f"{method} presumes a value that is not a finite number"}
        self._methods.append(method)
        self._yields[method] = yields
        self._formula[method] = formula
        self._needs[method] = list(dict.fromkeys(needs))
        self._presumes[method] = presumes
        return {"method": method}

    def derive(
        self,
        method: str,
        stated: dict[str, float],
        derivation: str,
        **target: Any,
    ) -> dict[str, Any]:
        # `for` is a Python keyword, so the target arrives by its name in
        # the keyword arguments.
        for_ = target.get("for")
        if method not in self._formula:
            return {"error": f"{method} is not defined"}
        if derivation in self._method:
            return {"error": f"{derivation} exists already"}
        stated = dict(stated or {})
        used: dict[str, float] = {}
        assumed: dict[str, float] = {}
        for quantity in self._needs[method]:
            if quantity in stated:
                used[quantity] = stated[quantity]
            elif quantity in self._presumes[method]:
                assumed[quantity] = self._presumes[method][quantity]
            else:
                return {"error": f"{method} needs {quantity}, which is neither stated nor presumed"}
        if not all(_finite(v) for v in used.values()):
            return {"error": "a stated value is not a finite number"}
        try:
            result = _work_out(_parse(self._formula[method]), {**assumed, **used})
        except ZeroDivisionError:
            return {"error": f"{method} does not come out to a number"}
        if not math.isfinite(result):
            return {"error": f"{method} does not come out to a number"}
        # To two decimal places, as the specification says: 4.1 × 3 is 12.3,
        # not 12.299999999999999, and a range's edge is not crossed by a
        # float's error.
        result = _number(round(result, 2))
        self._method[derivation] = method
        self._for[derivation] = for_
        self._stated[derivation] = used
        self._assumed[derivation] = assumed
        self._result[derivation] = result
        return {
            "derivation": derivation,
            "method": method,
            "for": for_,
            "yields": self._yields[method],
            "result": result,
            "stated": dict(used),
            "assumed": dict(assumed),
        }
