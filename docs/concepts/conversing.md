# Conversing

```
concept Conversing [Party, Matter]

purpose
  to keep a record of what each party said, to whom and about what,
  in the order it was said

state
  utterances: seq Utterance
  by:         Utterance -> Party
  text:       Utterance -> string
  to:         Utterance -> Party
  about:      Utterance -> Matter

actions
  say [ party: Party ; text: string ]
    => [ utterance: Utterance ; party: Party ; text: string ]
    append an utterance to the sequence,
    attributed to the party, carrying the text

  say [ party: Party ; text: string ; to: Party ; about: Matter ]
    => [ utterance: Utterance ; party: Party ; text: string ]
    append an utterance to the sequence,
    attributed to the party, carrying the text,
    addressed to the other party and concerning the matter

operational principle
  after say [ party: p ; text: "hospital, six storeys" ]
    => [ utterance: u ; party: p ; text: "hospital, six storeys" ]
  then u is last in utterances
  and by of u is p
  and text of u is "hospital, six storeys"
  and after say [ party: q ; text: "which gives way?" ; to: p ; about: m ]
    => [ utterance: v ]
  then u precedes v in utterances
  and to of v is p and about of v is m
  and after say [ party: p ; text: "I'll ask facilities" ; to: q ; about: m ]
    => [ utterance: w ]
  then v precedes w, and both are about m
```
