# Reading

```
concept Reading [Source, Value]

purpose
  to hold what a source was read as, so that the reading can be
  checked against the source and corrected

state
  heard:  Source -> seq Item
  words:  Item -> string
  answer: Item -> set Value

actions
  read [ source: Source ; words: string ; answer: set Value ; item: Item ]
    => [ item: Item ; source: Source ; words: string ; answer: set Value ]
    append the item to those heard from the source, carrying the words
    it was read from and the values the reader took to answer them,
    which may be none

  read [ source: Source ; words: string ; answer: set Value ; item: Item ]
    => [ error: string ]
    if the words are empty, or the item was heard already
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
  and read [ source: [ file: f ] ; words: "" ; answer: {} ; item: k ] => [ error: e ]
  and read [ source: [ file: f ] ; words: "1.6 m/s" ; answer: {} ; item: i ] => [ error: e ]
```
