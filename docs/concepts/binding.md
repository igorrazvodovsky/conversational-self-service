# Binding

```
concept Binding [Spec, Requirement, Offering, Value, Party]

purpose
  to keep every committed value bound to the requirement it answers,
  so that a value can later be substituted and explained rather than
  merely overwritten

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
            requirement: Requirement ; value: Value ; choice: Choice ]
    => [ choice: Choice ; selection: Selection ;
         requirement: Requirement ; value: Value ; party: Party ]
    append the choice to the selection, holding the value as answering
    the requirement, decided by the party

  propose [ party: Party ; selection: Selection ;
            requirement: Requirement ; value: Value ; choice: Choice ]
    => [ error: string ]
    if there is no such selection, or the choice is already in one
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

  adopt [ choice: Choice ; party: Party ]
    => [ choice: Choice ; selection: Selection ; requirement: Requirement ;
         party: Party ; formerly: Party ]
    record the party as having decided the choice, in place of
    whoever decided it before, and return who that was

  adopt [ choice: Choice ; party: Party ]
    => [ error: string ]
    if there is no such choice in any selection,
    or the party decided it already
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
  and propose [ party: p ; selection: sel ; requirement: c ; value: kg1000 ; choice: ch ]
    => [ choice: ch ; selection: sel ; requirement: c ; value: kg1000 ; party: p ]
  then value of ch is kg1000, answers of ch is c, decidedBy of ch is p
  and after substitute [ party: p ; choice: ch ; value: kg1250 ;
                         reason: "the porter rides with the bed" ]
    => [ choice: ch' ; selection: sel ; requirement: c ; value: kg1250 ;
         party: p ; replaced: ch ]
  then choices of sel holds ch' and not ch
  and answers of ch' is c, replaces of ch' is ch,
      reason of ch' is "the porter rides with the bed"
  and after propose [ party: m ; selection: sel ; requirement: d ; value: hospital ; choice: ch2 ]
    => [ choice: ch2 ; selection: sel ; requirement: d ; value: hospital ; party: m ]
  and adopt [ choice: ch2 ; party: p ]
    => [ choice: ch2 ; selection: sel ; requirement: d ; party: p ; formerly: m ]
  then decidedBy of ch2 is p
  and adopt [ choice: ch2 ; party: p ] => [ error: e ]
  and after retract [ choice: ch' ] => [ choice: ch' ; selection: sel ;
                                         requirement: c ; value: kg1250 ]
  then choices of sel is [ch2]
```
