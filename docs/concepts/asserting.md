# Asserting

A domain [concept](../method/concept.md) of the elevator configurator. Until
2026-09-08 this concept was called `Specifying`; the name moved because the
case's catalogue already has a `Specifying` that holds the opposite thing — a
requirement in the *buyer's* words, a clause — and this concept holds a value
in the *model's*. See [Against the case's catalogue](../conceptual-model.md#9-against-the-cases-catalogue).

```
concept Asserting [Spec, Variable, Option, Party]

purpose
  to hold what a party asserted of a specification apart from what
  its rules entailed

state
  open:       set Spec
  asserted:   Spec -> Variable -> Option
  assertedBy: Spec -> Variable -> Party

actions
  start [ spec: Spec ]
    => [ spec: Spec ]
    add the spec to those open
    with nothing asserted

  assert [ spec: Spec ; variable: Variable ; option: Option ; party: Party ]
    => [ spec: Spec ; variable: Variable ; option: Option ]
    record the option as asserted for the variable, and by whom,
    replacing any option previously asserted for it

  assert [ spec: Spec ; variable: Variable ; option: Option ; party: Party ]
    => [ error: string ]
    if the spec is not open
    return the error description

  withdraw [ spec: Spec ; variable: Variable ]
    => [ spec: Spec ; variable: Variable ; option: Option ]
    remove whatever was asserted for the variable
    return the option that was withdrawn

  withdraw [ spec: Spec ; variable: Variable ]
    => [ error: string ]
    if nothing was asserted for the variable
    return the error description

  discard [ spec: Spec ]
    => [ spec: Spec ]
    remove the spec from those open,
    with everything asserted of it

operational principle
  after start [ spec: s ] => [ spec: s ]
  and assert [ spec: s ; variable: building_type ; option: hospital ; party: p ]
    => [ spec: s ; variable: building_type ; option: hospital ]
  then asserted of s maps building_type to hospital
  and assertedBy of s maps building_type to p
  and after withdraw [ spec: s ; variable: building_type ]
    => [ spec: s ; variable: building_type ; option: hospital ]
  then asserted of s maps building_type to nothing
  and withdraw [ spec: s ; variable: building_type ] => [ error: e ]
```

## Why this is separate from Constraining

This is the design's central claim, and it is the repair of the failure the
starter exhibited.

A configurator has two kinds of assignment in it, and they mean opposite
things. _This is a hospital_ is something a person asserted. _The car is
1400 × 2400 mm_ is something R15 concluded. Almost every configurator on the
market stores them in one field. The person then watches values change under
their cursor with no way to tell which ones they chose, which ones the machine
chose for them, and which of their own earlier requests were quietly overruled.

That is [conflation](../method/misalignment.md#conflation) in MSM §5.1.1's exact
sense: the action a user wants to perform — *retract the thing I asked for*,
as distinct from *overwrite whatever is in that slot* — does not exist, because
the two assignments are the same assignment.

Keeping them apart makes both actions available and makes the log answer the
question. `Asserting` holds only assertions a party made. What follows from
them lives in [Constraining](constraining.md), which never writes here. The
one direction of travel between them is a
[synchronization](../syncs/README.md#assertions-reach-the-solver).

The consequence worth stating: an assertion stays on record even when it
cannot be met. Asking for a hospital lift and a 630 kg car records both, and
the conflict is reported rather than resolved by the last write winning. Which
assertion gives way is a question for the person, put to them through
[Deciding](deciding.md).

The case's catalogue reached the same distinction from the other side. Its
`Configuring.holds` — the existing product, read from the sources — is one
relation for a value a party `set` and a value `solve` filled in, and the
catalogue had folded the assertion into `Binding` as if a committed value only
made sense once it answered a clause. This concept is now in the catalogue
under this name, on the product side of the seam, depending on `Configuring`
and on nothing else.

## What this concept is not

_A clause._ `asserted` maps a variable to an option: the assertion is already
in the model's vocabulary. Nothing here says *what the value is for*.
[Specifying](specifying.md) holds that — a requirement in the buyer's words,
with a discipline and a negotiability — and [Binding](binding.md) holds the
relation `answers` between a choice and the clause it satisfies. Both exist
since 2026-09-11, the case's slice 1, and this concept now holds the
attribute-level assertion that a person's pick produces on its way to the
solver, by [one rule](../syncs/binding.md#the-person-maps). An assertion made
with no clause behind it — by the slice 0 gesture, or by the model — is still
recorded here exactly as before, and the canvas says it answers nothing, which
is the control inside the same build.

_Who decided, as state._ `assertedBy` records the party at the grain of the
assertion — the person, or the model on the person's behalf. The three
sentences on the canvas (*you asked for this*, *the assistant asked for this*,
*adopted from a proposal*) are still read off provenance edges, because they
name the *rule* and not only the party, and a rule is what the log holds.

## Why `prefer` left the specification

The previous specification had `prefer` beside `require`: a soft assertion,
honoured where it can be and dropped where it cannot. It is not here. In the
case's catalogue, hard-or-soft is a fact of the *clause* — `negotiability`,
fixed, negotiable or left open — and reaches the solver through the mapping;
an assertion has no strength because it has no clause to carry one. Whether the
real solver accepts a soft constraint at all is a step 1 row in the case's
`Prototype plan`.

## Not in this concept

_Whether the option exists._ `Variable` and `Option` are type parameters and
[cannot be constrained](../method/concept.md), so `Asserting` cannot check an
option against a catalogue and does not try. A person may ask for something
that was delisted last week; the request is recorded and
[Constraining](constraining.md) reports it as unsatisfiable. Validation here
would be a state read across a concept boundary — WYSIWID §7.2's first design
rule — and would make the concept useless for any product but this one.

_A name for the specification._ Not modelled. There is one specification per
session and it is not saved, compared or shared. See
[the deliberate exclusions](README.md#not-concepts).

## One name the language would not let us have

Python reserves `assert`, so `agent/concepts/asserting.py` defines `assert_`
and `agent/wiring.py` registers the alias after discovery:

```python
setattr(asserting, "assert", asserting.assert_)
```

The engine dispatches with `getattr(concept, action)` and is not edited for a
language keyword — MSM §5.2.4. Every rule invokes `assert`, so the log reads
`Asserting/assert`, which is what the operational principle above says. The
model's tool has the same problem and solves it the same way: the Python
function is `assert_value`, the tool string the rule matches is `assert`, and
neither is the action's name.

## See also

- [Constraining](constraining.md) — what follows from what is recorded here
- [Specifying](specifying.md) and [Binding](binding.md) — what an assertion is for, when it is for anything
- [Deciding](deciding.md) — how a conflict between assertions is settled
- [Misalignment](../method/misalignment.md#conflation) — the failure this separation avoids
- [The synchronizations](../syncs/README.md) — the only path out of this concept
- The case's catalogue: `~/Library/CloudStorage/Dropbox/discovery/Projects/Conversational self-service/Ontology/Concept catalogue/Asserting.md`
