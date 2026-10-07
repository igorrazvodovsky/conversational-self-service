# Cataloguing

```
concept Cataloguing [Variable, Option]

purpose
  to say what may be ordered, in terms a person can recognise

state
  offers:  Variable -> set Option
  heading: Variable -> string
  family:  Variable -> string
  label:   Option -> string
  note:    Option -> string
  covers:  Option -> (above: Real, upTo: Real)

actions
  describe [ variable: Variable ; heading: string ; family: string ]
    => [ variable: Variable ]
    record what the variable is called
    and the family it is arranged under

  list [ variable: Variable ; option: Option ; label: string ]
    => [ variable: Variable ; option: Option ]
    add the option to those the variable offers
    record the words the option reads as

  list [ variable: Variable ; option: Option ; label: string ]
    => [ error: string ]
    if the variable already offers the option
    return the error description

  annotate [ option: Option ; note: string ]
    => [ option: Option ]
    record a remark about what the option means in practice

  bound [ option: Option ; above: Real ; upTo: Real ]
    => [ option: Option ]
    record the range of a quantity the option is offered for:
    more than above, and at most upTo

  bound [ option: Option ; above: Real ; upTo: Real ]
    => [ error: string ]
    if above is not less than upTo
    return the error description

  delist [ variable: Variable ; option: Option ]
    => [ variable: Variable ; option: Option ]
    remove the option from those the variable offers

operational principle
  after describe [ variable: rated_load ; heading: "Rated load" ; family: "performance" ]
    => [ variable: rated_load ]
  and list [ variable: rated_load ; option: kg1000 ; label: "1000 kg / 13 persons" ]
    => [ variable: rated_load ; option: kg1000 ]
  and annotate [ option: kg1000 ; note: "a stretcher fits" ] => [ option: kg1000 ]
  then offers of rated_load contains kg1000
  and after bound [ option: s2_6 ; above: 1 ; upTo: 6 ] => [ option: s2_6 ]
  then covers of s2_6 contains 6 and not 7
  and label of kg1000 reads "1000 kg / 13 persons"
  and after delist [ variable: rated_load ; option: kg1000 ]
    => [ variable: rated_load ; option: kg1000 ]
  then offers of rated_load does not contain kg1000
```
