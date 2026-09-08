# Constraining

A domain [concept](../method/concept.md) of the elevator configurator, and the
one the solver lives in.

```
concept Constraining [Spec, Variable, Option, Rule]

purpose
  to limit a specification to combinations that can actually be built

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
  refused:  Spec -> Variable -> set Rule

actions
  offer [ variable: Variable ; option: Option ]
    => [ variable: Variable ]
    add the option to the variable's range
    recompute every specification being tracked

  withhold [ variable: Variable ; option: Option ]
    => [ variable: Variable ; conceding: set Spec ]
    remove the option from the variable's range,
    so that no specification may settle on it again
    remove it from whatever any specification assumed or inclined
    for that variable, and recompute those specifications
    return the specifications that had assumed it

  tabulate [ rule: Rule ; over: seq Variable ; allows: set (seq Option) ; because: string ]
    => [ rule: Rule ]
    record that the variables may only take the listed combinations
    record the sentence that says why

  imply [ rule: Rule ; given: set Condition ; entails: Condition ; because: string ]
    => [ rule: Rule ]
    record that when every given condition holds,
    the entailed condition must hold too
    record the sentence that says why

  consider [ spec: Spec ]
    => [ spec: Spec ; possible: Variable -> set Option ; settled: Variable -> Option ]
    begin tracking the specification with nothing assumed of it
    compute, for every variable, which options remain possible

  assume [ spec: Spec ; variable: Variable ; option: Option ]
    => [ spec: Spec ; possible: Variable -> set Option ; settled: Variable -> Option ]
    record the option as assumed for the variable,
    replacing any option previously assumed or inclined for it
    clear any refusal recorded against the variable
    recompute, for every variable, which options remain possible
    and which are settled to one, and by which rules
    return both

  assume [ spec: Spec ; variable: Variable ; option: Option ]
    => [ error: string ; culprits: set Rule ; conceding: set Variable ]
    if no combination satisfies every rule together with the assumptions
    leave the assumptions as they were
    record against the variable the rules that refused it
    return the smallest set of rules that cannot hold together with them,
    and the variables whose assumptions took part

  incline [ spec: Spec ; variable: Variable ; option: Option ]
    => [ spec: Spec ; possible: Variable -> set Option ; settled: Variable -> Option ]
    record the option as inclined for the variable —
    to be honoured where it can be and dropped where it cannot —
    then recompute as for assume

  release [ spec: Spec ; variable: Variable ]
    => [ spec: Spec ; possible: Variable -> set Option ; settled: Variable -> Option ]
    remove whatever was assumed or inclined for the variable
    clear any refusal recorded against the variable
    then recompute as for assume

  forget [ spec: Spec ]
    => [ spec: Spec ]
    stop tracking the specification,
    with everything assumed, inclined and refused of it

  complete [ spec: Spec ; cost: Option -> number ]
    => [ assignment: Variable -> Option ; cost: number ]
    choose one option for every variable such that every rule holds,
    every assumption is kept, and the summed cost of the chosen options
    is as small as any such choice allows
    change nothing

  complete [ spec: Spec ; cost: Option -> number ]
    => [ error: string ; culprits: set Rule ]
    if no such choice exists
    return the smallest set of rules that rules it out

operational principle
  after offer [ variable: drive ; option: hydraulic ] => [ variable: drive ]
  and imply [ rule: R32 ; given: { usage_profile among {heavy} } ;
              entails: { drive among {gearless_mrl, gearless_mr} } ;
              because: "near-continuous traffic exceeds the hydraulic duty cycle" ]
    => [ rule: R32 ]
  then assume [ spec: s ; variable: usage_profile ; option: heavy ]
    => [ spec: s ; possible: p ; settled: q ]
  and p maps drive to {gearless_mrl, gearless_mr}, which no longer contains hydraulic
  and assume [ spec: s ; variable: drive ; option: hydraulic ]
    => [ error: e ; culprits: {R32} ; conceding: {usage_profile} ]
  and refused of (s, drive) is {R32}
  and after release [ spec: s ; variable: usage_profile ] => [ spec: s ]
  then refused of (s, drive) is empty
```

`consider` earns its place because a specification with nothing asked of it is
not the same as one that does not exist, and the difference is visible: the
first has thirty-five variables showing their full ranges, and something has to
compute that before anybody has clicked anything. It is invoked by
[a rule](../syncs/propagation.md), never by the interface.

A `Condition` is a record `[ variable: Variable ; among: set Option ]`. It is a
value, not an individual: two conditions naming the same variable and the same
options are the same condition.

## Withholding an option is not only a fact about the range

`withhold` used to return `[ variable ]` and say nothing about a specification
that had already assumed the option, which left its promise — *no specification
may settle on it again* — unkept for the one specification where it mattered
most. `possible` and `settled` would also have gone stale, since neither is
recomputed except by an action naming a specification.

So `withhold` gives up the assumptions that named the option and recomputes,
and reports which specifications it did that to. Note what it does *not* do:
nothing reaches [Asserting](asserting.md), so the requirement stays on record
and unmet, exactly as it does when a requirement is refused by a rule. Delisting
an option does not unask for it.

That `conceding` is an output nothing currently carries anywhere is the honest
state of it — the actor who would delist an option
[does not exist in this application](../syncs/gestures.md#what-a-gesture-is-not-allowed-to-be).
It is in the record because a fact the log does not hold is a fact nobody can
act on later.

`offer` recomputes for the same reason in the other direction. At boot it costs
nothing, because the catalogue arrives before any specification does.

## Why `forget` exists

`consider` earns its place because a specification with nothing asked of it is
not the same as one that does not exist. `forget` is the other end of that
sentence, and it exists because [`Asserting/discard`](asserting.md) had
nowhere to go: a discarded specification whose assumptions stayed in the solver
would be neither tracked nor gone.

MSM §5.1.2's asymmetry test — *is there an inverse action, and does it cost
what the original cost?* — is what this answers. `consider` costs one action and
so does `forget`.

## Why a refusal outlives the question it raised

`owing` and `refused` are the same shape and opposite in sense. `owing` names
the rules that made a value necessary; `refused` names the rules that made one
impossible. Both are read straight onto the canvas beside the value they
concern.

`refused` exists because the alternative loses the only thing that made the
conflict legible. The culprits arrive as an output argument of the failing case
of `assume`, get carried to [Deciding](deciding.md) as a question, and — if
nothing recorded them — vanish the moment the person sets that question aside.
The card would then say *on record, and not buildable* with no account of why,
permanently. A second conflict makes it worse: `ask` replaces the pending
question, so the first refusal would never have had a reason at all.

That is the whole claim of this design failing quietly. A requirement that
cannot be met is not a nullity — it is the most important thing on the screen —
and a requirement whose refusal is unexplained is barely better than one that
was silently dropped.

It is cleared when it stops being true: by a successful `assume` on the same
variable, and by `release`. It is *not* cleared by the person declining to
answer, because declining changes nothing about whether the lift can be built.

## Why the explanation is not its own concept

`culprits` is tempting to promote. A concept called `Explaining` would be
reusable, would sound principled, and would be wrong — because it would have no
actions. Nobody performs *explain*. The rules responsible are an output of the
failing case of `assume`, and WYSIWID §5.3 is explicit that this needs no new
machinery: `error` is an ordinary argument name, and a failing case may carry
as many other arguments as it has something to say.

So the culprits ride along with the failure that produced them, and `because`
is state of the concept that owns the rules. Any other arrangement would have
one concept holding a rule and another holding the sentence explaining it.

## Why the ranges are here as well as in the catalogue

`range` and [`Cataloguing`](cataloguing.md)`.offers` hold the same pairs, and
that is not duplication to be factored out. They are facts about the same
`Option` individuals held for different reasons —
[individuals are not partitioned among concepts](../method/individual.md),
which is the whole asymmetry that separates this from object orientation.

`Constraining` needs a range because a variable with no declared range has no
finite domain and nothing to solve over. `Cataloguing` needs one because a
variable with no options has nothing to show. Neither reads the other's copy;
a [synchronization](../syncs/seeding.md) puts an
`offer` behind every `list`. Had `Constraining` read `Cataloguing.offers`
directly it would violate WYSIWID §7.2's first design rule, and
`Constraining` would stop working against any catalogue but this one.

## What the solver is

z3, asserting one Boolean per (variable, option) pair with an exactly-one
constraint per variable, every rule tracked so that `unsat_core` returns rule
identities rather than clauses, and preferences added as soft constraints so a
`complete` that cannot honour all of them drops the cheapest to drop.

`possible` is computed by asking, for each pair, whether the assumptions and
rules can hold with that pair asserted. `settled` is the case where exactly one
survives, and `owing` records which rules were in the core that eliminated the
others.

None of that is in the specification, and it should not be. WYSIWID §4:
specifications are deliberately partial. The concept says what `assume` means;
which decision procedure computes it is exactly the kind of implementation
choice MSM §5.2 calls secondary to the names.

## What settled values are for

The elevator catalogue contains variables that are never a free choice.
`energy_class` is offered as though a person picks it, but R36–R40 determine it
completely from `drive` and `energy_package`; `drive` is fixed by `platform`
under R07; `car_size` is very nearly a function of `rated_load` under R01.

An interface that renders all thirty-six variables as equal choosers is lying
about three of them. `settled` and `owing` are what let it say *this follows,
and here is the rule* instead — and let a person still require an energy class
outright if they want to, and see the platform change underneath it. That
reading of the state is the legibility claim of
[WYSIWID](../method/README.md) demonstrated on something that would otherwise
be opaque.

Note that the catalogue's own `family` grouping — `performance`, `dimensions`,
`platform` — is not this grouping and must not be mistaken for it.
Asked-for, follows-from and still-open is a property of the current state; the
family is a fixed arrangement of the catalogue. See
[Cataloguing](cataloguing.md#the-family-is-not-the-grouping-that-matters).

## See also

- [Asserting](asserting.md) — the requirements that arrive here as assumptions
- [Cataloguing](cataloguing.md) — the other holder of the option ranges
- [Deciding](deciding.md) — where a conflict goes once it is reported
- [The synchronizations](../syncs/README.md) — every path in and out
