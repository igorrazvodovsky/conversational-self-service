# Binding

A domain [concept](../method/concept.md) of the elevator configurator, taken
from the case's catalogue, where it is the *defining* concept — the node the
product's purpose hangs on.

```
concept Binding [Spec, Requirement, Offering, Value, Party]

purpose
  to keep every committed value bound to the requirement it answers,
  so that a value can later be substituted, explained and attributed
  rather than merely overwritten

state
  selections: set Selection
  for:        Selection -> Spec
  against:    Selection -> Offering
  choices:    Selection -> seq Choice
  value:      Choice -> Value
  answers:    Choice -> Requirement
  decidedBy:  Choice -> Party
  replaces:   Choice -> Choice
  reason:     Choice -> string

actions
  begin [ spec: Spec ; offering: Offering ]
    => [ selection: Selection ; spec: Spec ]
    add a selection for the spec against the offering, with no choices

  propose [ party: Party ; selection: Selection ;
            requirement: Requirement ; value: Value ]
    => [ choice: Choice ; selection: Selection ;
         requirement: Requirement ; value: Value ; party: Party ]
    append a choice to the selection, holding the value as answering
    the requirement, decided by the party

  propose [ party: Party ; selection: Selection ;
            requirement: Requirement ; value: Value ]
    => [ error: string ]
    if there is no such selection
    return the error description

  substitute [ party: Party ; choice: Choice ; value: Value ; reason: string ]
    => [ choice: Choice ; selection: Selection ; requirement: Requirement ;
         value: Value ; party: Party ; replaced: Choice ]
    append a new choice to the same selection, holding the new value
    as answering the same requirement, decided by the party, recording
    which choice it replaces and the reason; remove the replaced choice
    from the selection's sequence

  substitute [ party: Party ; choice: Choice ; value: Value ; reason: string ]
    => [ error: string ]
    if there is no such choice in any selection
    return the error description

  retract [ choice: Choice ]
    => [ choice: Choice ; selection: Selection ;
         requirement: Requirement ; value: Value ]
    remove the choice from its selection's sequence,
    returning what it held

  retract [ choice: Choice ]
    => [ error: string ]
    if there is no such choice in any selection
    return the error description

  abandon [ selection: Selection ]
    => [ selection: Selection ]
    remove the selection, with every choice in it

operational principle
  after begin [ spec: s ; offering: o ] => [ selection: sel ; spec: s ]
  and propose [ party: p ; selection: sel ; requirement: c ; value: kg1000 ]
    => [ choice: ch ; selection: sel ; requirement: c ; value: kg1000 ; party: p ]
  then value of ch is kg1000, answers of ch is c, decidedBy of ch is p
  and after substitute [ party: p ; choice: ch ; value: kg1250 ;
                         reason: "the porter rides with the bed" ]
    => [ choice: ch' ; selection: sel ; requirement: c ; value: kg1250 ;
         party: p ; replaced: ch ]
  then choices of sel holds ch' and not ch
  and answers of ch' is c, replaces of ch' is ch,
      reason of ch' is "the porter rides with the bed"
  and after retract [ choice: ch' ] => [ choice: ch' ; selection: sel ;
                                         requirement: c ; value: kg1250 ]
  then choices of sel is empty
```

## The value is the option, and that is a finding

`Value` is a type parameter and the concept cannot constrain it. The
[rule that proposes](../syncs/binding.md#a-person-answers-a-clause) instantiates
it here with a catalogue option's identity — `rated_load:kg1000` — because the
person picks an option from the canvas to answer a clause, and an option is
what they picked.

This means the mapping from choice to attribute is the identity function, and
no `Mapping` concept is needed to carry a choice into
[Asserting](asserting.md): the rule reads which variable offers the option and
asserts it. That is the case's slice 1 as the `Prototype plan` describes it —
*mapping is done by the person, not the machine* — and it is also the plan's
first pre-registered prediction made visible: a choice whose value is already
in the model's vocabulary is a restatement of the value, and `answers` is
carrying the whole distance between the two vocabularies on its own. Whether
that distance is worth a relation is what the slice measures, and the
[ledger read](../syncs/binding.md#the-ledger-is-a-read) is the instrument.

## Why `substitute` keeps the requirement and records the reason

The purpose says *substituted, explained and attributed rather than merely
overwritten*, and `substitute` is where that is kept. A new value for the same
clause is a new choice, pointing at the same requirement, with `replaces` to
the choice it displaced and `reason` in the party's words. The old choice
leaves the selection's sequence — the sequence is what is *current* — and stays
reachable through `replaces`, so a reader can ask of any value what it
replaced and why.

The catalogue's `substitute` also ensures `affects`, the set of other
requirements a substitution touched. It is not here: what a changed value
affects is a consequence the solver computes, and reading it back into a
choice would be a rule from [Constraining](constraining.md) into this concept
that no slice has asked for yet.

## Why there is a `retract`

MSM §5.1.2's asymmetry test again. `propose` puts a choice in a selection;
`substitute` replaces one; without `retract` nothing takes one out. The
catalogue has no such action, and the case is offered it as *grounded in the
job*: a buyer who withdraws a value has withdrawn the answer too, and a
concept that could not say so would show a clause answered by a value nobody
holds.

Three [rules](../syncs/binding.md#what-takes-a-choice-away) invoke it, and
they are all consequences: the value was withdrawn, the value was overwritten,
or the clause was struck. No gesture reaches `retract` directly, because a
person taking a value back does it on the value, and what that does to the
choice is the rule's business.

## Not in this concept

_Whether the value is in the offering._ `Value` and `Offering` are type
parameters. A choice may hold an option the catalogue has delisted; the
concept records it, and whether it can be asserted is a question for the rule
that carries it on.

_Which attributes a choice sets._ That is `Mapping.realises`, and here it is
the identity — see above. The relation is not held, because a relation whose
value is always the key is a column that says nothing.

_Whether a choice is confirmed._ The catalogue spreads a choice across four
concepts — `Binding` for what it answers, `Suggesting` for whether a party has
accepted it, `Staling` for whether its basis has moved, `Mapping` for which
attributes it realises. Here every choice is a person's own and needs no
confirming, so only the first is built. A choice proposed by the model would
need the second, and there is [no rule](../syncs/conduct.md) by which the
model proposes one.

_Two selections against two offerings._ `against` is held because the
catalogue holds it and a second offering is one rule away, but there is one
catalogue here and every selection is against it.

## See also

- [Specifying](specifying.md) — what a choice answers
- [Asserting](asserting.md) — what a choice becomes on the way to the solver
- [The binding rules](../syncs/binding.md) — the only paths in and out
- [Deciding](deciding.md) — what the case's `Suggesting` is here, and why a choice does not pass through it
- The case's catalogue: `~/Library/CloudStorage/Dropbox/discovery/Projects/Conversational self-service/Ontology/Concept catalogue/Binding.md`
