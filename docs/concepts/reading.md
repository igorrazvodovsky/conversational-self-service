# Reading

```
concept Reading [Source, Value, Quantity]

purpose
  to hold what a source was read as, so that the reading can be
  checked against the source and corrected

state
  heard:  Source -> seq Item
  words:  Item -> string
  answer: Item -> set Value
  states: Item -> Quantity -> Real

actions
  read [ source: Source ; words: string ; answer: set Value ;
         states: Quantity -> Real ; item: Item ]
    => [ item: Item ; source: Source ; words: string ; answer: set Value ;
         states: Quantity -> Real ]
    append the item to those heard from the source, carrying the words
    it was read from, the values the reader took to answer them,
    and the quantities the reader took them to state, either of which
    may be none

  read [ source: Source ; words: string ; answer: set Value ;
         states: Quantity -> Real ; item: Item ]
    => [ error: string ]
    if the words are empty, or the item was heard already,
    or a quantity stated is not a finite number
    return the error description

operational principle
  after read [ source: [ file: f ] ; words: "a bed must fit, with a porter" ;
               answer: { kg1250 } ; item: i ]
    => [ item: i ; source: [ file: f ] ;
         words: "a bed must fit, with a porter" ; answer: { kg1250 } ]
  then i is last in heard of [ file: f ]
  and words of i is "a bed must fit, with a porter"
  and answer of i is { kg1250 }
  and after read [ source: [ file: f ] ;
                   words: "the contractor attends a site meeting monthly" ;
                   answer: {} ; item: j ]
    => [ item: j ; source: [ file: f ] ;
         words: "the contractor attends a site meeting monthly" ; answer: {} ]
  then heard of [ file: f ] is [i, j]
  and answer of j is empty
  and after read [ source: [ file: f ] ; words: "ground plus five upper floors" ;
                   answer: {} ; states: { upper_floors: 5 } ; item: m ]
    => [ item: m ; source: [ file: f ] ;
         words: "ground plus five upper floors" ; answer: {} ;
         states: { upper_floors: 5 } ]
  then states of m is { upper_floors: 5 }
  and read [ source: [ file: f ] ; words: "" ; answer: {} ; item: k ] => [ error: e ]
  and read [ source: [ file: f ] ; words: "1.6 m/s" ; answer: {} ; item: i ] => [ error: e ]
```
