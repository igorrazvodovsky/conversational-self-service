# Naming

A domain [concept](../method/concept.md) of the elevator configurator. The
one [§8](../conceptual-model.md#what-is-wrong-with-this-one) called for under
*one specification, no name*, built on 2026-09-11 because a quote has to say
what job it is for.

```
concept Naming [Item]

purpose
  to give an item a title and a place that a person will
  recognise it by

state
  title: Item -> string
  site:  Item -> string

actions
  entitle [ item: Item ; title: string ; site: string ]
    => [ item: Item ]
    record the title and the site given, replacing either
    that was recorded before, and leave one not given as it was

operational principle
  after entitle [ item: s ; title: "Riverside clinic, bed lift" ;
                  site: "Kaai 14, 3000 Leuven" ] => [ item: s ]
  then title of s is "Riverside clinic, bed lift"
  and site of s is "Kaai 14, 3000 Leuven"
```

## Why the action is not called `name`

It should be, and the engine will not have it. Every concept carries `name`
as the attribute the engine registers it under, and an action is dispatched
by `getattr(concept, action)`, so `Naming/name` would return the string
`"Naming"` and call it. The engine is not edited for a naming clash — MSM
§5.2.4 — and unlike `assert`, which Python reserves and `wiring.py` aliases
after discovery, this one cannot be aliased because the attribute is in use.
So the action is `entitle`, which is what it does, and this paragraph is the
record that the name was the engine's choice and not the concept's.

## Why a site is here and not in Profiling

A customer can order lifts for several buildings and a building can be served
by several lifts. The place a specification is for is a fact of that
specification, and it goes on the proposal beside the title: *one passenger
lift at Kaai 14*. [Profiling](profiling.md) holds the address a party is
written to, which is a different address more often than not.

## What this is not

_The site's conditions._ The case's `Situating` holds the facts of the
situation the outcome must fit — rise, stops, power available — with how
firmly each is known. Here those are still variables of the specification.
This concept holds a title and a line of address, and nothing that constrains
anything.

_A version._ One specification still, and the name makes it findable, not
comparable. `Revising` stays on the horizon.

## See also

- [Profiling](profiling.md) — who, as against what and where
- [Quoting](quoting.md) — the offer that carries the name
