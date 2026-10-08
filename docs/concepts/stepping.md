# Stepping

```
concept Stepping [Spec, Variable, Party]

purpose
  to show a person where they are in a recurring piece of work, what the
  step they are at still needs and who owns it, without preventing them
  from acting out of order

state
  templates:  seq Template
  called:     Template -> string
  wants:      Template -> set Variable
  covers:     Template -> set Variable
  usually:    Template -> Party
  steps:      Spec -> seq Step
  instanceOf: Step -> Template
  name:       Step -> string
  needs:      Step -> set Variable
  about:      Step -> set Variable
  owner:      Step -> Party
  status:     Step -> ("open" | "finished" | "skipped")
  at:         Spec -> Step
  deviation:  Step -> seq [ kind: string ; text: string ]

actions
  author [ template: Template ; name: string ; needs: set Variable ;
           covers: set Variable ; owner: Party ]
    => [ template: Template ]
    append the template to those authored, with the name a person
    would call the step by, what a step of it needs, the variables it
    is about, and who usually owns one; a template already authored
    is replaced in place

  instantiate [ spec: Spec ]
    => [ spec: Spec ; steps: seq Step ]
    give the spec one open step per template, in the templates' order,
    each named, needing, about and owned as its template says, with
    the spec at none of them

  instantiate [ spec: Spec ]
    => [ error: string ]
    if the spec already has steps
    return the error description

  abandon [ spec: Spec ]
    => [ spec: Spec ]
    remove the spec's steps, and where it was at

  take [ party: Party ; spec: Spec ; step: Step ]
    => [ spec: Spec ; step: Step ; party: Party ]
    record the spec as at the step, in place of wherever it was;
    the step's status is not changed, and no other step's is

  take [ party: Party ; spec: Spec ; step: Step ]
    => [ error: string ]
    if the step is not one of the spec's
    return the error description

  finish [ party: Party ; step: Step ]
    => [ step: Step ; spec: Spec ; party: Party ]
    record the step as finished, whether or not its needs are met

  finish [ party: Party ; step: Step ]
    => [ error: string ]
    if there is no such step
    return the error description

  skip [ party: Party ; step: Step ; reason: string ]
    => [ step: Step ; spec: Spec ; party: Party ]
    record the step as skipped, and the reason as a deviation

  skip [ party: Party ; step: Step ; reason: string ]
    => [ error: string ]
    if there is no such step
    return the error description

  reopen [ party: Party ; step: Step ]
    => [ step: Step ; spec: Spec ; party: Party ]
    record the step as open again

  reopen [ party: Party ; step: Step ]
    => [ error: string ]
    if there is no such step, or it is open
    return the error description

  reassign [ party: Party ; step: Step ; owner: Party ]
    => [ step: Step ; spec: Spec ; owner: Party ; formerly: Party ]
    record the owner in place of the old one, and return who that was

  reassign [ party: Party ; step: Step ; owner: Party ]
    => [ error: string ]
    if there is no such step
    return the error description

  rename [ party: Party ; step: Step ; name: string ]
    => [ step: Step ; spec: Spec ; formerly: string ]
    replace the step's name, keeping the old one as a deviation,
    and return it

  rename [ party: Party ; step: Step ; name: string ]
    => [ error: string ]
    if there is no such step, or the name is empty
    return the error description

  add [ party: Party ; spec: Spec ; name: string ; step: Step ]
    => [ step: Step ; spec: Spec ]
    append an open step of no template to the spec's steps, needing
    nothing, about nothing and owned by the party, and record its
    addition as a deviation

  add [ party: Party ; spec: Spec ; name: string ; step: Step ]
    => [ error: string ]
    if the spec has no steps, the name is empty, or the step exists
    return the error description

operational principle
  after author [ template: t1 ; name: "The building" ; needs: {building_type, region} ;
                 covers: {building_type, region, installation, accessibility} ; owner: person ]
    => [ template: t1 ]
  and author [ template: t2 ; name: "The journey" ; needs: {stops, travel} ;
               covers: {stops, travel, rated_speed} ; owner: person ]
    => [ template: t2 ]
  and instantiate [ spec: s ] => [ spec: s ; steps: [a, b] ]
  then name of a is "The building", needs of a is {building_type, region},
    about of a is {building_type, region, installation, accessibility},
    owner of a is person, status of a is "open", and s is at no step
  and after take [ party: p ; spec: s ; step: b ] => [ spec: s ; step: b ; party: p ]
  then at of s is b, and status of a is still "open"
  and after skip [ party: p ; step: a ; reason: "the site is not settled" ]
    => [ step: a ; spec: s ; party: p ]
  then status of a is "skipped"
  and deviation of a is [ [ kind: "skip" ; text: "the site is not settled" ] ]
  and after finish [ party: p ; step: b ] => [ step: b ; spec: s ; party: p ]
  then status of b is "finished", and at of s is still b
  and after rename [ party: p ; step: b ; name: "Floors" ]
    => [ step: b ; spec: s ; formerly: "The journey" ]
  then name of b is "Floors", and called of t2 is still "The journey"
  and after instantiate [ spec: s ] => [ error: e ]
  and abandon [ spec: s ] => [ spec: s ]
  then s has no steps
```
