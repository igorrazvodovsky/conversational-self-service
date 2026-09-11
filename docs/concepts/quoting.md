# Quoting

A domain [concept](../method/concept.md) of the elevator configurator, and the
one the case's catalogue lists as *existing* — the product has it, under this
name, with the actions `quote` and `commit` and the facts `from`, `issuedTo`,
`amount`, `terms`, `committed` — but never wrote out, because writing it needs
the product's API surface. This note writes it for the stand-in engine here, in
the same way [Constraining](constraining.md) stands in for the catalogue's
`Configuring`. See [Against the case's catalogue](../conceptual-model.md#9-against-the-cases-catalogue).

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

## Why the quote holds an item and not a reference to the specification

The design's one idea is that what a person asked for and what follows from it
are two kinds of fact. A quote is a third kind, and the most easily conflated
with the second: it looks like the current settled values with a price
attached, and a configurator that stored it that way would have a quote that
changes every time the person changes their mind. That is not a quote. An
offer is only an offer if it says the same thing tomorrow.

So `from` maps a quote to an `Item`, and the type parameter is instantiated by
[the rule that issues it](../syncs/gestures.md#a-quote-is-requested) with a
*value* — the specification's identity and the assignment as it stood, copied
out of [Constraining](constraining.md)'s `settled` at that moment. The concept
cannot see the specification move, because it holds no reference to it; it holds
what was true. Whether the working specification has since drifted from a quote
is then a [read](#three-reads), a comparison between the frozen item and the
live state, and not a fact anyone has to maintain.

This makes a quote the first thing in this build that survives a change to the
specification. [The alignment analysis](../conceptual-model.md) records *one
specification, no revisions, no comparison* as a scope decision; a quote is a
revision in the narrowest possible sense — a snapshot with a price — and it is
also what makes a comparison possible, since two quotes can be read side by
side. Neither `Revising` nor a comparison is built here; the point is that the
first artefact a person actually wants out of a configurator needed the
snapshot, and the snapshot is where it belongs.

## Why `commit` is here and not a concept of its own

The catalogue has both `Quoting.commit` and a horizon concept `Agreeing`, and
this build has the first only, on the catalogue's own reasoning. `Agreeing`
records which parties agreed to an item *that may still change* — a selection
with open conditions, owners and dates, and a `void` that fires when the item
changes underneath the agreement. A quote never changes; a new quote is a new
quote. So `void` would be an action nothing could ever invoke, and a qualified
acceptance — *yes, subject to the lead time being confirmed* — is exactly the
thing `Agreeing` exists for and this concept does not attempt.

What `commit` records is the narrow thing: the party the quote was issued to
accepted it, as it stood, in time. That is what the catalogue's product does
outside itself and what this build does on the canvas, which is a fact about
software and is [recorded as one](../conceptual-model.md#9-against-the-cases-catalogue).

## Why the amount is frozen and the footprint is not

`amount` and `terms` are copied into the quote because they are what the offer
*is*. The carbon estimate is not copied. The canvas shows a footprint for each
quote, recomputed from the frozen item by [Footprinting](footprinting.md)'s
read, because a footprint is a modelled estimate that a person may re-read
against a different grid, and a quote that froze one grid's number would present
a contested estimate as an undertaking. The line is the same one
[Pricing](pricing.md#why-the-reckoning-is-a-basis-and-not-a-constant) draws:
what somebody is being offered is a fact of the offer; what the offer is
estimated to emit is a fact of the model.

## Why validity is a date passed in

`until` is an input to `quote` and `on` is an input to `commit`. The concept
holds no clock and asks nobody the time. Whether a quote has lapsed is a
comparison a [rule](../syncs/gestures.md#a-quote-is-requested) or a
[read](#three-reads) makes with a date it supplies, so the same concept
serves a thirty-day offer, a same-day one, and a test that runs in a second.
The validity period itself — thirty days — is the issuing rule's decision and
is written there, not here.

## Why there is a `revoke`

MSM §5.1.2's asymmetry test: `quote` puts an offer on record, and without
`revoke` nothing takes one off. An offer that cannot be withdrawn before it is
accepted is a trap for whoever issued it. The inverse costs what the original
cost — one action, one date-free record — and it stops at the line an accepted
offer draws: a committed quote cannot be revoked, because at that point it is no
longer only an offer.

The catalogue's `Quoting` has no `revoke`, and this is a divergence for the
case to classify. Recorded in [§9.3](../conceptual-model.md#9-against-the-cases-catalogue)
rather than argued here, because whether the real product lets a seller withdraw
an issued quote is a fact about its API.

## Three reads

No action lists the quotes, says which are still open, or says whether the
specification has moved. Those are calculations over exposed state, in
`agent/views.py`, on the line [Pricing](pricing.md#the-total-is-a-read-and-here-is-the-arithmetic)
draws:

```
standing(q)  =  committed   if committed(q) is defined
             =  revoked     if q is in revoked
             =  lapsed      if today is after until(q)
             =  open        otherwise

differs(q)   =  { v | from(q).holds(v) ≠ settled(v) }, read against Constraining

quotable     =  every variable is settled, and nothing asserted is unmet
```

The third is what the issuing rule checks in its `where`; it is stated here
because the canvas shows its negation as the reason a quote cannot yet be
requested, and a reason that lived only in a rule would be invisible.

## Not in this concept

_A seller._ Two parties act in this build — the person and the model — and
neither is the seller. A quote is issued by a rule that reads the catalogue's
prices, so the seller is the catalogue, and `issuedTo` is always the person.
`Party` is a type parameter all the same, because a quote issued to nobody is
not a quote, and a second party is one rule away.

_The proposal document._ A quote rendered as a commercial proposal — letterhead,
addressee, the sum, basis of design, scope of supply, payment schedule,
programme, maintenance agreement, warranty, work by others, exclusions,
conditions, acceptance — is the case's `Rendering`, and here it is a surface
of its own, the second [Moding](moding.md) offers beside the canvas, in
`src/components/configurator/quotes.tsx`, with the same document
printable on its own at `src/app/quotes/[quote]/page.tsx`. It renders from
the offer alone: `Terms` is instantiated by the issuing rule with the
seller's stipulations from [Stipulating](stipulating.md), both parties'
profiles from [Profiling](profiling.md) and the job's title and site from
[Naming](naming.md), all copied at issue, so a change to any of them next
month is not a change to this quote. Only the catalogue's labels and the
footprint, an estimate, are read live. Nothing about *how* a quote is
presented is a fact of this concept, and the date it was issued is read off
the log rather than held here, since the concept holds no clock.

_Who is offering, and on what conditions._ The catalogue's `Quoting` has
`terms` as one fact and nothing behind it. Here the conditions are a standing
concept of their own, [Stipulating](stipulating.md), and the parties are
[Profiling](profiling.md); this concept sees neither, and receives what they
held as a value.

_A qualified acceptance._ See [above](#why-commit-is-here-and-not-a-concept-of-its-own).
That is `Agreeing`, which depends on `Binding` — built since 2026-09-11 — and
on conditions with owners and dates, which nothing here holds.

_What the item contains._ Since the same day the value the issuing rule
copies in carries the clauses of [Specifying](specifying.md) as they stood,
each with the option [Binding](binding.md) said answered it, beside the
settled assignment. The proposal's basis of design renders from them. This
concept sees none of it: `Item` is a type parameter, and a wider value is
the same value.

_Whether the item is buildable or priced._ `Item` and `Terms` are type
parameters and cannot be constrained. The catalogue says `quote` requires
`valid` and `priced`, and it does — in the `where` of the rule that issues one,
which is the only place that can read [Constraining](constraining.md) and
[Pricing](pricing.md) together.

## See also

- [Gestures](../syncs/gestures.md) — the three rules that reach this concept from a person
- [Conduct](../syncs/conduct.md) — the one rule that reaches it from the model, and the one that does not exist
- [Pricing](pricing.md) — where the amount and terms are read from
- [Constraining](constraining.md) — where the item is read from
- The case's catalogue: `~/Library/CloudStorage/Dropbox/discovery/Projects/Conversational self-service/Ontology/Concept catalogue/Quoting.md` and `Agreeing.md`
