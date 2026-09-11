# Fact

One of the four phenomena of the ontology. See [the ontology](README.md).

> A fact is an assertion about a single individual, or about a relationship between individuals (or between an individual and a value).
>
> — MSM §4.1

Facts are how everything other than identity gets said. An [individual](individual.md) has no attributes; `username(user1, 'alice')` is a fact relating an individual to a [value](value.md), and `registered(user1)` is a fact about an individual alone.

[Actions](action.md) are contingent on facts and their effect is to add new facts and remove old ones. In a [concept](concept.md) specification the facts appear as the `state` section, written as relations in Alloy style: `password: U -> string`.

Facts follow the actions into concepts. The same individual can bear facts owned by many different concepts, and that is the point — it is what lets `Authenticating` hold a username while `UserDisplaying` holds a bio, without either concept knowing about the other.

In code, MSM §5.2 maps facts to relations: "canonically in relational databases, normalized into a triple-store, or rendered into trees in a document store with manual management of invariants."

## In this repository

Facts, as relations, in every concept. The shape MSM §5.2 asks for —
"canonically in relational databases, normalized into a triple-store" — is here
kept as dictionaries keyed by individual, which is the same relation with a
cheaper implementation.

```
offers   (Variable, Option)          Cataloguing
label    (Option, String)            Cataloguing
capital  (Option, Money)             Pricing
embodied (Option, Mass)              Footprinting
range    (Variable, Option)          Constraining
because  (Rule, String)              Constraining
asserted (Spec, Variable, Option)    Asserting
assumed  (Spec, Variable, Option)    Constraining
```

Three things are visible in that list that a record could not have shown.

_The same individual bears facts owned by four concepts._ `rated_load:kg1000`
appears in `Cataloguing`, `Pricing`, `Footprinting` and `Constraining`, and
none of them owns it. That is the asymmetry the method rests on: actions are
partitioned among concepts, individuals are not. The
[source file](../concepts/cataloguing.md#the-record-in-elevatorjson-is-three-concepts-facts-in-one-object)
bundles all four into one JSON object, and splitting it on load is the whole of
what the seeding step does.

_`required` and `assumed` are two relations, not one._ They relate the same
three things and mean different acts — what a person asked for, and what the
rules could accommodate. Their difference is a set the interface renders
directly: *you asked for this and cannot have it*. A record with one
`value` field per variable has nowhere to put that set, which is why almost no
configurator shows it.

_A three-place relation stays three-place._ `demand: (Class, Usage, Travel) ->
Energy` is not separable into three factors, and writing it as three would
assert an independence the physics does not have. See
[Footprinting](../concepts/footprinting.md#why-demand-is-a-three-place-relation).

_And one state declaration depends on no other's._ WYSIWID §7.2's second design
rule, satisfied by construction: each concept in `agent/concepts/` holds its own
dictionaries and imports nothing from its neighbours. The CopilotKit starter
violates it at the type level, with `class AgentState(BaseAgentState)` putting
the task list in the same object as the conversation.

## See also

- [Individual](individual.md) — what facts are asserted about
- [Action](action.md) — what adds and removes facts
- [Concept](concept.md) — facts follow their actions into a concept
- [Objects](objects.md) — the full argument for relations over attributes
