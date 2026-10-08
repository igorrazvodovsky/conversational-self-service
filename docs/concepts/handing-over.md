# Handing over

```
concept HandingOver [Item, Party]

purpose
  to put an item into another party's hands, with what it is handed
  over for, so that they can take it up from where it was left

state
  handovers: seq Handover
  of:        Handover -> Item
  from:      Handover -> Party
  to:        Handover -> Party
  reason:    Handover -> string
  received:  Handover -> Date

actions
  send [ item: Item ; from: Party ; to: Party ; reason: string ]
    => [ handover: Handover ; to: Party ]
    append a handover to the sequence, recording the item, the party
    it comes from, the party it goes to and the reason in the sender's
    words, none of which changes afterwards

  send [ item: Item ; from: Party ; to: Party ; reason: string ]
    => [ error: string ]
    if the two parties are the same
    return the error description

  receive [ handover: Handover ; party: Party ; on: Date ]
    => [ handover: Handover ; party: Party ]
    record that the party the handover went to took it up, on the date

  receive [ handover: Handover ; party: Party ; on: Date ]
    => [ error: string ]
    if the handover did not go to the party,
    or it is already received
    return the error description

operational principle
  after send [ item: s ; from: p ; to: q ;
               reason: "the published terms allow ninety days and the tender asks for six months" ]
    => [ handover: h ; to: q ]
  then h is last in handovers
  and of h is s, from of h is p, to of h is q
  and received of h is nothing
  and receive [ handover: h ; party: p ; on: 2026-10-09 ] => [ error: e ]
  and after receive [ handover: h ; party: q ; on: 2026-10-09 ]
    => [ handover: h ; party: q ]
  then received of h is 2026-10-09
  and receive [ handover: h ; party: q ; on: 2026-10-10 ] => [ error: e ]
  and send [ item: s ; from: p ; to: p ; reason: "…" ] => [ error: e ]
```
