# Conversing

```
concept Conversing [Party]

purpose
  to keep a record of what each party said, in the order it was said

state
  utterances: seq Utterance
  by:         Utterance -> Party
  text:       Utterance -> string

actions
  say [ party: Party ; text: string ]
    => [ utterance: Utterance ; party: Party ; text: string ]
    append an utterance to the sequence,
    attributed to the party, carrying the text

operational principle
  after say [ party: p ; text: "hospital, six storeys" ]
    => [ utterance: u ; party: p ; text: "hospital, six storeys" ]
  then u is last in utterances
  and by of u is p
  and text of u is "hospital, six storeys"
  and after say [ party: q ; text: "which region?" ] => [ utterance: v ]
  then u precedes v in utterances
```
