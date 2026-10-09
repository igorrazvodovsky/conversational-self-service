# Situating

```
concept Situating [Situation, Party, Fact, Value]

purpose
  to hold the facts of the situation that the outcome must fit and
  cannot trade, with how firmly each is known and who it comes from

state
  facts:      set Fact
  meaning:    Fact -> string
  givens:     Situation -> set Given
  of:         Given -> Fact
  is:         Given -> Value
  certainty:  Given -> ("estimated" | "measured")
  recordedBy: Given -> Party

actions
  describe [ fact: Fact ; meaning: string ]
    => [ fact: Fact ]
    add the fact to those a situation can have, recording what it is
    in words a person reads it by

  record [ situation: Situation ; party: Party ; fact: Fact ;
           value: Value ; given: Given ]
    => [ given: Given ; situation: Situation ; fact: Fact ;
         value: Value ; party: Party ; replaced: Given ]
    hold the value as the situation's given of the fact, estimated,
    recorded by the party; a given the situation already held of
    that fact leaves it, and is returned as replaced, which may be none

  record [ situation: Situation ; party: Party ; fact: Fact ;
           value: Value ; given: Given ]
    => [ error: string ]
    if the fact is not described, or the given exists already
    return the error description

  survey [ party: Party ; given: Given ; value: Value ]
    => [ given: Given ; situation: Situation ; fact: Fact ;
         value: Value ; was: Value ; party: Party ]
    replace the given's value with the one the party measured,
    record it as measured and as coming from the party,
    and return the value it replaced

  survey [ party: Party ; given: Given ; value: Value ]
    => [ error: string ]
    if there is no such given
    return the error description

  strike [ given: Given ]
    => [ given: Given ; situation: Situation ; fact: Fact ; value: Value ]
    remove the given from its situation

  strike [ given: Given ]
    => [ error: string ]
    if there is no such given
    return the error description

operational principle
  after describe [ fact: storey_height ; meaning: "floor-to-floor height" ]
    => [ fact: storey_height ]
  and record [ situation: s ; party: model ; fact: storey_height ;
               value: 3.5 ; given: g ]
    => [ given: g ; situation: s ; fact: storey_height ; value: 3.5 ;
         party: model ; replaced: none ]
  then g is in givens of s, is of g is 3.5,
       certainty of g is estimated and recordedBy of g is model
  and after survey [ party: person ; given: g ; value: 4.2 ]
    => [ given: g ; situation: s ; fact: storey_height ; value: 4.2 ;
         was: 3.5 ; party: person ]
  then is of g is 4.2, certainty of g is measured
       and recordedBy of g is person
  and after record [ situation: s ; party: person ; fact: storey_height ;
                     value: 3.8 ; given: g' ]
    => [ given: g' ; situation: s ; fact: storey_height ; value: 3.8 ;
         party: person ; replaced: g ]
  then g is not in givens of s, g' is,
       and certainty of g' is estimated
  and after strike [ given: g' ]
    => [ given: g' ; situation: s ; fact: storey_height ; value: 3.8 ]
  then no given of s is of storey_height
  and survey [ party: person ; given: g' ; value: 4 ] => [ error: e ]
  and record [ situation: s ; party: person ; fact: colour ;
               value: "red" ; given: g'' ] => [ error: e ]
```
