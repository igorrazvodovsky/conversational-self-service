# Specifying

```
concept Specifying [Spec, Party]

purpose
  to hold what a party requires, in their own words, as separate
  clauses each of which can be reworded, relaxed, struck, or
  deliberately left open

state
  open:          set Spec
  clauses:       Spec -> seq Clause
  text:          Clause -> string
  statedBy:      Clause -> Party
  negotiability: Clause -> ("fixed" | "negotiable" | "open")
  formerly:      Clause -> seq string

actions
  open [ spec: Spec ]
    => [ spec: Spec ]
    add the spec to those open, with no clauses

  require [ spec: Spec ; party: Party ; text: string ; clause: Clause ]
    => [ clause: Clause ; spec: Spec ; party: Party ]
    append the clause to the spec's sequence, carrying the text
    in the party's words and who stated it, and meant as fixed
    until settled otherwise

  require [ spec: Spec ; party: Party ; text: string ; clause: Clause ]
    => [ error: string ]
    if the spec is not open, the text is empty,
    or the clause is already in a spec
    return the error description

  adopt [ clause: Clause ; party: Party ]
    => [ clause: Clause ; spec: Spec ; party: Party ; formerly: Party ]
    record the party as having stated the clause, in place of
    whoever stated it before, and return who that was

  adopt [ clause: Clause ; party: Party ]
    => [ error: string ]
    if there is no such clause, or the party stated it already
    return the error description

  reword [ clause: Clause ; text: string ]
    => [ clause: Clause ; spec: Spec ]
    replace the clause's text with the new wording, as a correction:
    what it formerly said is not kept

  reword [ clause: Clause ; text: string ]
    => [ error: string ]
    if there is no such clause, or the text is empty
    return the error description

  move [ clause: Clause ; before: Clause ]
    => [ clause: Clause ; spec: Spec ]
    place the clause immediately before the other in its spec's sequence,
    or last when no other is given

  move [ clause: Clause ; before: Clause ]
    => [ error: string ]
    if there is no such clause, or the other is not a clause of the same spec
    return the error description

  settle [ clause: Clause ; negotiability: string ]
    => [ clause: Clause ; spec: Spec ]
    record how firmly the clause is meant, replacing what was recorded

  settle [ clause: Clause ; negotiability: string ]
    => [ error: string ]
    if there is no such clause, or the negotiability is not one of the three
    return the error description

  relax [ clause: Clause ; text: string ]
    => [ clause: Clause ; spec: Spec ; formerly: string ]
    replace the clause's text with the new wording, keeping the old
    wording in the record of what it formerly said,
    and return the wording given up

  relax [ clause: Clause ; text: string ]
    => [ error: string ]
    if there is no such clause, or it is not negotiable,
    or the text is empty
    return the error description

  strike [ clause: Clause ]
    => [ clause: Clause ; spec: Spec ]
    remove the clause from its spec's sequence

  strike [ clause: Clause ]
    => [ error: string ]
    if there is no such clause
    return the error description

  close [ spec: Spec ]
    => [ spec: Spec ]
    remove the spec from those open, with every clause of it

operational principle
  after open [ spec: s ] => [ spec: s ]
  and require [ spec: s ; party: p ; text: "a bed must fit, with a porter" ; clause: c ]
    => [ clause: c ; spec: s ; party: p ]
  then c is last in clauses of s
  and text of c is "a bed must fit, with a porter"
  and statedBy of c is p
  and negotiability of c is "fixed"
  and relax [ clause: c ; text: "a bed must fit" ] => [ error: e ]
  and after settle [ clause: c ; negotiability: "negotiable" ] => [ clause: c ]
  and relax [ clause: c ; text: "a bed must fit" ]
    => [ clause: c ; spec: s ; formerly: "a bed must fit, with a porter" ]
  then text of c is "a bed must fit"
  and formerly of c is ["a bed must fit, with a porter"]
  and after reword [ clause: c ; text: "a bed must fit, lengthways" ] => [ clause: c ; spec: s ]
  then text of c is "a bed must fit, lengthways"
  and formerly of c is still ["a bed must fit, with a porter"]
  and after require [ spec: s ; party: m ; text: "1.6 m/s" ; clause: d ]
    => [ clause: d ; spec: s ; party: m ]
  then statedBy of d is m
  and after adopt [ clause: d ; party: p ]
    => [ clause: d ; spec: s ; party: p ; formerly: m ]
  then statedBy of d is p
  and adopt [ clause: d ; party: p ] => [ error: e ]
  and move [ clause: d ; before: c ] => [ clause: d ; spec: s ]
  then clauses of s is [d, c]
  and after strike [ clause: c ] => [ clause: c ; spec: s ]
  then clauses of s is [d]
```
