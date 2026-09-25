# Asserting

```
concept Asserting [Spec, Variable, Option, Party]

purpose
  to keep what each party has asserted of a specification on record,
  as asserted, until it is withdrawn

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
