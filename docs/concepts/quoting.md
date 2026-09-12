# Quoting

```
concept Quoting [Item, Party, Terms]

purpose
  to hold an offer still — what is offered, at what price, on what
  terms, until when — so that a party can accept it as it stood

state
  quotes:    seq Quote
  from:      Quote -> Item
  issuedTo:  Quote -> Party
  amount:    Quote -> Money
  terms:     Quote -> Terms
  until:     Quote -> Date
  committed: Quote -> Date
  revoked:   set Quote

actions
  quote [ item: Item ; to: Party ; amount: Money ; terms: Terms ; until: Date ]
    => [ quote: Quote ; to: Party ]
    append a new quote to the sequence, issued to the party,
    recording the item, the amount, the terms and the date
    until which it may be accepted, none of which changes afterwards

  commit [ quote: Quote ; party: Party ; on: Date ]
    => [ quote: Quote ; party: Party ]
    record the quote as accepted, on the date

  commit [ quote: Quote ; party: Party ; on: Date ]
    => [ error: string ]
    if the quote was not issued to the party,
    or the date is after the one it was valid until,
    or the quote is revoked or already committed
    return the error description

  revoke [ quote: Quote ]
    => [ quote: Quote ]
    record the quote as revoked, so that it can no longer be accepted

  revoke [ quote: Quote ]
    => [ error: string ]
    if the quote is already committed
    return the error description

operational principle
  after quote [ item: i ; to: p ; amount: 61000 ; terms: t ; until: 2026-10-11 ]
    => [ quote: q ; to: p ]
  then from of q is i and amount of q is 61000, whatever happens to i afterwards
  and commit [ quote: q ; party: p ; on: 2026-10-12 ] => [ error: e ]
  and after commit [ quote: q ; party: p ; on: 2026-09-20 ] => [ quote: q ; party: p ]
  then committed of q is 2026-09-20
  and revoke [ quote: q ] => [ error: e ]
```
